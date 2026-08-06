/**
 * روابط مصادر القرآن (صوتاً وصوراً) — وحدةٌ **بلا تبعيات** كـ`hijri.ts`، تشترك فيها
 * العملية الرئيسية والواجهة عبر `@electron/quran`.
 *
 * الأنماط نفسها المستعملة في نسخة الهاتف (`domain/Quran.kt`)، ومصادرها مذكورةٌ في
 * «المصادر المعتمَدة»: everyayah.com (آية-بآية) · mp3quran.net (السور الكاملة) ·
 * Quran-PNG وQuranHub (صور المصحف).
 *
 * **قاعدة:** لكلّ قارئٍ في mp3quran **رابط خادمٍ كامل** مختلف (`server8`, `server13`…)،
 * فالرابط = الخادم + رقم السورة. لا تفترض خادماً واحداً للجميع.
 */

const EVERYAYAH = 'https://everyayah.com/data';

export const TOTAL_SURAHS = 114;
export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;

function p3(n: number): string {
  return String(n).padStart(3, '0');
}

/** صوت آيةٍ بعينها للتلاوة المتزامنة: `{folder}/{SSS}{AAA}.mp3`. */
export function ayahAudioUrl(folder: string, surah: number, ayah: number): string {
  return `${EVERYAYAH}/${folder}/${p3(surah)}${p3(ayah)}.mp3`;
}

/**
 * البسملة ملفٌّ منفصل (`001001.mp3` = أول آية الفاتحة) تُشغَّل قبل الآية الأولى
 * من كلّ سورة **عدا الفاتحة** (البسملة فيها آيةٌ مرقَّمة) **والتوبة** (لا بسملة فيها).
 */
export function basmalaUrl(folder: string): string {
  return `${EVERYAYAH}/${folder}/001001.mp3`;
}

export function needsBasmala(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

/** تلاوة سورةٍ كاملة من رابط خادمٍ كامل ينتهي بـ`/`. */
export function surahAudioUrl(server: string, surah: number): string {
  return server.replace(/\/+$/, '') + `/${p3(surah)}.mp3`;
}

/** صورة صفحةٍ من المصحف حسب الرواية (حفص من مصحف المدينة، وورش من مجمّع الملك فهد). */
export function pageImageUrl(page: number, riwaya = 'hafs'): string {
  if (riwaya === 'warsh') {
    return `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${page}.jpg`;
  }
  return `https://raw.githubusercontent.com/SalehGNUTUX/Quran-PNG/master/${p3(page)}.png`;
}

// ── مسارات الملفّات المُنزَّلة (نسبيّةً إلى مجلّد التنزيلات) ──
// **مطابقةٌ لتخطيط نسخة الهاتف** كي تبقى حزم النسخ الاحتياطي متبادَلة.
// موضعها هنا لا في `downloads.ts` لأنّ الواجهة تحتاجها، و`downloads.ts` يستورد
// `app`/`net`/`protocol` فلا يصحّ استيراده من الواجهة.

export function mushafRel(page: number, riwaya: string): string {
  const dir = riwaya === 'hafs' ? 'mushaf' : `mushaf_${riwaya}`;
  const ext = riwaya === 'warsh' ? 'jpg' : 'png';
  return `${dir}/${p3(page)}.${ext}`;
}

export function surahAudioRel(reciterId: string, surah: number): string {
  return `audio/${reciterId}/${p3(surah)}.mp3`;
}

export function ayahAudioRel(reciterId: string, surah: number, ayah: number): string {
  return `audio_ayat/${reciterId}/${p3(surah)}${p3(ayah)}.mp3`;
}

/** مصادر بديلة تُجرَّب بالترتيب عند تعذّر الأساسي (لحفص فقط؛ ورش من مصدرٍ واحدٍ موثوق). */
export function pageImageFallbacks(page: number, riwaya = 'hafs'): string[] {
  if (riwaya === 'warsh') return [];
  return [
    `https://quranpages.github.io/pages/page_${p3(page)}.png`,
    `https://www.everyayah.com/data/images_png/${p3(page)}.png`,
  ];
}
