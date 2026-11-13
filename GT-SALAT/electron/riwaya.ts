import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * نصّ القرآن **بالروايات** (ورش · قالون · الدوري): نصوص مجمّع الملك فهد **المضمَّنة**
 * في `resources/content/riwaya_{slug}.json` (من github.com/fawazahmed0/quran-api، بترقيمٍ
 * عثمانيٍّ يطابق حفصاً والصوت والإشارات) — مطابقةٌ لنسخة الهاتف، وتعمل دون إنترنت.
 *
 * كانت تُجلب من `api.alquran.cloud`، وهو **لا يملك هذه الروايات** فيعيد نصّ حفصٍ بترميزٍ
 * آخر بصمت (`quran-uthmani-quran-academy`): فكان «ورش» يُعرض حفصاً حتى 2.4 («يُؤْمِنُونَ»
 * لا «يُومِنُونَ»). لا تعُد إليه. وذاكرته القديمة `userData/riwaya_text` تُحذف مرّةً هنا.
 *
 * حفصٌ لا يمرّ من هنا أصلاً: نصّه مُضمَّنٌ في `tafsir.json`.
 */

export interface RiwayaAyah {
  n: number;
  text: string;
}

const HAFS_SLUG = 'quran-uthmani';

function contentDir(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources');
  return path.join(base, 'content');
}

const cache = new Map<string, string[][] | null>();
let legacyCleaned = false;

function load(slug: string): string[][] | null {
  if (cache.has(slug)) return cache.get(slug) ?? null;
  if (!legacyCleaned) {
    legacyCleaned = true;
    try { fs.rmSync(path.join(app.getPath('userData'), 'riwaya_text'), { recursive: true, force: true }); } catch {}
  }
  let surahs: string[][] | null = null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(contentDir(), `riwaya_${slug}.json`), 'utf-8')) as { surahs?: string[][] };
    surahs = Array.isArray(j.surahs) && j.surahs.length === 114 ? j.surahs : null;
  } catch (e) {
    console.error(`[riwaya] تعذّرت قراءة riwaya_${slug}.json:`, e);
  }
  cache.set(slug, surahs);
  return surahs;
}

/** نصوص الروايات مضمَّنة، فكلّها متاحةٌ دون إنترنت ما دام ملفّها موجوداً. */
export function isRiwayaCached(_surah: number, slug: string): boolean {
  return !slug || slug === HAFS_SLUG || load(slug) != null;
}

export function riwayaCachedCount(slug: string): number {
  return !slug || slug === HAFS_SLUG || load(slug) != null ? 114 : 0;
}

/** نصّ سورةٍ برواية؛ مصفوفةٌ فارغةٌ لحفص أو إن غاب الملفّ، فتعرض الواجهة نصّ حفص. */
export async function getRiwayaSurah(surah: number, slug: string): Promise<RiwayaAyah[]> {
  if (!slug || slug === HAFS_SLUG) return [];
  const list = load(slug)?.[surah - 1] ?? [];
  return list.map((text, i) => ({ n: i + 1, text }));
}
