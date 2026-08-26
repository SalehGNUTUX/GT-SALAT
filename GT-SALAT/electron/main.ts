import { setAudioStateListener } from './audio.js';
import { app, BrowserWindow, nativeImage, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpc } from './ipc.js';
import { createTray, destroyTray } from './tray.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { getSettings, setSettings, importLegacySettings } from './settings.js';
import { autoDetectLocation, prefetchUpcomingMonths, suggestMethodByCountry } from './prayer.js';
import { refreshHookScriptIfEnabled } from './shell-hook.js';
import { azkarFilePath } from './dhikr.js';
import { checkForUpdate } from './updates.js';
import { notify, setNavHandler } from './notifier.js';
import { registerQuranScheme, serveQuranScheme } from './downloads.js';

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

// منع تشغيل أكثر من نسخة
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ★ يجب أن يسبق `whenReady` — تسجيل نظامٍ مميّزٍ للبروتوكول لا يُقبَل بعدها.
registerQuranScheme();

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

/**
 * تبديل حالة النافذة من أيقونة شريط المهام: ظاهرةٌ ← تُخفى، مخفيّةٌ ← تظهر.
 *
 * لا نشترط أن تكون النافذة في المقدّمة قبل الإخفاء: النقر على أيقونة الشريط لا ينقل
 * التركيز إليها في أغلب أسطح المكتب، فاشتراط `isFocused()` كان سيجعل الإخفاء متعذّراً.
 */
function toggleMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.focus();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }
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

  // CSP: صارمة في الإنتاج، مرنة في التطوير (Vite تحتاج unsafe-inline/unsafe-eval).
  //
  // توسيعان مقصوران على الوسائط وحدها — السكربتات و`connect-src` تبقى محصورةً في 'self'
  // وقائمة الخدمات المعروفة، فلا يُفتَح باب تنفيذ شيفرةٍ خارجية:
  //   `media-src` : الإذاعات وتلاوة القرآن (بثٌّ عبر <audio> من خوادم خارجية).
  //   `img-src`   : صفحات المصحف المصوَّر (صورٌ من مستودعَي Quran-PNG وQuranHub).
  // `gtsalat:` بروتوكولنا المخصّص بمضيفَين: `local` لما نزّله المستخدم (المصحف وصوت القرآن)
  // و`res` للموارد المحزَّمة (صور الدروس المصوَّرة وأصوات الأذكار والرقية المُضمَّنة).
  const MEDIA = "media-src 'self' file: data: gtsalat: https: http:";
  const IMG = "img-src 'self' data: gtsalat: https:";
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? `default-src 'self' 'unsafe-inline' 'unsafe-eval' ws:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; ${IMG}; ${MEDIA}; connect-src 'self' ws: wss: https://api.aladhan.com https://ipapi.co https://ip-api.com`
      : `default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; ${IMG}; ${MEDIA}; connect-src 'self' https://api.aladhan.com https://ipapi.co https://ip-api.com`;
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

  // النقر على أي إشعارٍ يحمل وجهةً: يُظهر النافذة وينتقل إليها.
  setNavHandler((route) => {
    showMainWindow();
    mainWindow?.webContents.send('nav:go', route);
  });

  // حالة الصوت الجاري تُبَثّ للواجهة كي يظهر زرّ الإيقاف ويختفي من تلقائه.
  setAudioStateListener((kind) => {
    mainWindow?.webContents.send('audio:state', kind);
  });

  serveQuranScheme();
  registerIpc(() => mainWindow);
  createMainWindow();
  createTray(showMainWindow, toggleMainWindow);
  startScheduler();

  // تحديث سكربت الطرفية عند بدء التشغيل إذا كان التكامل مفعّلاً
  const s2 = getSettings();
  refreshHookScriptIfEnabled(azkarFilePath(), s2);

  // prefetch الأشهر القادمة في الخلفية
  prefetchUpcomingMonths().catch(() => {});

  // تحديثُ الموقع تلقائياً لمن يكثر تنقّله: عند الإقلاع ثمّ كلّ ستّ ساعات.
  if (s2.autoUpdateLocation) {
    void refreshLocationIfMoved();
    setInterval(() => { void refreshLocationIfMoved(); }, 6 * 60 * 60 * 1000);
  }

  // فحص توفّر نسخةٍ جديدة بعد استقرار الإقلاع (لا نزاحم تحميل الواجهة).
  if (s2.checkUpdates) {
    setTimeout(async () => {
      const info = await checkForUpdate();
      const cur = getSettings();
      // لا نُزعج المستخدم بنسخةٍ سبق أن أخفى شريطها.
      if (!info.available || cur.dismissedUpdateVersion === info.latest) return;
      mainWindow?.webContents.send('update:available', info);
      notify({
        type: 'system',
        title: `⬆️ توفّرت نسخة GT-SALAT ${info.latest}`,
        body: `أنت على النسخة ${info.current}. افتح التطبيق للانتقال إلى صفحة التنزيل.`,
      });
    }, 12_000);
  }
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

/**
 * يُعيد كشف الموقع ويحفظه **إن تغيّر فعلاً** — المقارنة بمنزلتين عشريّتين (نفس دقّة مفتاح
 * الموقع في الكاش) فلا تُبطَل مواقيت الشهر المخزَّنة لفارقِ أمتارٍ يعيده مزوّد الإنترنت.
 * صامتٌ عند الفشل: لا إنترنت يعني إبقاء الموقع الحاليّ لا إفراغه.
 */
async function refreshLocationIfMoved(): Promise<void> {
  const cur = getSettings();
  if (!cur.autoUpdateLocation) return;
  const loc = await autoDetectLocation().catch(() => null);
  if (!loc) return;

  const same =
    cur.lat != null && cur.lon != null &&
    cur.lat.toFixed(2) === loc.lat.toFixed(2) &&
    cur.lon.toFixed(2) === loc.lon.toFixed(2);
  if (same) return;

  const methodId = suggestMethodByCountry(loc.country);
  setSettings({ lat: loc.lat, lon: loc.lon, city: loc.city, country: loc.country, methodId });
  mainWindow?.webContents.send('settings:changed', getSettings());
  notify({
    type: 'system',
    title: '📍 تغيّر موقعك',
    body: `حُدِّثت المواقيت إلى ${loc.city}${loc.country ? ` — ${loc.country}` : ''}.`,
    route: 'dashboard',
  });
  prefetchUpcomingMonths().catch(() => {});
}
