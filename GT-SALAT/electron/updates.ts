import { app, net, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { REPO } from './credits.js';
import type {
  UpdateAsset,
  UpdateChannel,
  UpdateDownloadResult,
  UpdateInfo,
  UpdateInstallResult,
  UpdateProgress,
} from './types.js';

/**
 * التحديث من داخل التطبيق: فحصٌ ثمّ تنزيلٌ ثمّ تثبيت — بلا انتقالٍ إلى المستودع وجلبِ
 * الحزمة يدوياً (كما في GMD وGT-SIRM).
 *
 * كلّ شيءٍ هنا يجري في **العملية الرئيسية**: الفحص والتنزيل كلاهما اتّصالٌ بالشبكة، ولو
 * جرى في الواجهة لاحتاج توسيع `connect-src` في الـCSP — وهي محصورةٌ عمداً في قائمة
 * الخدمات المعروفة. الواجهة تطلب وتتلقّى التقدّم بثّاً، لا أكثر.
 *
 * **والتثبيت يسلك الطريق الذي رُكِّبت به هذه النسخة فعلاً** لا طريقاً واحداً يُفترَض:
 * صورة AppImage تستبدل نفسها بنفسها، ونسخة DEB/RPM تُسلَّم إلى مدير حزم النظام عبر
 * `pkexec` (فهو صاحب قاعدة الحزم، واستبدال التطبيق لملفّاته من تحته يترك المدير يظنّ
 * القديم مثبَّتاً)، وشجرة التطوير تقول ذلك صراحةً بدل أن تتظاهر بالتحديث.
 *
 * وإن تعذّر التثبيت التلقائيّ (لا `pkexec`، أو الصورة في مجلّدٍ لا يُكتَب فيه) فالحزمة
 * **تبقى منزَّلةً ومُتحقَّقاً منها**، ويُعرَض للمستخدم أمرُها ليُتمّها بنفسه — لا يُترك
 * أمام فشلٍ مبهمٍ بعد تنزيل مئة ميغابايت.
 */

const OWNER_REPO = 'SalehGNUTUX/GT-SALAT';
const RELEASES_API = `https://api.github.com/repos/${OWNER_REPO}/releases?per_page=20`;
const RELEASES_PAGE = `${REPO}/releases/latest`;
const RAW_README = (tag: string) =>
  `https://raw.githubusercontent.com/${OWNER_REPO}/${encodeURIComponent(tag)}/README.md`;

const UA = `GT-SALAT/${app.getVersion()} (+${REPO})`;

let cached: UpdateInfo | null = null;

/** مجلّد الحزم المنزَّلة — في `userData` كبقيّة ما يُنزّله التطبيق، لا في `/tmp` فيضيع. */
export function updatesDir(): string {
  const dir = path.join(app.getPath('userData'), 'updates');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── مقارنة النسخ ──────────────────────────────────────────────────────────────

/**
 * وسوم هذا المشروع تُكتَب `GT-SALAT-2.2.0`، وقد تُكتَب `v2.2.0` أو `2.2`، فيُنتزع منها
 * أوّل رقمٍ منقَّط بدل الوثوق بشكل الوسم. ومعه لاحقةُ ما قبل الإصدار إن وُجدت: إهمالها
 * يجعل `2.3.0-beta.1` و`2.3.0-beta.2` سواءً فلا ينتقل المستخدم بينهما.
 */
function parseVersion(str: string): { num: number[]; pre: string[] } | null {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/.exec(String(str || ''));
  if (!m) return null;
  return {
    num: [Number(m[1]), Number(m[2]), Number(m[3] || 0)],
    pre: m[4] ? m[4].split('.').filter(Boolean) : [],
  };
}

/** نصّ النسخة كما تُعرَض: بلاحقتها لا مبتورةً منها. */
function versionText(v: { num: number[]; pre: string[] }): string {
  return v.num.join('.') + (v.pre.length ? `-${v.pre.join('.')}` : '');
}

/** ترتيبٌ على نسق semver: سالبٌ إن كان `a` أقدم، موجبٌ إن كان أحدث. */
function compareVersion(a: { num: number[]; pre: string[] }, b: { num: number[]; pre: string[] }): number {
  for (let i = 0; i < 3; i++) if (a.num[i] !== b.num[i]) return a.num[i] - b.num[i];

  // المستقرّ أحدث من تجريبيّه عند تساوي الرقم: 2.3.0 بعد 2.3.0-beta.9
  if (!a.pre.length && !b.pre.length) return 0;
  if (!a.pre.length) return 1;
  if (!b.pre.length) return -1;

  // ثمّ معرّفاً معرّفاً: الرقميّ قبل النصّيّ، والرقميّ يُقارَن عدداً لا حرفاً
  // — فـ`beta.10` بعد `beta.9` لا قبلها.
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (i >= a.pre.length) return -1;
    if (i >= b.pre.length) return 1;
    const x = a.pre[i];
    const y = b.pre[i];
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    let c: number;
    if (xn && yn) c = Number(x) - Number(y);
    else if (xn) c = -1;
    else if (yn) c = 1;
    else c = x < y ? -1 : x > y ? 1 : 0;
    if (c !== 0) return c;
  }
  return 0;
}

/** أحدث من الحالية؟ */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  return compareVersion(a, b) > 0;
}

