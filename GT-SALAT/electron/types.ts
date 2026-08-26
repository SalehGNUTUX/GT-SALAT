/**
 * الأنواع المشتركة بين العملية الرئيسية والواجهة.
 * الواجهة تستوردها بـ `import type … from '@electron/types'` (استيراد أنواعٍ فقط، يُمحى وقت البناء).
 */

/** مذهب حساب العصر: الجمهور (ظلّ المثل) أو الحنفيّ (ظلّ المثلين). */
export type AsrMadhab = 'shafi' | 'hanafi';

/** نمط تنبيه دخول الوقت: أذانٌ كامل، أم رنّة تنبيهٍ قصيرة، أم صامتٌ (إشعارٌ بلا صوت). */
export type AlertMode = 'adhan' | 'tone' | 'silent';

/** مخطّط أسماء الأشهر الميلادية حسب الإقليم. */
export type MonthScheme = 'auto' | 'standard' | 'maghreb' | 'levant';

/** التقويم المعتمَد في ترويسة جدول المواقيت. */
export type CalendarKind = 'hijri' | 'gregorian';

/** ترتيب الصلوات الخمس في مصفوفة prayerAlerts. */
export const ALERT_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** موقعٌ محفوظٌ في سجلّ المواقع — بنفس حقول `Place` في نسخة الهاتف. */
export interface PlaceEntry {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface AppSettings {
  // ── الإعدادات الأساسية (صفحة الإعدادات) ───────────────
  lat: number | null;
  lon: number | null;
  city: string;
  country: string;
  methodId: number;
  methodName: string;
  /**
   * آخر خمسة مواقع استُعملت — العودة إلى أحدها بنقرةٍ إن تعذّر الكشف التلقائي.
   * تُملأ تلقائياً في `settings:set` من أيّ طريق (كشفٌ · اختيارُ مدينة · إدخالٌ يدويّ).
   */
  locationHistory: PlaceEntry[];
  /** إعادةُ كشف الموقع عند الإقلاع وكلّ ستّ ساعات — لكثير التنقّل. */
  autoUpdateLocation: boolean;
  preNotifyMinutes: number;
  zikrIntervalMinutes: number;
  adhanType: 'full' | 'short';
  enableSalatNotify: boolean;
  enableZikrNotify: boolean;
  systemSalatNotify: boolean;
  systemZikrNotify: boolean;
  terminalSalatNotify: boolean;
  terminalZikrNotify: boolean;
  terminalShells: string[];
  autoUpdateTimetables: boolean;
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  theme: 'dark' | 'light';
  doNotDisturb: boolean;
  setupCompleted: boolean;
  enableDuaAfterAdhan: boolean;
  enablePostPrayerDhikr: boolean;
  postPrayerDhikrDelayMinutes: number;
  customAdhanPath: string;
  useCustomAdhan: boolean;

  // ── الإعدادات المتقدمة (صفحة «المزيد من الإعدادات») ────
  // لا يُحرَّر أيٌّ من هذه الحقول في الصفحة الأساسية، ولا العكس.

  /** حساب المواقيت */
  madhab: AsrMadhab;
  useApiTimetables: boolean;

  /** الأذان والتنبيهات */
  adhanVolume: number;              // 0..100
  perPrayerAlerts: boolean;         // عند التفعيل تُخصَّص كل صلاة
  prayerAlerts: AlertMode[];        // فجر/ظهر/عصر/مغرب/عشاء — بترتيب ALERT_PRAYERS
  enablePreNotifySound: boolean;    // صوت تنبيه الاقتراب (التنبيه نفسه من الصفحة الأساسية)
  /**
   * نافذةُ أذانٍ بملء الشاشة فوق كلّ النوافذ عند دخول الوقت — إشعارُ النظام وحده قد يمرّ
   * دون أن يُرى. نظيرُ `fullscreen_adhan` في نسخة الهاتف.
   */
  fullscreenAdhan: boolean;
  /** إبقاءُ النافذة بعد انتهاء الصوت حتى يغلقها المستخدم (وإلّا أُغلقت تلقائياً). */
  keepAdhanWindow: boolean;

