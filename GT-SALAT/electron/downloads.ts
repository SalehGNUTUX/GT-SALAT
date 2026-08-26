import { app, net, protocol } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import {
  pageImageUrl,
  ayahAudioUrl,
  ayahAudioRel,
  basmalaUrl,
  mushafRel,
  surahAudioUrl,
  surahAudioRel,
  TOTAL_PAGES,
} from './quran.js';
import type { DownloadKind, DownloadStat, DownloadTask } from './types.js';

/**
 * تنزيل محتوى القرآن للعمل دون إنترنت.
 *
 * **تخطيط الملفّات مطابقٌ لنسخة الهاتف** (تحت `userData/quran/` هنا و`filesDir` هناك)، كي
 * تبقى حزم النسخ الاحتياطي متبادَلة: `audio/{reciter}/{SSS}.mp3` · `audio_ayat/{reciter}/{SSSAAA}.mp3`
 * · `mushaf/` لحفص و`mushaf_{riwaya}/` لغيرها.
 *
 * **الوصول من الواجهة عبر بروتوكول `gtsalat://`** لا عبر `file://`: صفحة الواجهة تُحمَّل من
 * `http://localhost` في التطوير ومن `file://` في الإنتاج، وكروميوم يمنع موارد `file://` من
 * صفحةٍ على `http` مهما كانت الـCSP. البروتوكول المخصّص يعمل في الحالتين، ويقصر الوصول
 * على مجلّد التنزيلات وحده.
 */

const SCHEME = 'gtsalat';

export function quranDir(): string {
  const dir = path.join(app.getPath('userData'), 'quran');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** يجب أن تُستدعى **قبل** `app.whenReady()` — وإلّا لم يُعامَل البروتوكول معاملةً آمنة. */
export function registerQuranScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: false } },
  ]);
}

/** مجلّد الموارد المُحزَّمة (صور الدروس والأصوات المُضمَّنة) — يختلف بين التطوير والإنتاج. */
export function resourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources');
}

