/**
 * خلفيّةٌ من صور المستخدم — نظير `CustomBackgroundStore` في الهاتف.
 *
 * تُنسَخ الصورة المختارة مصغّرةً (عرضٌ أقصاه 1920) بصيغة JPEG إلى `userData/backgrounds/custom.jpg`،
 * فلا يعتمد التطبيق على بقاء الأصل في مكانه. التصغير بـ`nativeImage` المضمَّن، بلا مكتبة صور.
 * تُسلَّم للواجهة رابطَ بيانات (data URL): الـCSP يسمح بـ`data:` في `img-src`، ولا يُفتَح نظام ملفّاتٍ لها.
 * لا تُدرَج في النسخ الاحتياطيّ (كما في الهاتف).
 */
import { app, dialog, nativeImage, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getSettings } from './settings.js';

const MAX_WIDTH = 1920;

function customPath(): string {
  return path.join(app.getPath('userData'), 'backgrounds', 'custom.jpg');
}

/** يفتح منتقي الصور ويحفظ نسخةً مصغّرة. يُعيد true إن حُفظت. */
export async function pickCustomBackground(win: BrowserWindow | null): Promise<{ ok: boolean; error?: string }> {
  const res = await dialog.showOpenDialog(win ?? undefined as unknown as BrowserWindow, {
    title: 'اختر صورةً لخلفيّة لوحة التحكّم',
    filters: [{ name: 'الصور', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  let img = nativeImage.createFromPath(res.filePaths[0]);
  if (img.isEmpty()) return { ok: false, error: 'تعذّرت قراءة الصورة. جرّب صورة JPEG أو PNG.' };
  const { width } = img.getSize();
  if (width > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH, quality: 'best' });
  const file = customPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, img.toJPEG(86));
  return { ok: true };
}

/** صورة المستخدم رابطَ بيانات، أو null إن لم توجد (حُذفت فتسقط الواجهة إلى الافتراضيّة). */
export function customBackgroundUrl(): string | null {
  const file = customPath();
  if (!fs.existsSync(file)) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
}

export function removeCustomBackground(): void {
  fs.rmSync(customPath(), { force: true });
}

const BUILTIN = ['haram', 'nabawi', 'aqsa', 'hassan2_sea', 'hassan2_sunset', 'hassan_day', 'hassan_night', 'qarawiyyin'];

/** ملفّ صورةٍ مضمَّنة: من `src/assets` في التطوير، ومن `dist/assets` (باسمٍ مُجزَّأ) بعد البناء. */
function builtinPath(file: string): string | null {
  const root = app.getAppPath();
  const dev = path.join(root, 'src', 'assets', 'backgrounds', `${file}.webp`);
  if (fs.existsSync(dev)) return dev;
  const dir = path.join(root, 'dist', 'assets');
  try {
    const re = new RegExp(`^${file}-[^.]+\\.webp$`);
    // للصورة ومصغّرتها الاسم نفسه؛ الأكبر حجماً هي الكاملة.
    const hits = fs.readdirSync(dir).filter((f) => re.test(f))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
    return hits[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * الخلفيّة المختارة رابطَ بيانات لنافذة الأذان (تُحمَّل من `data:` فلا تصل إلى ملفّات القرص)،
 * أو null إن أُطفئت الخلفيّة — كما تتبع نافذة الأذان في الهاتف خلفيّة التطبيق.
 */
export function adhanBackdropUrl(): string | null {
  const s = getSettings();
  if (!s.homeBackgroundEnabled) return null;
  if (s.homeBackgroundId === 'custom') {
    const custom = customBackgroundUrl();
    if (custom) return custom;
  }
  const dark = s.theme !== 'light';
  const id = BUILTIN.includes(s.homeBackgroundId) ? s.homeBackgroundId : dark ? 'hassan_night' : 'hassan_day';
  const file = builtinPath(id);
  if (!file) return null;
  return `data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`;
}
