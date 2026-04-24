import { app, BrowserWindow, nativeImage, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpc } from './ipc.js';
import { createTray, destroyTray } from './tray.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { getSettings, importLegacySettings } from './settings.js';
import { prefetchUpcomingMonths } from './prayer.js';
import { refreshHookScriptIfEnabled } from './shell-hook.js';
import { azkarFilePath } from './dhikr.js';

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

// منع تشغيل أكثر من نسخة
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;

function appIconPath(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'icons', 'prayer-icon-256.png');
  return path.join(app.getAppPath(), 'resources', 'icons', 'prayer-icon-256.png');
}

function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createMainWindow(): void {
  const s = getSettings();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1117',
    show: false,
    icon: nativeImage.createFromPath(appIconPath()),
    title: 'GT-SALAT',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname_, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;

  // CSP: صارمة في الإنتاج، مرنة في التطوير (Vite تحتاج unsafe-inline/unsafe-eval)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; media-src 'self' file:; connect-src 'self' ws: wss: https://api.aladhan.com https://ipapi.co https://ip-api.com"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; media-src 'self' file:; connect-src 'self' https://api.aladhan.com https://ipapi.co https://ip-api.com";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  const startHidden = process.argv.includes('--hidden') || s.startMinimized;
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) mainWindow!.show();
  });

  mainWindow.on('close', (e) => {
    const st = getSettings();
    if (st.minimizeToTray && !(app as any).isQuitting) {
      e.preventDefault();
      mainWindow!.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  showMainWindow();
});

app.whenReady().then(async () => {
  // استيراد إعدادات من النسخة القديمة عند أول تشغيل
  const s = getSettings();
  if (!s.setupCompleted && !s.city) {
    importLegacySettings();
  }

  registerIpc(() => mainWindow);
  createMainWindow();
  createTray(showMainWindow);
  startScheduler();

  // تحديث سكربت الطرفية عند بدء التشغيل إذا كان التكامل مفعّلاً
  const s2 = getSettings();
  refreshHookScriptIfEnabled(azkarFilePath(), s2);

  // prefetch الأشهر القادمة في الخلفية
  prefetchUpcomingMonths().catch(() => {});
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  stopScheduler();
  destroyTray();
});

app.on('window-all-closed', (e: any) => {
  const st = getSettings();
  if (st.minimizeToTray && !(app as any).isQuitting) {
    e.preventDefault?.();
    return;
  }
  if (process.platform !== 'darwin') app.quit();
});
