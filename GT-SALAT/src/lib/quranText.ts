import { normalizeArabic } from '@electron/quran';

/**
 * تهيئة نصّ القرآن للعرض بخطّ الرواية — مطابقٌ لـ`domain/QuranText.kt` في الهاتف.
 *
 * نصوص ورش وقالون (مجمّع الملك فهد) مرمَّزةٌ لخطوط المجمّع، والخطّ المغربيّ AALMAGHRIBI
 * يرمّز بعض العلامات في مواضع أخرى. التحويل وقت العرض فقط، والنصّ المخزَّن كما نُشر
 * (البحث والنسخ يعملان عليه). جُرِّب كلّ بديلٍ برسم الخطّ نفسه؛ لا تضِف تحويلاً دون رسمه.
 */

/** علامة الوقف؛ تُرسَم في الخطّ المغربيّ «صه» صغيرةً مرفوعة، لأنّ رمز الخطّ لها يشبه الشدّة. */
export const WAQF = 'ۖ';

const MAGHRIBI_MAP: Record<string, string> = {
  'ے': 'ى', // ياءٌ بلا نقطٍ في آخر الكلمة (فِے) ← ى
  '۟': '',       // الصفر المستدير: المصحف المغربيّ يترك الحرف الساكت بلا علامة
  'ۥ': '٘', // واو الصلة الصغيرة ← رمزها في الخطّ المغربيّ
  'ۦ': 'ٙ', // ياء الصلة الصغيرة ← رمزها في الخطّ المغربيّ
  '۪': 'ۙ', // نقطة الإمالة والتقليل تحت الحرف
  'ࣱ': 'ٌ', // تنوينا الضمّ والكسر المتتابعان غير موجودَين في الخطّ
  'ࣲ': 'ٍ',
  ' ': '', '⁠': '', '﻿': '',
};

/** النصّ المعروض لخطّ [font] (اسمه في `quran_meta.json`). علامة [WAQF] تبقى لترسمها الواجهة. */
export function forFont(text: string, font?: string): string {
  if (font === 'Maghribi') return Array.from(text, (c) => MAGHRIBI_MAP[c] ?? c).join('');
  return text.replace(/﻿/g, '');
}

/** خطّ CSS ومقاسه لكلّ رواية: المغربيّ والعثمانيّ أدقّ من أميري فيُكبَّران. */
export function quranFontCss(font?: string): { fontFamily: string; scale: number } {
  if (font === 'Maghribi') return { fontFamily: "'AAL Maghribi', 'Amiri Quran', serif", scale: 1.18 };
  if (font === 'UthmanicHafs') return { fontFamily: "'KFGQPC Hafs', 'Amiri Quran', serif", scale: 1.1 };
  return { fontFamily: "'Amiri Quran', serif", scale: 1 };
}

const BISMILLAH_KEY = normalizeArabic('بسم الله الرحمن الرحيم');

/** يحذف البسملة من أوّل الآية الأولى إن سبقتها (نصّ حفص المضمَّن يلحقها بها، ونصوص المجمّع لا). */
export function stripBismillah(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 4) return text;
  return normalizeArabic(words.slice(0, 4).join(' ')) === BISMILLAH_KEY ? words.slice(4).join(' ') : text;
}

/** رقم صفحة المصحف المدنيّ (1-604) للآية، من جدول بدايات الصفحات. */
export function pageOf(starts: number[][], surah: number, ayah: number): number {
  let lo = 0, hi = starts.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, a] = starts[mid];
    if (s < surah || (s === surah && a <= ayah)) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans + 1;
}

/** يقسّم آيات السورة على صفحات المصحف؛ وبلا جدولٍ يقسمها كلّ 10 آيات. */
export function chunkByPage<T extends { n: number }>(surah: number, ayahs: T[], starts: number[][] | undefined): { page: number; ayahs: T[] }[] {
  if (ayahs.length === 0) return [];
  if (!starts || starts.length === 0) {
    const out: { page: number; ayahs: T[] }[] = [];
    for (let i = 0; i < ayahs.length; i += 10) out.push({ page: out.length + 1, ayahs: ayahs.slice(i, i + 10) });
    return out;
  }
  const out: { page: number; ayahs: T[] }[] = [];
  for (const a of ayahs) {
    const p = pageOf(starts, surah, a.n);
    const last = out[out.length - 1];
    if (last && last.page === p) last.ayahs.push(a);
    else out.push({ page: p, ayahs: [a] });
  }
  return out;
}
