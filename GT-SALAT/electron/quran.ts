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

/**
 * تطبيعٌ عربيٌّ للبحث — **مصدرٌ واحدٌ للعملية الرئيسية والواجهة معاً** (وحدةٌ بلا تبعيات،
 * فيصحّ استيرادها من `src/` كما في `hijri.ts`). كان مكرَّراً ثلاث مرّاتٍ فتفرّقت النتائج.
 *
 * مطابقٌ لـ`Quran.normalize` في نسخة الهاتف حرفاً بحرف: تُحذف الشكلات والتطويل، وتُوحَّد
 * الألف والياء والواو والتاء المربوطة، ثمّ **تُحذف الهمزة والألف نفسها** — فتطابق «جنات»
 * ما رُسم «جَنّٰتٍ»، و«الرحمن» ما رُسم «ٱلرَّحْمَٰن». (لولا حذف الألف لافترق البحث بين التوأمين.)
 *
 * **كلّ باحثٍ يستعمله يجب أن يحرس الاستعلام الفارغ أو القصير** — «ا» وحدها تصير فراغاً
 * فتطابق كلّ شيء.
 */
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g;

export function normalizeArabic(s: string): string {
  return (s || '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/ء/g, '')
    .replace(/ا/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * رابطُ موردٍ **محزَّمٍ مع التطبيق** (صورة درسٍ أو صوتٌ مُضمَّن): `learn/wudu/01.webp` ·
 * `audio/adhkar_morning.ogg`. المضيف `res` يخدمه `serveQuranScheme` من مجلّد الموارد.
 * هنا لا في `downloads.ts` لأنّ الواجهة تبنيه بنفسها، ولا يجوز لها استيراد وحدةٍ رئيسية.
 */
export function resourceUrl(rel: string): string {
  return `gtsalat://res/${rel}`;
}

/** صورُ معرضٍ مصوَّرٍ بالترتيب: `01.webp` … `NN.webp` تحت مجلّده. */
export function galleryUrls(dir: string, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    resourceUrl(`${dir}/${String(i + 1).padStart(2, '0')}.webp`),
  );
}
