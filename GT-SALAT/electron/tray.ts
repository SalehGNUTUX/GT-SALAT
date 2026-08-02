import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'node:path';
import { getNextPrayer } from './prayer.js';
import { getRandomDhikr } from './dhikr.js';
import { getSettings, setSettings } from './settings.js';
import * as audio from './audio.js';
import { notify } from './notifier.js';

let tray: Tray | null = null;
let updateTimer: NodeJS.Timeout | null = null;

function trayIconPath(): string {
  const file = 'prayer-icon-64.png';
  if (app.isPackaged) return path.join(process.resourcesPath, 'icons', file);
  return path.join(app.getAppPath(), 'resources', 'icons', file);
}

/**
 * أيقونة شريط المهام.
 *
 * النقر على الأيقونة **يبدّل** حالة النافذة (يفتحها إن كانت مخفيّة، ويخفيها إن كانت ظاهرة).
 * وبما أنّ بعض أسطح المكتب على لينكس لا تُمرّر حدث النقر إلى التطبيق أصلاً (تكتفي بفتح
 * قائمة السياق)، فالقائمة تحوي عنصر «إظهار/إخفاء الواجهة» بنفس الوظيفة ضماناً.
 */
export function createTray(showMainWindow: () => void, toggleMainWindow: () => void): Tray {
  const img = nativeImage.createFromPath(trayIconPath());
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 22, height: 22 }));
  tray.setToolTip('GT-SALAT');
  tray.on('click', toggleMainWindow);
  tray.on('double-click', toggleMainWindow);

  refreshMenu(showMainWindow, toggleMainWindow);
  updateTooltip();

  updateTimer = setInterval(() => {
    refreshMenu(showMainWindow, toggleMainWindow);
    updateTooltip();
  }, 30_000);

  return tray;
}

async function updateTooltip(): Promise<void> {
  if (!tray) return;
  try {
    const next = await getNextPrayer();
    if (!next) {
      tray.setToolTip('GT-SALAT\nأكمل الإعدادات لعرض المواقيت');
      return;
    }
    tray.setToolTip(
      `GT-SALAT\n🕌 ${next.prayer.name} • ${next.prayer.time}\n⏳ ${next.remainingText}`,
    );
  } catch {
    tray.setToolTip('GT-SALAT');
  }
}

async function refreshMenu(showMainWindow: () => void, toggleMainWindow: () => void): Promise<void> {
  if (!tray) return;
  const s = getSettings();
  let nextLabel = 'الصلاة القادمة: —';
  try {
    const next = await getNextPrayer();
    if (next) nextLabel = `🕌 ${next.prayer.name} عند ${next.prayer.time}  (${next.remainingText})`;
  } catch {}

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'GT-SALAT', enabled: false },
    { type: 'separator' },
    { label: nextLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'إظهار/إخفاء الواجهة',
      click: toggleMainWindow,
    },
    {
      label: 'عرض ذكر الآن',
      click: () => {
        const d = getRandomDhikr();
        if (d) {
          notify({ type: 'zikr', title: '🕊️ ذكر', body: d.text, route: 'dhikr' });
        }
      },
    },
    {
      label: 'اختبار إشعار الصلاة',
      click: () => {
        notify({ type: 'salat', title: '🕌 اختبار', body: 'هذا إشعار اختباري لصلاة وهمية' });
      },
    },
    { type: 'separator' },
    {
      label: s.doNotDisturb ? '✓ وضع عدم الإزعاج' : 'وضع عدم الإزعاج',
      type: 'checkbox',
      checked: s.doNotDisturb,
      click: () => {
        setSettings({ doNotDisturb: !s.doNotDisturb });
        refreshMenu(showMainWindow, toggleMainWindow);
      },
    },
    {
      label: 'إشعارات الصلاة',
      type: 'checkbox',
      checked: s.enableSalatNotify,
      click: () => {
        setSettings({ enableSalatNotify: !s.enableSalatNotify });
        refreshMenu(showMainWindow, toggleMainWindow);
      },
    },
    {
      label: 'إشعارات الأذكار',
      type: 'checkbox',
      checked: s.enableZikrNotify,
      click: () => {
        setSettings({ enableZikrNotify: !s.enableZikrNotify });
        refreshMenu(showMainWindow, toggleMainWindow);
      },
    },
    { type: 'separator' },
    {
      label: 'إيقاف الأذان الحالي',
      enabled: audio.isPlaying(),
      click: () => audio.stop(),
    },
    { type: 'separator' },
    {
      label: 'إغلاق GT-SALAT',
      click: () => {
        app.quit();
      },
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

export function destroyTray(): void {
  if (updateTimer) clearInterval(updateTimer);
  if (tray) tray.destroy();
  tray = null;
  updateTimer = null;
}

export function refreshTray(showMainWindow: () => void, toggleMainWindow: () => void): void {
  refreshMenu(showMainWindow, toggleMainWindow);
  updateTooltip();
}
