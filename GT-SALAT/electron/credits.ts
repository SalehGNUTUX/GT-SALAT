import type { CreditSource } from './types.js';

/**
 * المصادر الحرّة والمفتوحة التي اعتمدنا عليها في إثراء التطبيق.
 * ★ يُحدَّث هذا الملف كلّما اعتمدنا مصدراً حرّاً/مفتوح المصدر جديداً.
 */
export const DEVELOPER = 'SalehGNUTUX';
export const GITHUB = 'https://github.com/SalehGNUTUX';
export const REPO = 'https://github.com/SalehGNUTUX/GT-SALAT';
export const PHONE_REPO = 'https://github.com/SalehGNUTUX/GT-SALAT-PHONE';
export const PROJECTS = 'https://salehgnutux.github.io/gnutux/';

export const CREDIT_SOURCES: CreditSource[] = [
  { name: 'GT_HISNMUSLIM', note: 'حصن المسلم المصنّف (132 باباً)', url: 'https://github.com/SalehGNUTUX/GT_HISNMUSLIM' },
  { name: 'GT-SIRM', note: 'أحاديث · أدعية · حِكَم · أسماء الله الحسنى', url: 'https://github.com/SalehGNUTUX/GT-SIRM' },
  { name: 'GT_QURANRADIO', note: 'قائمة إذاعات القرآن الكريم', url: 'https://github.com/SalehGNUTUX/GT_QURANRADIO' },
  { name: 'GT-QURANREADER', note: 'فهرس القرآن والأجزاء والسجدات', url: 'https://github.com/SalehGNUTUX/GT-QURANREADER' },
  { name: 'alquran.cloud', note: 'النصّ العثماني والتفسير الميسّر', url: 'https://alquran.cloud' },
  { name: 'everyayah.com', note: 'تلاوة القرآن آية-بآية (13 قارئاً)', url: 'https://everyayah.com' },
  { name: 'mp3quran.net', note: 'تلاوات السور الكاملة', url: 'https://mp3quran.net' },
  { name: 'AlAdhan API', note: 'المواقيت والتاريخ الهجري', url: 'https://aladhan.com' },
  { name: 'Adhan (Batoul Apps)', note: 'حساب المواقيت والقبلة محلّياً بلا إنترنت', url: 'https://github.com/batoulapps/adhan-js' },
  { name: 'ipapi.co · ip-api.com', note: 'اكتشاف الموقع من عنوان الإنترنت', url: 'https://ipapi.co' },
  { name: 'خطّ أميري', note: 'الخطّ القرآني للنصوص', url: 'https://www.amirifont.org' },
  { name: 'خطّ Ubuntu Arabic', note: 'خطّ الواجهة', url: 'https://design.ubuntu.com/font' },
];
