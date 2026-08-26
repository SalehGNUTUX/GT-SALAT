import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * نصّ القرآن **بالروايات** (ورش · قالون · الدوري) من `api.alquran.cloud`.
 *
 * حفصٌ لا يمرّ من هنا أصلاً: نصّه العثمانيّ مُضمَّنٌ في `tafsir.json` فيعمل دون إنترنت.
 * وما سواه يُجلَب **سورةً سورة عند طلبها** ويُخزَّن، فيعمل بعدها دون إنترنت هو الآخر.
 *
 * **الجلب في العملية الرئيسية لا في الواجهة** — كما في `updates.ts` تماماً: فلا نوسّع
 * `connect-src` في الـCSP لخدمةٍ جديدة. الواجهة تطلب النصّ عبر IPC ولا تعرف الشبكة.
 *
 * وتخطيط الكاش `riwaya_text/{slug}/{surah}.json` **مطابقٌ لنسخة الهاتف** (`filesDir`)،
 * فتبقى الملفّات متبادَلةً بين النسختين كبقيّة المُنزَّل.
 */

export interface RiwayaAyah {
  n: number;
  text: string;
}

/** رواية حفص هي المُضمَّنة — لا تُجلب من الشبكة أبداً. */
const HAFS_SLUG = 'quran-uthmani';

function cacheDir(slug: string): string {
  return path.join(app.getPath('userData'), 'riwaya_text', slug);
}

function cacheFile(slug: string, surah: number): string {
  return path.join(cacheDir(slug), `${surah}.json`);
}

/** هل نصّ السورة بهذه الرواية متاحٌ دون إنترنت؟ (حفصٌ دائماً نعم). */
export function isRiwayaCached(surah: number, slug: string): boolean {
  if (!slug || slug === HAFS_SLUG) return true;
  const f = cacheFile(slug, surah);
  return fs.existsSync(f) && fs.statSync(f).size > 0;
}

/** عدد سور الرواية المخزَّنة — لعرضه في الواجهة بجانب اسم الرواية. */
export function riwayaCachedCount(slug: string): number {
  if (!slug || slug === HAFS_SLUG) return 114;
  const dir = cacheDir(slug);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length;
}

function parse(body: string): RiwayaAyah[] {
  const j = JSON.parse(body) as { data?: { ayahs?: { numberInSurah?: number; text?: string }[] } };
  return (j.data?.ayahs ?? [])
    .map((a) => ({ n: a.numberInSurah ?? 0, text: a.text ?? '' }))
    .filter((a) => a.n > 0 && a.text);
}

/**
 * نصّ سورةٍ برواية. يعيد مصفوفةً فارغةً إن تعذّر (لا إنترنت ولا كاش) — والواجهة عندها
 * **تعود إلى نصّ حفص المُضمَّن** بدل أن تعرض صفحةً فارغة.
 */
export async function getRiwayaSurah(surah: number, slug: string): Promise<RiwayaAyah[]> {
  if (!slug || slug === HAFS_SLUG) return [];
  const file = cacheFile(slug, surah);

  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    try {
      return parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      // ملفٌّ تالفٌ يُحذَف فيُعاد جلبه، ولا يبقى عائقاً دائماً.
      try { fs.unlinkSync(file); } catch {}
    }
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${slug}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const body = await res.text();
    const ayahs = parse(body);
    if (ayahs.length === 0) return [];
    fs.mkdirSync(cacheDir(slug), { recursive: true });
    fs.writeFileSync(file, body, 'utf-8');
    return ayahs;
  } catch {
    return [];
  }
}
