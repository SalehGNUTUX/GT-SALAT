import { BrowserWindow, screen } from 'electron';
import * as audio from './audio.js';
import { getSettings } from './settings.js';
import { adhanBackdropUrl } from './backgrounds.js';

/**
 * نافذةُ أذانٍ بملء الشاشة فوق كلّ النوافذ — نظيرُ `AdhanAlarmActivity` في نسخة الهاتف.
 *
 * لِمَ نافذةٌ لا إشعارٌ فقط: إشعارُ النظام يمرّ صامتاً على الشاشة المزدحمة، وقد يُخفيه
 * وضعُ «عدم الإزعاج» في بيئة سطح المكتب. النافذة تُرى ولو كان المستخدم في ملء شاشةٍ آخر.
 *
 * **بلا preload ولا تكامل Node ولا سكربت**: زرّ الإيقاف رابطٌ تلتقط العمليّةُ الرئيسيّة التنقّلَ إليه
 * (`will-navigate`) فتُغلق النافذة، وEsc يُلتقَط بـ`before-input-event`؛ والإغلاق يوقف الصوت في معالج
 * `closed`. فلا جسر جديد لنافذةٍ لا تحتاجه.
 *
 * تُغلَق وحدها عند انتهاء الصوت إلّا أن يُطلَب إبقاؤها (`keepAdhanWindow`)، وفي الحالتين
 * لها **سقفٌ زمنيّ** فلا تبقى نافذةٌ عالقةٌ فوق الشاشة إن تعطّل مشغّلُ الصوت.
 */

let win: BrowserWindow | null = null;
let hardTimer: NodeJS.Timeout | null = null;

/** سقفٌ زمنيٌّ للنافذة مهما جرى — أطولُ أذانٍ دون خمس دقائق بكثير. */
const HARD_LIMIT_MS = 5 * 60_000;

function html(title: string, subtitle: string, icon: string, backdrop: string | null, dark: boolean): string {
  // خلفيّة التطبيق المختارة تحت غشاوةٍ تحفظ وضوح النصّ، وإلّا التدرّج الأخضر.
  const bg = backdrop
    ? `linear-gradient(rgba(5,12,14,${dark ? 0.55 : 0.45}),rgba(5,12,14,${dark ? 0.7 : 0.6})),url(${backdrop}) center/cover no-repeat`
    : 'linear-gradient(160deg,#07211f,#0d3b34 55%,#07211f)';
  // كلّ الأنماط سطريّة: النافذة تُحمَّل من `data:` فلا مورد خارجيّ ولا CSP تمنعها.
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  background:${bg};color:#e8f5f2;
  font-family:'Ubuntu Arabic','Noto Naskh Arabic',sans-serif;user-select:none;overflow:hidden">
  <div style="font-size:96px;line-height:1;animation:p 2.4s ease-in-out infinite">${icon}</div>
  <div style="font-size:44px;font-weight:700;color:#f5c518">${title}</div>
  <div style="font-size:20px;opacity:.85">${subtitle}</div>
  <a href="https://gt-salat.invalid/close" style="margin-top:14px;padding:14px 34px;font-size:18px;text-decoration:none;
    background:rgba(245,197,24,.12);color:#f5c518;border:1px solid #f5c518;border-radius:12px;cursor:pointer">
    ⏹ إيقاف وإغلاق
  </a>
  <div style="font-size:12px;opacity:.5">GT-SALAT — اضغط Esc أو الزرّ للإغلاق</div>
  <style>@keyframes p{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}</style>
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
  void win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html(title, subtitle, icon, adhanBackdropUrl(), s.theme !== 'light')));
  win.once('ready-to-show', () => win?.show());

  // ★ الإغلاق تلتقطه العمليّة الرئيسيّة لا سكربت الصفحة: سياسة CSP التي يضعها `main.ts` على الجلسة
  // كلّها (`default-src 'self'`) تحجب السكربتات المضمَّنة هنا أيضاً، فلم يكن `onclick="window.close()"`
  // ولا مستمع Esc يعملان قبل 2.3.1 (ظهر في تجربةٍ حيّة: زرٌّ لا يستجيب وأذانٌ يستمرّ). الزرّ رابطٌ أيّ تنقّلٍ إليه يُغلق، وEsc يُلتقَط من لوحة المفاتيح.
  // الوجهة نطاقٌ محجوزٌ لا وجود له (`.invalid`): `will-navigate` لا يُطلَق للتنقّل إلى `about:blank`
  // فكانت النافذة تصير صفحةً فارغةً بدل أن تُغلَق. و`did-start-navigation` احتياطٌ لأيّ تنقّلٍ آخر.
  win.webContents.on('will-navigate', (e) => {
    e.preventDefault();
    closeAdhanWindow();
  });
  win.webContents.on('did-start-navigation', (details) => {
    const url = (details as unknown as { url?: string }).url ?? '';
    if (url && !url.startsWith('data:')) closeAdhanWindow();
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      e.preventDefault();
      closeAdhanWindow();
    }
  });

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
  const had = win !== null;
  if (win && !win.isDestroyed()) win.destroy();
  win = null;
  // ★ الإغلاق يوقف الصوت **هنا مباشرةً** لا في حدث `closed` وحده: في تجربةٍ حيّة أُغلقت النافذة وبقي
  // الأذان يُسمَع، فبدا زرّ الإيقاف كأنّه لا يستجيب. (يُستدعى أيضاً بعد انتهاء الصوت، فلا ضرر.)
  if (had) audio.stop();
}

/**
 * تُستدعى عند انتهاء الصوت: تُغلق النافذة إلّا أن يكون المستخدم طلب إبقاءها ليغلقها بنفسه.
 * (نفس خيار «إبقاء نافذة الأذان» في الهاتف — ومن غير إبقاءٍ لا تبقى شاشةٌ مضاءةٌ بلا داعٍ.)
 */
export function closeAdhanWindowIfNotKept(): void {
  if (getSettings().keepAdhanWindow) return;
  closeAdhanWindow();
}