  /** بطاقات لوحة التحكم */
  enableDailyAyah: boolean;
  enableDailyHikmah: boolean;
  enableTodayEvent: boolean;
  enableRamadanCard: boolean;

  /** التذكيرات اليومية */
  enableWhiteDaysReminder: boolean;      // الأيام البيض 13/14/15 هجري
  enableMorningAdhkarReminder: boolean;
  morningAdhkarHour: number;             // 0..23
  enableEveningAdhkarReminder: boolean;
  eveningAdhkarHour: number;             // 0..23
  /**
   * تذكيرُ السُّنن الموسميّة (عاشوراء · عرفة · عشر ذي الحجّة · ستّ شوّال · الاثنين والخميس ·
   * سنن الجمعة) — رسالةٌ واحدةٌ في اليوم بأولويّة المناسبة، كما في نسخة الهاتف.
   */
  enableSunnahReminders: boolean;
  sunnahReminderHour: number;            // 0..23

  /** التقويم والتواريخ */
  clock24h: boolean;
  timetableCalendar: CalendarKind;
  hijriOffset: number;                   // -3..+3 يوماً
  monthScheme: MonthScheme;

  /** المظهر */
  accentColor: string;                   // '' = اللون الفيروزي الافتراضي، أو #rrggbb

  /** حالة الواجهة المحفوظة */
  advancedOpenSection: string;           // آخر قسم مفتوح في الصفحة المتقدمة ('' = الكل مطوي)
  checkUpdates: boolean;
  dismissedUpdateVersion: string;        // نسخةٌ أخفى المستخدم شريطها — لا يُعاد إزعاجه بها
  /** آخر نسخةٍ عُرضت مستجدّاتها — فلا تتكرّر رسالة «ما الجديد» إلّا بعد تحديثٍ فعليّ. */
  lastWhatsNewVersion: string;
  phonePromoUntil: number;               // طابعٌ زمني: لا تُعرَض رسالة نسخة الهاتف قبله
  phonePromoNever: boolean;              // اختار المستخدم ألّا تظهر مطلقاً

  /** التسبيح */
  tasbihTarget: number;                  // 0 = بلا حدّ (كما في نسخة الهاتف)
  tasbihCount: number;                   // عدٌّ **تصاعديٌّ لا يلفّ** — الدورة تُحسَب منه (count % target)
  tasbihTotal: number;                   // المجموع التراكمي عبر الجلسات كلّها
  tasbihDhikrIndex: number;              // الذكر المختار في الوضع العادي
  /** الوضع المختلط: كلماتٌ **تتناوب** واحدةً بعد الأخرى مع كلّ عدّة، لا كلمةٌ تتكرّر. */
  tasbihMixed: boolean;
  tasbihMixedType: number;               // 0 = تسبيح · 1 = الباقيات الصالحات
  /** حساسيّة العدّاد الصوتيّ (0..100): كلّما ارتفعت انخفضت عتبة الصوت المحسوب تسبيحةً. */
  tasbihVoiceSensitivity: number;

  /** القرآن */
  quranBookmarks: string[];              // مفاتيح "سورة:آية" مثل "2:255"
  lastReadSurah: number;                 // 0 = لا يوجد
  lastReadAyah: number;
  /**
   * موضع الاستماع — **مستقلٌّ عن القراءة** كما في نسخة الهاتف: المرء يقرأ في موضعٍ
   * ويستمع في آخر، فدمجهما يُضيع أحدهما. يُحفَظ أثناء التلاوة لا أثناء القراءة.
   */
  lastListenSurah: number;               // 0 = لا يوجد
  lastListenAyah: number;
  /**
   * موضعُ الاستماع في **السورة الكاملة** بالثواني — أدقّ من رقم الآية الذي لا معنى له في
   * ملفٍّ واحدٍ بلا توقيت. بها تُستأنَف التلاوة من حيث توقّفت (كما في نسخة الهاتف).
   */
  lastAudioSurah: number;                // 0 = لا يوجد
  lastAudioPos: number;                  // بالثواني
  quranScrollSpeed: number;              // مهلة التمرير التلقائي: 100 = المعتاد، 200 = ضِعف المهلة
  lastReciterId: string;                 // آخر قارئٍ مختار لتلاوة آية-بآية (everyayah)
  lastSurahReciterId: string;            // آخر قارئٍ مختار للسور الكاملة (mp3quran)
  lastMushafPage: number;                // آخر صفحة مصحفٍ مفتوحة (1..604)
  /** رواية **القرآن النصّيّ** (hafs | warsh | qaloon | aldoori) — غير رواية المصحف المصوَّر. */
  lastRiwaya: string;
  mushafRiwaya: string;                  // hafs | warsh
  mushafInvert: boolean;                 // قلب ألوان الصفحة في الوضع الداكن

