import { ipcMain, app, BrowserWindow, shell, dialog } from 'electron';
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
  CALCULATION_METHODS,
} from './prayer.js';
import {
  loadAllAzkar,
  getRandomDhikr,
  getDhikrByIndex,
  getAzkarCount,
  azkarFilePath,
} from './dhikr.js';
import * as audio from './audio.js';
import { notify, getLog, clearLog } from './notifier.js';
import {
  applyShellIntegration,
  removeAllShellIntegration,
  detectInstalledShells,
} from './shell-hook.js';
import { setAutoStart, isAutoStartEnabled } from './autostart.js';
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

  // ── Dhikr ───────────────────────────────────────────────
  ipcMain.handle('dhikr:random', () => getRandomDhikr());
  ipcMain.handle('dhikr:all', () => loadAllAzkar());
  ipcMain.handle('dhikr:by-index', (_e, i: number) => getDhikrByIndex(i));
  ipcMain.handle('dhikr:count', () => getAzkarCount());

  // ── Audio ───────────────────────────────────────────────
  ipcMain.handle('audio:play', (_e, kind: audio.AdhanAudioKind) => audio.play(kind));
  ipcMain.handle('audio:play-file', (_e, filePath: string) => audio.playFile(filePath));
  ipcMain.handle('audio:stop', () => audio.stop());
  ipcMain.handle('audio:playing', () => audio.isPlaying());

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
    refreshTray(() => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
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

  // ── App ─────────────────────────────────────────────────
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:quit', () => app.quit());
  ipcMain.handle('app:open-url', (_e, url: string) => shell.openExternal(url));
  ipcMain.handle('app:open-path', (_e, p: string) => shell.openPath(p));
  ipcMain.handle('app:user-data-dir', () => app.getPath('userData'));
}
