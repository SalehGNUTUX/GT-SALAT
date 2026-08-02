import { ipcMain, app, BrowserWindow, shell, dialog, clipboard } from 'electron';
import path from 'node:path';
import {
  getSettings,
  setSettings,
  resetSettings,
  getStorePath,
  importLegacySettings,
} from './settings.js';
import {
  getTodayTimetable,
  getMonthTimetable,
  getNextPrayer,
  autoDetectLocation,
  prefetchUpcomingMonths,
  countCachedMonths,
  pruneTimetableCache,
  CALCULATION_METHODS,
} from './prayer.js';
import {
  loadAllAzkar,
  getRandomDhikr,
  getDhikrByIndex,
  getAzkarCount,
  azkarFilePath,
} from './dhikr.js';
import * as content from './content.js';
import { CREDIT_SOURCES, DEVELOPER, GITHUB, PHONE_REPO, PROJECTS, REPO } from './credits.js';
import * as audio from './audio.js';
import { notify, getLog, clearLog } from './notifier.js';
import {
  applyShellIntegration,
  removeAllShellIntegration,
  detectInstalledShells,
  checkShellIntegration,
} from './shell-hook.js';
import { setAutoStart, isAutoStartEnabled } from './autostart.js';
import { checkForUpdate, lastUpdateInfo, RELEASES_URL } from './updates.js';
import { backupSizes, exportBackup, importBackup, inspectBackup, type BackupOptions } from './backup.js';
import { startScheduler, stopScheduler, restartSchedulerIfRunning } from './scheduler.js';
import { refreshTray } from './tray.js';

