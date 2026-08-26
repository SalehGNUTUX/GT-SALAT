import { BrowserWindow, screen } from 'electron';
import * as audio from './audio.js';
import { getSettings } from './settings.js';

/**
 * نافذةُ أذانٍ بملء الشاشة فوق كلّ النوافذ — نظيرُ `AdhanAlarmActivity` في نسخة الهاتف.
 *
 * لِمَ نافذةٌ لا إشعارٌ فقط: إشعارُ النظام يمرّ صامتاً على الشاشة المزدحمة، وقد يُخفيه
 * وضعُ «عدم الإزعاج» في بيئة سطح المكتب. النافذة تُرى ولو كان المستخدم في ملء شاشةٍ آخر.
 *
 * **بلا preload ولا تكامل Node**: زرّ الإيقاف يستدعي `window.close()` وحده — وهو قياسيّ
 * يعمل بلا جسر — والعمليةُ الرئيسية تُوقف الصوت في معالج `closed`. فلا نضيف مدخل بناءٍ
 * ثانياً لصفحةٍ واحدةٍ ولا نفتح جسراً جديداً لنافذةٍ لا تحتاجه.
 *
 * تُغلَق وحدها عند انتهاء الصوت إلّا أن يُطلَب إبقاؤها (`keepAdhanWindow`)، وفي الحالتين
 * لها **سقفٌ زمنيّ** فلا تبقى نافذةٌ عالقةٌ فوق الشاشة إن تعطّل مشغّلُ الصوت.
 */

let win: BrowserWindow | null = null;
let hardTimer: NodeJS.Timeout | null = null;

/** سقفٌ زمنيٌّ للنافذة مهما جرى — أطولُ أذانٍ دون خمس دقائق بكثير. */
const HARD_LIMIT_MS = 5 * 60_000;

function html(title: string, subtitle: string, icon: string): string {
  // كلّ الأنماط سطريّة: النافذة تُحمَّل من `data:` فلا مورد خارجيّ ولا CSP تمنعها.
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  background:linear-gradient(160deg,#07211f,#0d3b34 55%,#07211f);color:#e8f5f2;
  font-family:'Ubuntu Arabic','Noto Naskh Arabic',sans-serif;user-select:none;overflow:hidden">
  <div style="font-size:96px;line-height:1;animation:p 2.4s ease-in-out infinite">${icon}</div>
  <div style="font-size:44px;font-weight:700;color:#f5c518">${title}</div>
  <div style="font-size:20px;opacity:.85">${subtitle}</div>
  <button onclick="window.close()" style="margin-top:14px;padding:14px 34px;font-size:18px;font-family:inherit;
    background:rgba(245,197,24,.12);color:#f5c518;border:1px solid #f5c518;border-radius:12px;cursor:pointer">
    ⏹ إيقاف وإغلاق
  </button>
  <div style="font-size:12px;opacity:.5">GT-SALAT — اضغط Esc أو الزرّ للإغلاق</div>
  <style>@keyframes p{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}</style>
  <script>document.addEventListener('keydown',function(e){if(e.key==='Escape')window.close();});</script>
</body></html>`;
}

/** يفتح النافذة (ويستبدل سابقتها إن وُجدت). لا تفعل شيئاً إن أُطفئ الخيار. */
export function showAdhanWindow(title: string, subtitle: string, icon = '🕌'): void {
  const s = getSettings();
  if (!s.fullscreenAdhan) return;

  closeAdhanWindow();

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    frame: false,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  void win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html(title, subtitle, icon)));
  win.once('ready-to-show', () => win?.show());

  // الإغلاق — بالزرّ أو بـEsc أو تلقائياً — يوقف الصوت الجاري. مصدرٌ واحدٌ لكلّ الطرق.
  win.on('closed', () => {
    win = null;
    if (hardTimer) clearTimeout(hardTimer);
    hardTimer = null;
    audio.stop();
  });

  hardTimer = setTimeout(() => closeAdhanWindow(), HARD_LIMIT_MS);
}

export function closeAdhanWindow(): void {
  if (hardTimer) clearTimeout(hardTimer);
  hardTimer = null;
  if (win && !win.isDestroyed()) win.destroy();
  win = null;
}

/**
 * تُستدعى عند انتهاء الصوت: تُغلق النافذة إلّا أن يكون المستخدم طلب إبقاءها ليغلقها بنفسه.
 * (نفس خيار «إبقاء نافذة الأذان» في الهاتف — ومن غير إبقاءٍ لا تبقى شاشةٌ مضاءةٌ بلا داعٍ.)
 */
export function closeAdhanWindowIfNotKept(): void {
  if (getSettings().keepAdhanWindow) return;
  closeAdhanWindow();
}