  /**
   * مصادر التلاوة — تعديلاتٌ **طبقةٌ فوق** `quran_meta.json` لا تمسّه (كالإذاعات تماماً):
   * فتُحدَّث القائمة الافتراضية مع التطبيق دون ضياع ما عدّله المستخدم، ويمكنه استعادة الأصل.
   * مفتاح التعديل **معرّف القارئ الأصلي** فلا ينكسر بتغيير الاسم.
   */
  reciterEdits: Record<string, Reciter>;            // قرّاء آية-بآية (everyayah)
  customReciters: Reciter[];
  surahReciterEdits: Record<string, SurahReciter>;  // قرّاء السور الكاملة (mp3quran)
  customSurahReciters: SurahReciter[];

  /** الإذاعات */
  favoriteRadios: string[];              // أسماء الإذاعات المفضّلة
  customRadios: Radio[];                 // إذاعاتٌ أضافها المستخدم
  radioEdits: Record<string, Radio>;     // تعديلاتٌ على إذاعةٍ افتراضية، مفتاحها اسمها الأصلي

  /** أقسام «المزيد» المثبَّتة في الشريط الجانبي (ثلاثة على الأكثر) */
  favoriteSections: string[];
}

export interface PrayerTime {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  name: string;
  time: string;
  date: string;
  timestamp: number;
}

export interface DayTimetable {
  date: string;
  hijri?: string;
  prayers: PrayerTime[];
}

export interface NextPrayerInfo {
  prayer: PrayerTime;
  remainingMs: number;
  remainingText: string;
}

export interface CalculationMethod {
  id: number;
  nameEn: string;
  nameAr: string;
}

export interface NotificationLogEntry {
  id: string;
  timestamp: number;
  type: 'salat' | 'approaching' | 'zikr' | 'system';
  title: string;
  body: string;
}

export type ShellName = 'bash' | 'zsh' | 'fish';

// ═══════════════════════════════════════════════════════
// نماذج المحتوى الإسلامي (resources/content/*.json)
// منقولة حرفياً عن نسخة الهاتف لتبقى الملفات مشتركة بين النسختين.
// ═══════════════════════════════════════════════════════

export interface AsmaName {
  index: number;
  arabic: string;
  meaning: string;
  ref?: string;
}

export interface Hadith {
  n: number;
  chapter?: string;
  narrator?: string;
  text: string;
  source?: string;
  grade?: string;
}

export interface HadithCollection {
  id: string;
  name: string;
  author?: string;
  description?: string;
  hadiths: Hadith[];
}

export interface Dua {
  n: number;
  text: string;
  source?: string;
  context?: string;
}

export interface DuaCategory {
  id: number;
  name: string;
  icon?: string;
  items: Dua[];
}

export interface Hikmah {
  n: number;
  text: string;
  sayer?: string;
  source?: string;
}

export interface HikamCategory {
  id: number;
  name: string;
  icon?: string;
  items: Hikmah[];
}

/** حصن المسلم المصنّف: بابٌ فيه أذكار، لكل ذكر عدد تكراره ورابط صوته (أونلاين). */
export interface HisnDhikr {
  n: number;
  text: string;
  count?: number;
  audio?: string;
}

export interface HisnCategory {
  id: number;
  name: string;
  icon?: string;
  audio?: string;
  count?: number;
  items?: HisnDhikr[];
}

/** بابٌ بلا أذكار — للفهرس الخفيف. */
export type HisnCategoryInfo = Omit<HisnCategory, 'items'>;

/** التفسير الميسّر: آيةٌ بنصّها العثماني وتفسيرها الموجز. */
export interface TafsirAyah {
  n: number;
  text: string;
  tafsir?: string;
}

export interface TafsirSurah {
  n: number;
  name: string;
  en?: string;
  type?: string;
  count?: number;
  ayahs?: TafsirAyah[];
}

/** سورةٌ بلا آيات — للفهرس الخفيف. */
export type TafsirSurahInfo = Omit<TafsirSurah, 'ayahs'>;

/** آيةٌ منتقاة لبطاقة «آية اليوم». */
export interface DailyAyah {
  surah: string;
  n: number;
  text: string;
}

/** حدثٌ تاريخي إسلامي. hMonth/hDay هجريّان (0 = غير محدّد) لمطابقة «حدث اليوم». */
export interface HistoryEvent {
  title: string;
  year: string;
  sort?: number;
  hMonth?: number;
  hDay?: number;
  text?: string;
}

/** موقعٌ مُضمَّن (بلد/مدينة + إحداثيّات) لاختيار الموقع دون إنترنت — مشترك مع نسخة الهاتف. */
export interface Place {
  country: string;
  city: string;
  lat: number;
  lon: number;
}

/** إذاعةٌ قرآنية (اسم + وصف + رابط بثّ). */
export interface Radio {
  name: string;
  desc?: string;
  url: string;
}

export interface SurahMeta {
  n: number;
  ar: string;
  en?: string;
  verses?: number;
  place?: string;   // مكية | مدنية
  page?: number;
  aliases?: string[];
}

export interface JuzMeta {
  n: number;
  page: number;
  surah: number;
  verse: number;
}

export interface SajdaMeta {
  surah: number;
  ayah: number;
  page: number;
  type: string;
}

/** قارئٌ آية-بآية (everyayah) — `everyayah` اسم مجلّده هناك. */
export interface Reciter {
  id: string;
  ar: string;
  style?: string;
  riwaya: string;
  everyayah?: string;
  mp3quran?: string;
}

/** قارئُ سورةٍ كاملة (mp3quran) — `server` رابط خادمٍ كاملٍ خاصٌّ به. */
export interface SurahReciter {
  id: string;
  ar: string;
  riwaya: string;
  server: string;
}

export interface Riwaya {
  id: string;
  ar: string;
  full: string;
  apiSlug?: string;
  font?: string;
}

export interface QuranMeta {
  totalPages?: number;
  surahs?: SurahMeta[];
  juz?: JuzMeta[];
  sajda?: SajdaMeta[];
  riwayat?: Riwaya[];
  reciters?: Reciter[];
  surahReciters?: SurahReciter[];
}

/** نتيجة بحثٍ داخل الآيات أو التفسير. */
export interface AyahHit {
  surah: number;
  surahName: string;
  ayah: number;
  /** المطابق: نصّ الآية في بحث القرآن، ونصّ التفسير في بحث التفسير. */
  text: string;
  /** نصّ الآية حين يكون `text` تفسيراً — ليُعرَض فوقه. */
  ayahText?: string;
}

/** ذكرٌ من أذكار الصباح/المساء بعدد تكراره. */
export interface SessionDhikr {
  n: number;
  text: string;
  count: number;
}

/** نتيجة فحص توفّر نسخةٍ جديدة. `checked=false` يعني تعذّر الاتصال لا أنّه لا جديد. */
export interface UpdateInfo {
  current: string;
  latest: string;
  available: boolean;
  url: string;
  notes: string;
  checked: boolean;
}

/** ما تحتويه حزمة النسخ الاحتياطي عند فحصها قبل الاستيراد. */
export interface BackupContents {
  hasSettings: boolean;
  prayersCount: number;
  phoneFiles: number;
  phoneBytes: number;
  /** الحزمة صُدِّرت من نسخة الهاتف (فيها ملفّات صوت/مصحف). */
  fromPhone: boolean;
}

/** نتيجة تصديرٍ أو استيراد. */
export interface BackupResult {
  ok: boolean;
  settings: boolean;
  prayers: number;
  error?: string;
}

/** نوع التنزيل: صفحات مصحفٍ برواية، أو صوت سورٍ كاملة، أو صوت آياتٍ مفرّقة لقارئ. */
export type DownloadKind = 'mushaf' | 'surah-audio' | 'ayah-audio';

export interface DownloadTask {
  kind: DownloadKind;
  /** الرواية للمصحف، أو معرّف القارئ للصوت. */
  key: string;
  /** رقم السورة إن كانت الدفعة مقصورةً عليها (صوت آيات سورةٍ واحدة). */
  surah?: number;
  done: number;
  total: number;
  running: boolean;
  error?: string;
}

export interface DownloadStat {
  files: number;
  bytes: number;
  /** المجموع المتوقّع (604 صفحة أو 114 سورة أو 6236 آية) — لحساب الاكتمال. */
  expected: number;
}

/** مصدرٌ حرٌّ اعتُمد في إثراء التطبيق. */
export interface CreditSource {
  name: string;
  note: string;
  url: string;
}

// ── تعلّم الطهارة والصلاة · الرقية الشرعية (2.2) ─────────────
/**
 * نماذج `purity_salah.json` و`ruqyah.json` — **نفس ملفّي نسخة الهاتف بلا تعديل**،
 * فالنماذج هنا مطابقةٌ لـ`LearnModels.kt` حقلاً بحقل. المحتوى الفقهيّ على المذهب المالكيّ
 * بمصادره، وتصحيحُ نصٍّ أو مصدرٍ يكون في الـJSON لا في الشيفرة.
 */
export interface LearnSource {
  title?: string;
  ref?: string;
}

/** معرضٌ مصوَّرٌ معنوَن — القسم الواحد قد يحمل عدّة معارض (الصلوات الخاصّة، تجهيز الميّت). */
export interface LearnGalleryRef {
  title: string;
  dir: string;
  count: number;
}

export interface LearnStep {
  n?: number;
  title?: string;
  short?: string;
  full?: string;
  said?: string;
  ruling?: string;
  source?: LearnSource;
}

export interface LearnRulingItem {
  text: string;
  ruling?: string;
  source?: LearnSource;
}

export interface LearnRulingGroup {
  title?: string;
  items?: LearnRulingItem[];
  note?: string;
  source?: LearnSource;
}

export interface LearnSection {
  id: string;
  title: string;
  icon?: string;
  intro?: string;
  imageDir?: string;
  imageCount?: number;
  galleries?: LearnGalleryRef[];
  draft?: boolean;
  steps?: LearnStep[];
  rulings?: LearnRulingGroup[];
  note?: string;
  /** أداةٌ تفاعليّةٌ مرتبطةٌ بالقسم: `qasr` (هل يجوز القصر؟) · `tahara` (طهرتُ الآن). */
  tool?: string;
}

export interface LearnFile {
  sections: LearnSection[];
  disclaimer?: string;
}

/** مقطعُ رقية: قرآنٌ (سورة + مدى آيات) أو دعاءٌ/ذكرٌ ثابت. */
export interface RuqyahSegment {
  label?: string;
  kind?: string; // quran | dua | dhikr
  surah?: number;
  ayahFrom?: number;
  ayahTo?: number;
  text?: string;
  note?: string;
  repeat?: number;
  source?: LearnSource;
}

export interface RuqyahSection {
  id: string;
  title: string;
  icon?: string;
  note?: string;
  link?: string;
  segments?: RuqyahSegment[];
}

export interface RuqyahFile {
  sections: RuqyahSection[];
  disclaimer?: string;
}