// ── كيف رُكِّبت هذه النسخة؟ ────────────────────────────────────────────────────

function run(bin: string, args: string[], timeout = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

/**
 * علامة الصيغة التي يكتبها electron-builder داخل الحزمة (`resources/package-type`: deb أو rpm).
 * تُقرأ بلا مدير حزم، لكنّها **قرينةٌ لا حكم**: حزمة RPM 2.3.0 بُنيت من محتوى الـDEB فحملت «deb».
 */
function packageTypeMarker(): 'deb' | 'rpm' | null {
  try {
    const t = fs.readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf-8').trim().toLowerCase();
    return t === 'deb' || t === 'rpm' ? t : null;
  } catch {
    return null;
  }
}

/**
 * هل ثُبِّت التطبيق بهذه الصيغة؟ — **باسم الحزمة** (`dpkg-query -W` / `rpm -q`): يقرأ قاعدة الحالة وحدها
 * فهو سريع. أمّا السؤال **بالمسار** (`dpkg -S`) فيمسح قوائم ملفّات كلّ الحزم، وقد يتجاوز المهلة على قرصٍ
 * دوّار فيُحسَب التطبيق «غير مثبَّتٍ بحزمة» ويختفي زرّ التنزيل والتثبيت (درسٌ من GT-STACER)، فيأتي ثانياً.
 */
async function ownedByName(kind: 'deb' | 'rpm'): Promise<boolean> {
  if (kind === 'deb') {
    const q = await run('dpkg-query', ['-W', '-f=${Status}', 'gt-salat'], 15000);
    return !!q && q.includes('installed') && !q.includes('not-installed');
  }
  return !!(await run('rpm', ['-q', 'gt-salat'], 15000));
}

async function ownedByPath(kind: 'deb' | 'rpm', exe: string): Promise<boolean> {
  return !!(await run(kind === 'deb' ? 'dpkg' : 'rpm', kind === 'deb' ? ['-S', exe] : ['-qf', exe], 15000));
}

/**
 * الصيغة التي رُكِّبت بها هذه النسخة — ومنها تُختار **حزمةٌ من الصيغة نفسها** وطريقة التثبيت:
 * من ثبّت DEB يُجلَب له DEB، ومن ثبّت RPM يُجلَب له RPM، ومن يشغّل AppImage تُجلَب له AppImage.
 *
 * 1. AppImage: متغيّر البيئة `APPIMAGE` (تضعه الصورة نفسها بمسارها المطلق).
 * 2. DEB/RPM: باسم الحزمة أوّلاً ثمّ بمسار الملفّ التنفيذيّ، بدءاً بما تقوله علامة `package-type` —
 *    فالجهاز قد يحمل الأداتين معاً (Debian فيه `rpm` بقاعدةٍ فارغة).
 * 3. إن لم يُجِب أيٌّ منهما (أداةٌ غائبة أو قاعدةٌ مقفلة) تُعتمَد العلامة وحدها، فهي أدقّ من لا شيء.
 */
export async function detectChannel(): Promise<{ kind: UpdateChannel; target: string; ext: string | null }> {
  const image = process.env.APPIMAGE;
  if (image && fs.existsSync(image)) return { kind: 'appimage', target: image, ext: '.AppImage' };
  if (!app.isPackaged) return { kind: 'dev', target: process.execPath, ext: null };

  const exe = process.execPath;
  const marker = packageTypeMarker();
  const order: Array<'deb' | 'rpm'> = marker === 'rpm' ? ['rpm', 'deb'] : ['deb', 'rpm'];
  for (const kind of order) {
    if (await ownedByName(kind)) return { kind, target: exe, ext: `.${kind}` };
  }
  for (const kind of order) {
    if (await ownedByPath(kind, exe)) return { kind, target: exe, ext: `.${kind}` };
  }
  if (marker) return { kind: marker, target: exe, ext: `.${marker}` };
  return { kind: 'unknown', target: exe, ext: null };
}

/**
 * أسماء معمارية هذا الجهاز كما تَرِد في أسماء الحزم — وهي تختلف بالصيغة:
 * AppImage تكتب `x86_64`، وDEB يكتب `amd64`، وكلاهما يكتب `arm64` و`armv7l`.
 */
const ARCH_TOKENS: Record<string, string[]> = {
  x64: ['x86_64', 'amd64', 'x64'],
  arm64: ['arm64', 'aarch64'],
  arm: ['armv7l', 'armhf', 'armv7'],
};

/**
 * الحزمة المطابقة صيغةً ومعمارية. وحين لا يحمل الاسم معماريةً أصلاً (وهو حال
 * الـRPM هنا: `gt-salat-2.2.0-2.x86_64.rpm` يحملها، لكن قد لا يحملها غداً) يُقبَل
 * ما **لا يحمل معمارية غيرنا** — فلا تُسلَّم حزمة arm إلى جهاز x86 بحجّة أنّها الوحيدة.
 */
function pickAsset(
  assets: Array<{ name: string; size: number; browser_download_url: string }>,
  ext: string | null,
): UpdateAsset | null {
  if (!ext) return null;
  const ofType = assets.filter((a) => a.name.toLowerCase().endsWith(ext.toLowerCase()));
  if (!ofType.length) return null;

  const mine = ARCH_TOKENS[process.arch] ?? [];
  const others = Object.entries(ARCH_TOKENS)
    .filter(([k]) => k !== process.arch)
    .flatMap(([, v]) => v);

  const matched = ofType.find((a) => mine.some((t) => a.name.toLowerCase().includes(t)));
  const chosen = matched ?? ofType.find((a) => !others.some((t) => a.name.toLowerCase().includes(t)));
  if (!chosen) return null;
  return { name: chosen.name, size: chosen.size, url: chosen.browser_download_url };
}

// ── البصمات المنشورة ─────────────────────────────────────────────────────────

/**
 * بصمات الإصدار من `README.md` عند وسمه — فطقس الإصدار في هذا المشروع يكتبها هناك
 * في جدولٍ لكلّ حزمة. بها يُتحقَّق من المنزَّل تحقّقاً حقيقياً لا بمطابقة الحجم وحده
 * (الحجم يطابقه ملفٌّ تالفٌ بنفس الطول). وإن تعذّر جلبها بقي فحص الحجم — ولا يُمنَع
 * التثبيت لأجلها، فغيابها نقصُ معلومةٍ لا دليلُ عطب.
 */
async function fetchChecksums(tag: string, notes: string, sumsUrl?: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const scan = (text: string) => {
    for (const line of text.split('\n')) {
      const hash = /\b([0-9a-f]{64})\b/.exec(line);
      if (!hash) continue;
      for (const m of line.matchAll(/([A-Za-z0-9._-]+\.(?:AppImage|deb|rpm))/g)) {
        if (!map.has(m[1])) map.set(m[1], hash[1]);
      }
    }
  };

  // ١. ملفّ `SHA256SUMS.txt` المرفق بالإصدار (نهج GT-STACER): مصدرٌ مخصَّصٌ لا يتغيّر بتحرير الصفحة.
  if (sumsUrl) {
    try {
      const res = await net.fetch(sumsUrl, { headers: { 'User-Agent': UA } });
      if (res.ok) scan(await res.text());
    } catch {
      // يسقط إلى الملاحظات ثمّ README
    }
    if (map.size) return map;
  }

  scan(notes);                                   // ٢. ملاحظات الإصدار
  if (map.size) return map;

  try {
    const res = await net.fetch(RAW_README(tag), { headers: { 'User-Agent': UA } });
    if (res.ok) scan(await res.text());
  } catch {
    // لا شبكة أو لا README عند هذا الوسم — يبقى فحص الحجم
  }
  return map;
}

// ── الفحص ────────────────────────────────────────────────────────────────────

export async function checkForUpdate(opts: { allowPrerelease?: boolean } = {}): Promise<UpdateInfo> {
  const current = app.getVersion();
  const channel = await detectChannel();
  const fallback: UpdateInfo = {
    current,
    latest: '',
    available: false,
    url: RELEASES_PAGE,
    notes: '',
    checked: false,
    tag: '',
    prerelease: false,
    channel: channel.kind,
    asset: null,
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await net.fetch(RELEASES_API, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': UA },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const list = (await res.json()) as Array<{
      tag_name?: string;
      name?: string;
      html_url?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
      assets?: Array<{ name: string; size: number; browser_download_url: string }>;
    }>;
    if (!Array.isArray(list)) throw new Error('ردٌّ غير متوقَّع');

    // الأحدث رقماً لا الأوّل في القائمة: GitHub يرتّب بتاريخ النشر، وقد يُنشَر
    // إصلاحٌ لنسخةٍ قديمة بعد الجديدة.
    const usable = list
      .filter((r) => !r.draft)
      .filter((r) => opts.allowPrerelease || !r.prerelease)
      .filter((r) => parseVersion(r.tag_name || r.name || ''))
      .sort((a, b) =>
        compareVersion(parseVersion(b.tag_name || b.name || '')!, parseVersion(a.tag_name || a.name || '')!),
      );

    const latestRelease = usable[0];
    if (!latestRelease) return { ...fallback, checked: true };

    const tag = latestRelease.tag_name || latestRelease.name || '';
    const latest = versionText(parseVersion(tag)!);
    const notes = (latestRelease.body || '').slice(0, 4000);
    const available = isNewer(tag, current);

    let asset = pickAsset(latestRelease.assets || [], channel.ext);
    if (asset && available) {
      const sumsAsset = (latestRelease.assets || []).find((a) => a.name.toLowerCase() === 'sha256sums.txt');
      const sums = await fetchChecksums(tag, notes, sumsAsset?.browser_download_url);
      const sha256 = sums.get(asset.name);
      if (sha256) asset = { ...asset, sha256 };
    }

    cached = {
      current,
      latest,
      available,
      url: latestRelease.html_url || RELEASES_PAGE,
      notes,
      checked: true,
      tag,
      prerelease: !!latestRelease.prerelease,
      channel: channel.kind,
      asset,
    };
    return cached;
  } catch {
    // تعذّر الفحص (بلا إنترنت مثلاً) — ليس خطأً يستحقّ إزعاج المستخدم.
    cached = fallback;
    return cached;
  }
}

/** آخر نتيجة فحصٍ محفوظة (بلا اتصالٍ جديد). */
export function lastUpdateInfo(): UpdateInfo | null {
  return cached;
}

// ── التنزيل ──────────────────────────────────────────────────────────────────

let activeDownload: AbortController | null = null;

function sha256Of(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(file);
    rs.on('data', (c) => hash.update(c));
    rs.on('error', reject);
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

/** يحذف حزم الإصدارات السابقة — كلٌّ منها مئةُ ميغابايت، فلا تتراكم في `userData`. */
function pruneOldPackages(keep: string): void {
  try {
    for (const f of fs.readdirSync(updatesDir())) {
      if (f === keep || f === `${keep}.part`) continue;
      fs.rmSync(path.join(updatesDir(), f), { force: true });
    }
  } catch {
    // مجلّدٌ غير مقروء — لا يمنع التنزيل
  }
}

/**
 * تنزيلٌ **يُستأنَف**: الجزء المنزَّل يُطلَب ما بعده بترويسة `Range`، فانقطاعُ الشبكة
 * في مئة ميغابايت لا يعني البدء من الصفر. وإن تجاهل الخادم المدى (ردَّ 200 لا 206)
 * بُدئ من جديدٍ بدل إلحاق بايتاتٍ فوق بايتات فيخرج ملفٌّ تالف.
 */
export async function downloadUpdate(
  asset: UpdateAsset,
  onProgress: (p: UpdateProgress) => void,
  /** داخليٌّ: إعادةُ محاولةٍ من الصفر بعد بصمةٍ خالفت في تنزيلٍ مستأنَف. */
  freshRetry = false,
): Promise<UpdateDownloadResult> {
  // تنزيلٌ واحدٌ في كلّ مرّة: اثنان يكتبان في الملفّ الجزئيّ نفسه فيخرج ملفٌّ تالف.
  if (activeDownload) return { ok: false, error: 'ثمّة تنزيلٌ جارٍ بالفعل' };

  const dest = path.join(updatesDir(), asset.name);
  const part = `${dest}.part`;

  // منزَّلٌ من جولةٍ سابقة وسليم — لا يُعاد تنزيله
  if (fs.existsSync(dest) && fs.statSync(dest).size === asset.size) {
    if (!asset.sha256 || (await sha256Of(dest)) === asset.sha256) {
      pruneOldPackages(asset.name);
      return { ok: true, file: dest, reused: true };
    }
    fs.rmSync(dest, { force: true });           // بصمةٌ لا تطابق — لا يُوثَق به
  }

  let from = 0;
  if (freshRetry) fs.rmSync(part, { force: true });
  else if (fs.existsSync(part)) {
    const got = fs.statSync(part).size;
    if (got > 0 && got < asset.size) from = got;
    else fs.rmSync(part, { force: true });
  }

  const ctrl = new AbortController();
  activeDownload = ctrl;
  const started = Date.now();
  let resumed = false;
  let received = from;

  try {
    const headers: Record<string, string> = { 'User-Agent': UA };
    if (from > 0) headers.Range = `bytes=${from}-`;
    const res = await net.fetch(asset.url, { headers, signal: ctrl.signal });

    if (!res.ok || !res.body) return { ok: false, error: `HTTP ${res.status}` };
    if (from > 0 && res.status !== 206) {
      from = 0;                                  // تُجوهل ترويسة المدى — من الصفر
      received = 0;
    }
    resumed = from > 0;                          // استُؤنف فعلاً لا نيّةً

    const out = fs.createWriteStream(part, { flags: from > 0 ? 'a' : 'w' });
    const body = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);

    /**
     * العدّ داخل حلقة الأنبوب لا في مستمع `data` منفصل، **والقطعة تُنسَخ قبل تمريرها**.
     *
     * قطع جسم الرد من `net.fetch` إطلالاتٌ على ذاكرةٍ يُعيد كروميوم استعمالها، و
     * `WriteStream` يَصُفّ القطعة ليكتبها لاحقاً — فإن تأخّرت الكتابة (والبثُّ إلى الواجهة
     * مع كلّ قطعةٍ يُؤخّرها) كُتب فوق الذاكرة قبل أن تصل إلى القرص، فيخرج ملفٌّ **بحجمه
     * الصحيح تماماً وفي وسطه كيلوباياتٌ من محتوىً آخر**. قِيس فعلاً: أوّل اختلافٍ عند
     * البايت 65,696,246 و97,894 بايتاً مخالفة في حزمةٍ من 132 ميغابايت — ولولا فحص
     * البصمة لثُبِّتت. ومستمع `data` كان يُدخل البثّ في الوضع المتدفّق فيوسّع النافذة.
     */
    let lastReport = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        received += chunk.length;
        const now = Date.now();
        // بثٌّ أربع مرّاتٍ في الثانية لا خمسة آلافٍ في التنزيل الواحد: العين لا تُدرك
        // أكثر، والرسائل تُثقل العملية الرئيسية وتُوسّع نافذة الخطر أعلاه.
        if (now - lastReport >= 250 || received === asset.size) {
          lastReport = now;
          const elapsed = (now - started) / 1000;
          onProgress({
            received,
            total: asset.size,
            percent: asset.size ? Math.min(100, (received / asset.size) * 100) : 0,
            bytesPerSecond: elapsed > 0 ? Math.round((received - from) / elapsed) : 0,
          });
        }
        cb(null, Buffer.from(chunk));            // نسخةٌ نملكها نحن لا إطلالةٌ مُعارة
      },
    });

    await pipeline(body, meter, out);

    const size = fs.existsSync(part) ? fs.statSync(part).size : 0;
    if (asset.size && size !== asset.size) {
      return { ok: false, error: `الحجم لا يطابق: ${size} بدل ${asset.size}` };
    }
    if (asset.sha256) {
      const got = await sha256Of(part);
      if (got !== asset.sha256) {
        // يُسجَّل الحدث بالبصمتين: بدونهما يبقى الفشل خبراً بلا سببٍ يُتتبَّع.
        console.warn(
          `[update] بصمة «${asset.name}» لا تطابق — المحسوبة ${got} · المنشورة ${asset.sha256}` +
            ` · ${resumed ? 'تنزيلٌ مستأنَف' : 'تنزيلٌ من الصفر'}`,
        );
        fs.rmSync(part, { force: true });

        // الفشل بعد استئنافٍ أرجحُ سببٍ له جزءٌ قديمٌ على القرص لا عطبٌ في الشبكة،
        // فتُعاد المحاولة مرّةً واحدةً من الصفر قبل أن يُقال للمستخدم إنّها فشلت.
        if (resumed && !freshRetry) {
          activeDownload = null;
          return downloadUpdate(asset, onProgress, true);
        }
        return {
          ok: false,
          error: `البصمة لا تطابق المنشورة (${got.slice(0, 12)}… بدل ${asset.sha256.slice(0, 12)}…) — حُذفت الحزمة`,
        };
      }
    }

    fs.renameSync(part, dest);
    pruneOldPackages(asset.name);
    return { ok: true, file: dest };
  } catch (e) {
    // الإلغاء يصل هنا إجهاضاً — والجزء المنزَّل يبقى ليُستأنَف لاحقاً
    if (ctrl.signal.aborted) return { ok: false, cancelled: true };
    return { ok: false, error: (e as Error).message };
  } finally {
    activeDownload = null;
  }
}