export function registerIpc(getMainWindow: () => BrowserWindow | null) {
  // ── Settings ────────────────────────────────────────────
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_e, patch) => {
    const merged = setSettings(patch);
    const win = getMainWindow();
    win?.webContents.send('settings:changed', merged);
    restartSchedulerIfRunning();
    return merged;
  });
  ipcMain.handle('settings:reset', () => resetSettings());
  ipcMain.handle('settings:path', () => getStorePath());
  ipcMain.handle('settings:import-legacy', () => importLegacySettings());

  // ── Prayer ──────────────────────────────────────────────
  ipcMain.handle('prayer:today', () => getTodayTimetable());
  ipcMain.handle('prayer:month', (_e, year: number, month: number) => getMonthTimetable(year, month));
  ipcMain.handle('prayer:next', () => getNextPrayer());
  ipcMain.handle('prayer:auto-detect', () => autoDetectLocation());
  ipcMain.handle('prayer:prefetch', () => prefetchUpcomingMonths());
  ipcMain.handle('prayer:methods', () => CALCULATION_METHODS);
  ipcMain.handle('prayer:cached-months', () => countCachedMonths());
  ipcMain.handle('prayer:prune-cache', () => pruneTimetableCache());

  // ── Dhikr ───────────────────────────────────────────────
  ipcMain.handle('dhikr:random', () => getRandomDhikr());
  ipcMain.handle('dhikr:all', () => loadAllAzkar());
  ipcMain.handle('dhikr:by-index', (_e, i: number) => getDhikrByIndex(i));
  ipcMain.handle('dhikr:count', () => getAzkarCount());

  // ── Content (المحتوى الإسلامي) ──────────────────────────
  // الفهارس خفيفة؛ المحتوى الثقيل (سورة/باب) يُطلَب واحداً واحداً لا دفعةً واحدة.
  ipcMain.handle('content:asma', () => content.getAsma());
  ipcMain.handle('content:hadith', () => content.getHadithCollections());
  ipcMain.handle('content:duas', () => content.getDuas());
  ipcMain.handle('content:hikam', () => content.getHikamCategories());
  ipcMain.handle('content:hikmah', (_e, seed: number) => content.getHikmah(seed));
  ipcMain.handle('content:hisn-index', () => content.getHisnIndex());
  ipcMain.handle('content:hisn-category', (_e, id: number) => content.getHisnCategory(id));
  ipcMain.handle('content:hisn-search', (_e, q: string) => content.searchHisn(q));
  ipcMain.handle('content:tafsir-index', () => content.getTafsirIndex());
  ipcMain.handle('content:tafsir-surah', (_e, n: number) => content.getTafsirSurah(n));
  ipcMain.handle('content:quran-meta', () => content.getQuranMeta());
  ipcMain.handle('content:quran-search', (_e, q: string) => content.searchAyat(q));
  ipcMain.handle('content:ayah', (_e, surah: number, ayah: number) => content.getAyah(surah, ayah));
  ipcMain.handle('content:daily-ayah', (_e, seed: number) => content.getDailyAyah(seed));
  ipcMain.handle('content:events', () => content.getEvents());
  ipcMain.handle('content:events-today', (_e, hMonth: number, hDay: number) =>
    content.getEventsToday(hMonth, hDay),
  );
  ipcMain.handle('content:radios', () => content.getRadios());
  ipcMain.handle('content:session-adhkar', (_e, type: 'morning' | 'evening') =>
    content.getSessionAdhkar(type),
  );
  ipcMain.handle('content:credits', () => ({
    sources: CREDIT_SOURCES,
    developer: DEVELOPER,
    github: GITHUB,
    repo: REPO,
    phoneRepo: PHONE_REPO,
    projects: PROJECTS,
  }));

  // ── Audio ───────────────────────────────────────────────
  ipcMain.handle('audio:play', (_e, kind: audio.AdhanAudioKind) => audio.play(kind));
  ipcMain.handle('audio:play-file', (_e, filePath: string) => audio.playFile(filePath));
  ipcMain.handle('audio:stop', () => audio.stop());
  ipcMain.handle('audio:playing', () => audio.isPlaying());
  ipcMain.handle('audio:playing-kind', () => audio.playingKind());
  ipcMain.handle('audio:preview', (_e, kind: audio.AdhanAudioKind | 'custom', customPath?: string) =>
    audio.togglePreview(kind, customPath),
  );
  ipcMain.handle('audio:players', () => audio.detectedPlayers());

  // ── Notifications ───────────────────────────────────────
  ipcMain.handle('notify:test', () =>
    notify({
      type: 'system',
      title: '🔔 اختبار إشعار',
      body: 'GT-SALAT يعمل بشكل جيد ✓',
    }),
  );
  ipcMain.handle('notify:test-adhan', () => {
    notify({ type: 'salat', title: '🕌 اختبار صلاة', body: 'حان وقت الاختبار' });
    audio.play('full');
    return true;
  });
  ipcMain.handle('notify:test-adhan-short', () => {
    notify({ type: 'salat', title: '🕌 اختبار صلاة', body: 'أذان قصير' });
    audio.play('short');
    return true;
  });
  ipcMain.handle('notify:test-approaching', () => {
    notify({ type: 'approaching', title: '⏰ اختبار اقتراب', body: 'تبقى 15 دقيقة' });
    audio.play('approaching');
    return true;
  });
  ipcMain.handle('notify:log', () => getLog());
  ipcMain.handle('notify:clear-log', () => {
    clearLog();
    return true;
  });

  // ── Shell integration ───────────────────────────────────
  ipcMain.handle('shell:check', () => checkShellIntegration());
  ipcMain.handle('shell:apply', (_e, opts: { enabledShells: any[]; showZikr: boolean; showSalat: boolean }) => {
    return applyShellIntegration({
      ...opts,
      azkarPath: azkarFilePath(),
      settingsPath: getStorePath(),
    });
  });
  ipcMain.handle('shell:remove', () => {
    removeAllShellIntegration();
    return true;
  });
  ipcMain.handle('shell:detect', () => detectInstalledShells());

  // ── Autostart ───────────────────────────────────────────
  ipcMain.handle('autostart:get', () => isAutoStartEnabled());
  ipcMain.handle('autostart:set', (_e, enabled: boolean) => setAutoStart(enabled));

  // ── Scheduler ───────────────────────────────────────────
  ipcMain.handle('scheduler:start', () => {
    startScheduler();
    return true;
  });
  ipcMain.handle('scheduler:stop', () => {
    stopScheduler();
    return true;
  });

  // ── Tray ────────────────────────────────────────────────
  ipcMain.handle('tray:refresh', () => {
    const win = getMainWindow();
    const show = () => {
      if (!win) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    };
    const toggle = () => {
      if (!win) return;
      if (win.isMinimized()) { win.restore(); win.focus(); return; }
      if (win.isVisible()) { win.hide(); return; }
      show();
    };
    refreshTray(show, toggle);
    return true;
  });

  // ── Dialog ──────────────────────────────────────────────
  ipcMain.handle('dialog:open-audio', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win ?? undefined as any, {
      title: 'اختر ملف الأذان المخصص',
      filters: [{ name: 'ملفات الصوت', extensions: ['ogg', 'mp3', 'wav', 'flac'] }],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  // ── Backup (متوافق مع نسخة الهاتف) ──────────────────────
  ipcMain.handle('backup:sizes', () => backupSizes());
  ipcMain.handle('backup:export', async (_e, opts: BackupOptions) => {
    const win = getMainWindow();
    const res = await dialog.showSaveDialog(win ?? (undefined as any), {
      title: 'تصدير نسخة احتياطية',
      defaultPath: 'GT-SALAT-backup.zip',
      filters: [{ name: 'حزمة نسخٍ احتياطي', extensions: ['zip'] }],
    });
    if (res.canceled || !res.filePath) return null;
    return exportBackup(res.filePath, opts);
  });
  ipcMain.handle('backup:pick', async () => {
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win ?? (undefined as any), {
      title: 'اختر حزمة النسخ الاحتياطي',
      filters: [{ name: 'حزمة نسخٍ احتياطي', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    return { path: res.filePaths[0], contents: inspectBackup(res.filePaths[0]) };
  });
  ipcMain.handle('backup:import', (_e, filePath: string, opts: BackupOptions) => {
    const result = importBackup(filePath, opts);
    if (result.settings) {
      // الإعدادات تغيّرت من خارج الواجهة — نُعلمها ونُعيد تسليح المجدول.
      getMainWindow()?.webContents.send('settings:changed', getSettings());
      restartSchedulerIfRunning();
    }
    return result;
  });

  // ── Updates ─────────────────────────────────────────────
  ipcMain.handle('update:check', () => checkForUpdate());
  ipcMain.handle('update:last', () => lastUpdateInfo());
  ipcMain.handle('update:open-page', () => shell.openExternal(lastUpdateInfo()?.url || RELEASES_URL));

  // ── App ─────────────────────────────────────────────────
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:quit', () => app.quit());
  ipcMain.handle('app:open-url', (_e, url: string) => shell.openExternal(url));
  ipcMain.handle('app:open-path', (_e, p: string) => shell.openPath(p));
  ipcMain.handle('app:user-data-dir', () => app.getPath('userData'));
  // النسخ عبر حافظة Electron لا عبر واجهة الويب — تعمل في كل الحالات بلا اشتراط سياقٍ آمن.
  ipcMain.handle('app:copy', (_e, text: string) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });
}