/** نوعُ المحتوى بالامتداد — بدونه يخمّن كروميوم، فيرفض صوتاً أو صورة أحياناً. */
const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** جسمُ استجابةٍ من ملفٍّ (أو جزءٍ منه) بلا تحميله كاملاً في الذاكرة. */
function fileBody(file: string, start?: number, end?: number): ReadableStream {
  const stream = fs.createReadStream(file, start === undefined ? undefined : { start, end });
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

/**
 * يُستدعى بعد الجاهزية. **مضيفان لا واحد:**
 * - `gtsalat://local/<rel>` → مجلّد التنزيلات في `userData` (المصحف وصوت القرآن).
 * - `gtsalat://res/<rel>`   → مجلّد الموارد المحزَّمة (صور الدروس المصوَّرة والأصوات).
 *
 * الموارد المحزَّمة لا يمكن أن تمرّ عبر Vite (خارج `src/`) ولا عبر `file://` (يمنعه كروميوم
 * من صفحةٍ على http في التطوير) — فالبروتوكول هو الطريق الوحيد العامل في الوضعين.
 * وكلّ مضيفٍ يحرس جذره فلا يخرج مسارٌ خبيثٌ منه.
 *
 * **ويخدم طلبات المدى (`Range`) بنفسه ولا يفوّضها إلى `net.fetch('file://…')`:**
 * تلك تُعيد الملفّ كاملاً **بلا `Content-Length` ولا `Accept-Ranges`**، فيرى كروميوم بثّاً
 * مجهول الطول — `audio.duration = Infinity` — فلا شريط مدّةٍ ولا انتقال بالسحب في تسجيلٍ
 * من ثلاثٍ وستّين دقيقة. (قِيس فعلاً قبل الإصلاح: `duration = Infinity` وترويستان فقط.)
 */
export function serveQuranScheme(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const root = url.hostname === 'res' ? resourcesDir() : quranDir();
      const target = path.resolve(root, rel);
      if (!target.startsWith(root + path.sep)) return new Response('forbidden', { status: 403 });
      if (!fs.existsSync(target)) return new Response('not found', { status: 404 });

      const size = fs.statSync(target).size;
      const type = mimeFor(target);
      const range = request.headers.get('Range');
      const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;

      if (m) {
        // مدىً مفتوح الطرف مقبولٌ في الطرفين: «bytes=1000-» و«bytes=-500».
        let start = m[1] ? parseInt(m[1], 10) : size - parseInt(m[2] || '0', 10);
        let end = m[2] && m[1] ? parseInt(m[2], 10) : size - 1;
        start = Math.max(0, Math.min(start, size - 1));
        end = Math.max(start, Math.min(end, size - 1));
        return new Response(fileBody(target, start, end), {
          status: 206,
          headers: {
            'Content-Type': type,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }

      return new Response(fileBody(target), {
        status: 200,
        headers: {
          'Content-Type': type,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch {
      return new Response('error', { status: 500 });
    }
  });
}

/** مسار الواجهة لملفٍّ محلّي، أو null إن لم يكن مُنزَّلاً. */
export function localUrl(rel: string): string | null {
  const base = quranDir();
  const target = path.resolve(base, rel);
  // حارسٌ ثانٍ بجانب حارس البروتوكول — لا يُبنى مسارٌ خارج مجلّد التنزيلات أصلاً.
  if (!target.startsWith(base + path.sep)) return null;
  return fs.existsSync(target) && fs.statSync(target).size > 0 ? `${SCHEME}://local/${rel}` : null;
}

// ── إحصاء ──
function walk(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  if (!fs.existsSync(dir)) return { files, bytes };
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = walk(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files++;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

function dirFor(kind: DownloadKind, key: string): string {
  return kind === 'mushaf'
    ? path.join(quranDir(), key === 'hafs' ? 'mushaf' : `mushaf_${key}`)
    : path.join(quranDir(), kind === 'surah-audio' ? 'audio' : 'audio_ayat', key);
}

/**
 * `surah` يقصر الإحصاء على سورةٍ بعينها — تحتاجه ترويسة القارئ في «القرآن النصّيّ»:
 * صوت الآيات يُنزَّل سورةً سورة (كما في الهاتف) لا 6236 ملفّاً دفعةً واحدة.
 */
export function statFor(kind: DownloadKind, key: string, expected: number, surah?: number): DownloadStat {
  const dir = dirFor(kind, key);
  if (surah && kind === 'ayah-audio') {
    let files = 0;
    let bytes = 0;
    const prefix = String(surah).padStart(3, '0');
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (!name.startsWith(prefix)) continue;
        files++;
        bytes += fs.statSync(path.join(dir, name)).size;
      }
    }
    return { files, bytes, expected };
  }
  const { files, bytes } = walk(dir);
  return { files, bytes, expected };
}

/**
 * ما نُزِّل مفصَّلاً بالسورة عند قارئٍ بعينه: `{ رقم السورة: عدد الملفّات }`.
 * للسور الكاملة العدد 1، ولصوت الآيات عدد آياتها المُنزَّلة — تقارنه الواجهة بعدد آيات
 * السورة لتعرف الكاملة من الناقصة. **جولةٌ واحدة** بدل 114 استدعاءً لـ`statFor`.
 */
export function downloadedBySurah(kind: DownloadKind, key: string): Record<number, number> {
  const dir = dirFor(kind, key);
  const out: Record<number, number> = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const n = parseInt(name.slice(0, 3), 10);
    if (!n || n < 1 || n > 114) continue;
    if (fs.statSync(path.join(dir, name)).size <= 0) continue;
    out[n] = (out[n] ?? 0) + 1;
  }
  return out;
}

/** كلّ السور الكاملة المُنزَّلة مجموعةً بالقارئ — لعرض «المُنزَّل» عبر القرّاء جميعاً. */
export function downloadedSurahAudio(): Record<string, number[]> {
  const base = path.join(quranDir(), 'audio');
  const out: Record<string, number[]> = {};
  if (!fs.existsSync(base)) return out;
  for (const reciter of fs.readdirSync(base, { withFileTypes: true })) {
    if (!reciter.isDirectory()) continue;
    const nums = Object.keys(downloadedBySurah('surah-audio', reciter.name)).map(Number).sort((a, b) => a - b);
    if (nums.length > 0) out[reciter.name] = nums;
  }
  return out;
}

export function removeFor(kind: DownloadKind, key: string, surah?: number): boolean {
  const dir = dirFor(kind, key);
  try {
    if (surah && kind === 'ayah-audio') {
      if (!fs.existsSync(dir)) return true;
      const prefix = String(surah).padStart(3, '0');
      for (const name of fs.readdirSync(dir)) {
        if (name.startsWith(prefix)) fs.rmSync(path.join(dir, name), { force: true });
      }
      return true;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// ── التنزيل ──
let current: DownloadTask | null = null;
let cancelRequested = false;

export function currentTask(): DownloadTask | null {
  return current;
}

export function cancelDownload(): void {
  cancelRequested = true;
}

/** تنزيلٌ تدفّقيّ لملفٍّ واحد؛ يتخطّى الموجود ويحذف الناقص عند الفشل. */
async function fetchTo(url: string, rel: string): Promise<boolean> {
  const target = path.join(quranDir(), rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return true;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    const res = await net.fetch(url);
    if (!res.ok || !res.body) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return false;
    fs.writeFileSync(target, buf);
    return true;
  } catch {
    try { fs.rmSync(target, { force: true }); } catch {}
    return false;
  }
}

/**
 * يُنزّل دفعةً كاملة مع بثّ التقدّم. متتابعٌ لا متوازٍ: التوازي يُغرق الخوادم المجّانية
 * ويُعرّض التنزيل للحجب، والفرق في الزمن لا يبرّره.
 */
export async function startDownload(
  kind: DownloadKind,
  key: string,
  opts: { surahAyahCounts?: number[]; server?: string; folder?: string; surah?: number },
  onProgress: (t: DownloadTask) => void,
): Promise<DownloadTask> {
  if (current?.running) return current;
  cancelRequested = false;

  const jobs: Array<{ url: string; rel: string }> = [];

  if (kind === 'mushaf') {
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      jobs.push({ url: pageImageUrl(p, key), rel: mushafRel(p, key) });
    }
  } else if (kind === 'surah-audio') {
    const server = opts.server ?? '';
    for (let s = 1; s <= 114; s++) {
      jobs.push({ url: surahAudioUrl(server, s), rel: surahAudioRel(key, s) });
    }
  } else {
    const folder = opts.folder ?? '';
    const counts = opts.surahAyahCounts ?? [];
    // البسملة أولاً (تُشغَّل قبل أول آية من كل سورة)، ثم كل آية.
    jobs.push({ url: basmalaUrl(folder), rel: ayahAudioRel(key, 1, 1) });
    // `opts.surah` يقصر الدفعة على سورةٍ واحدة — هو الوضع المعتاد في قارئ «القرآن النصّيّ».
    counts.forEach((count, i) => {
      const surah = i + 1;
      if (opts.surah && surah !== opts.surah) return;
      for (let a = 1; a <= count; a++) {
        jobs.push({ url: ayahAudioUrl(folder, surah, a), rel: ayahAudioRel(key, surah, a) });
      }
    });
  }

  current = { kind, key, surah: opts.surah, done: 0, total: jobs.length, running: true };
  onProgress({ ...current });

  let failures = 0;
  for (const job of jobs) {
    if (cancelRequested) break;
    const ok = await fetchTo(job.url, job.rel);
    if (!ok) failures++;
    current.done++;
    // نبثّ كل 5 ملفّات كي لا نُغرق الواجهة بالأحداث.
    if (current.done % 5 === 0 || current.done === current.total) onProgress({ ...current });
  }

  current.running = false;
  if (cancelRequested) current.error = 'أُلغي التنزيل';
  else if (failures > 0) current.error = `تعذّر تنزيل ${failures} ملفّاً`;
  onProgress({ ...current });

  const finished = { ...current };
  current = null;
  return finished;
}