export function cancelUpdateDownload(): boolean {
  if (!activeDownload) return false;
  activeDownload.abort();
  return true;
}

// ── التثبيت ──────────────────────────────────────────────────────────────────

function pkexec(bin: string, args: string[]): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    execFile('pkexec', [bin, ...args], { timeout: 10 * 60_000 }, (err, _out, stderr) => {
      if (!err) resolve({ ok: true });
      else resolve({ ok: false, error: String(stderr || err.message).trim() });
    });
  });
}

/**
 * يُثبّت الحزمة بالطريق الذي يناسب صيغة هذه النسخة.
 *
 * **صورة AppImage تستبدل نفسها بنفسها**: تُكتَب الجديدة بجانب القديمة ثمّ تُنقَل فوقها
 * نقلةً ذرّية — والصورة الجارية تبقى عاملةً لأنّها مُثبَّتة (mount) من العُقدة القديمة
 * لا من اسمها. ولو كُتبت فوقها مباشرةً لانهار التطبيق الجاري في منتصف النسخ.
 */
export async function installUpdate(file: string): Promise<UpdateInstallResult> {
  if (!file || !fs.existsSync(file)) return { ok: false, error: 'الحزمة غير موجودة' };
  const channel = await detectChannel();

  if (channel.kind === 'appimage') {
    const target = channel.target;
    try {
      fs.accessSync(path.dirname(target), fs.constants.W_OK);
    } catch {
      return { ok: false, error: 'not-writable', file, manual: true, cmd: `install -m755 "${file}" "${target}"` };
    }
    try {
      const staged = `${target}.new`;
      fs.copyFileSync(file, staged);
      fs.chmodSync(staged, 0o755);
      fs.renameSync(staged, target);
      return { ok: true, restart: true };
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message,
        file,
        manual: true,
        cmd: `install -m755 "${file}" "${target}"`,
      };
    }
  }

  if (channel.kind === 'deb') {
    let r = await pkexec('apt-get', ['install', '-y', '--allow-downgrades', file]);
    if (!r.ok) r = await pkexec('dpkg', ['-i', file]);
    return r.ok
      ? { ok: true, restart: true }
      : { ok: false, error: r.error, file, manual: true, cmd: `sudo apt-get install -y "${file}"` };
  }

  if (channel.kind === 'rpm') {
    for (const [bin, args] of [
      ['dnf', ['install', '-y', file]],
      ['zypper', ['--non-interactive', 'install', '--allow-unsigned-rpm', file]],
      ['rpm', ['-U', '--force', file]],
    ] as Array<[string, string[]]>) {
      const r = await pkexec(bin, args);
      if (r.ok) return { ok: true, restart: true };
    }
    return { ok: false, error: 'تعذّر التثبيت', file, manual: true, cmd: `sudo rpm -U --force "${file}"` };
  }

  return {
    ok: false,
    error: channel.kind === 'dev' ? 'dev-build' : 'unknown-packaging',
    file,
    manual: true,
  };
}

/**
 * يُعيد تشغيل التطبيق على النسخة الجديدة.
 *
 * **AppImage لا تُعاد بـ`app.relaunch`:** تلك تُطلق عمليّةً وسيطةً من داخل الصورة المركّبة
 * (`/tmp/.mount_…`) تنتظر خروجنا، فإذا خرجنا فُكّ التركيب وماتت الوسيطة معه، فيُغلَق التطبيق ولا يعود
 * (ظهر في اختبار التحديث من 2.2.1). بدلها صدفةٌ من النظام (`/bin/sh`) خارج الصورة تنتظر خروج عمليّتنا
 * — فقفل النسخة الواحدة يُرفَض ما دامت حيّة — ثمّ تشغّل الصورة الجديدة بالوسائط نفسها.
 */
export function restartApp(): void {
  (app as unknown as { isQuitting: boolean }).isQuitting = true;
  const image = process.env.APPIMAGE;
  if (image) {
    const child = spawn(
      '/bin/sh',
      ['-c', 'while kill -0 "$1" 2>/dev/null; do sleep 0.3; done; shift; exec "$@"', 'gt-salat-restart',
        String(process.pid), image, ...process.argv.slice(1)],
      { detached: true, stdio: 'ignore' },
    );
    child.unref();
  } else {
    app.relaunch();
  }
  app.exit(0);
}

/** يُظهر الحزمة المنزَّلة في مدير الملفّات — لمن يُتمّ التثبيت بنفسه. */
export function revealPackage(file: string): void {
  shell.showItemInFolder(file);
}

/** مساحةُ ما نُزِّل من حزم (بالبايت) — تُعرَض في الإعدادات مع زرّ تفريغها. */
export function packagesSize(): { bytes: number; files: number } {
  try {
    const files = fs.readdirSync(updatesDir());
    let bytes = 0;
    for (const f of files) bytes += fs.statSync(path.join(updatesDir(), f)).size;
    return { bytes, files: files.length };
  } catch {
    return { bytes: 0, files: 0 };
  }
}

export function clearPackages(): void {
  try {
    for (const f of fs.readdirSync(updatesDir())) fs.rmSync(path.join(updatesDir(), f), { force: true });
  } catch {
    // لا شيء يُحذَف
  }
}

export const RELEASES_URL = RELEASES_PAGE;

// للفحص وحده: يُختبَر تحليل الوسم على وسمٍ بعينه لا على ما يصادف أن يكون
// أحدث إصدارٍ منشورٍ يوم تشغيل الفحص.
export const _internals = { parseVersion, versionText, compareVersion, pickAsset };
