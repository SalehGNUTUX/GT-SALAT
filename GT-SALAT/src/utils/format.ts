import type { MonthScheme } from '@electron/types';

/**
 * تنسيق التواريخ والأوقات للواجهة.
 *
 * حساب التاريخ الهجري نفسه في `@electron/hijri` — وحدةٌ بلا تبعيات تشترك فيها العملية
 * الرئيسية (تذكير الأيام البيض) والواجهة، فلا يتفرّق الحساب بين الطرفين.
 *
 * قاعدة ثابتة في المشروع: الأرقام العربية المغربية 0-9 حصراً، لا المشرقية ٠-٩.
 * لذلك تُبنى النصوص يدوياً أو تُجبَر Intl على `nu-latn`.
 */
export {
  HIJRI_MONTHS,
  WEEKDAYS_AR,
  hijriParts,
  formatHijri,
  isWhiteDay,
  isRamadan,
  ramadanDay,
  ramadanRange,
  type HijriParts,
} from '@electron/hijri';

import { WEEKDAYS_AR } from '@electron/hijri';

// القياسي (مصر والخليج ومعظم الإعلام)
const MONTHS_STANDARD = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
// المغرب العربي
const MONTHS_MAGHREB = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
];
// بلاد الشام والعراق
const MONTHS_LEVANT = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيّار', 'حزيران',
  'تمّوز', 'آب', 'أيلول', 'تشرين الأوّل', 'تشرين الثاني', 'كانون الأوّل',
];

const MAGHREB_COUNTRIES = ['morocco', 'maroc', 'المغرب', 'algeria', 'الجزائر', 'tunisia', 'تونس', 'libya', 'ليبيا', 'mauritania', 'موريتانيا'];
const LEVANT_COUNTRIES = ['syria', 'سوريا', 'سورية', 'lebanon', 'لبنان', 'iraq', 'العراق', 'jordan', 'الأردن', 'الاردن', 'palestine', 'فلسطين'];

/** استنتاج مخطّط الأشهر من اسم الدولة المكتشَفة. */
export function schemeForCountry(country: string): Exclude<MonthScheme, 'auto'> {
  const c = (country || '').trim().toLowerCase();
  if (MAGHREB_COUNTRIES.some((x) => c.includes(x))) return 'maghreb';
  if (LEVANT_COUNTRIES.some((x) => c.includes(x))) return 'levant';
  return 'standard';
}

/** المخطّط الفعلي: «تلقائي» يُشتقّ من الدولة، وغيره كما اختاره المستخدم. */
export function effectiveScheme(scheme: MonthScheme, country: string): Exclude<MonthScheme, 'auto'> {
  return scheme === 'auto' ? schemeForCountry(country) : scheme;
}

export function gregorianMonths(scheme: MonthScheme, country = ''): string[] {
  switch (effectiveScheme(scheme, country)) {
    case 'maghreb': return MONTHS_MAGHREB;
    case 'levant': return MONTHS_LEVANT;
    default: return MONTHS_STANDARD;
  }
}

/** اسم شهر ميلادي (1..12) وفق المخطّط. */
export function gregorianMonthName(month: number, scheme: MonthScheme, country = ''): string {
  return gregorianMonths(scheme, country)[month - 1] ?? '';
}

/** «السبت 1 غشت 2026» */
export function formatGregorian(date: Date, scheme: MonthScheme, country = '', withWeekday = true): string {
  const wd = withWeekday ? `${WEEKDAYS_AR[date.getDay()]} ` : '';
  return `${wd}${date.getDate()} ${gregorianMonthName(date.getMonth() + 1, scheme, country)} ${date.getFullYear()}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * تنسيق وقتٍ بصيغة "HH:MM" (كما يأتي من الجداول) وفق نظام 12/24 ساعة.
 * العرض فقط — لا يمسّ التخزين.
 */
export function formatClock(hhmm: string, clock24h = true): string {
  if (clock24h) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? '00'} ${suffix}`;
}

/** ساعة الحائط الحيّة (بالثواني) وفق نظام 12/24. */
export function formatClockNow(date: Date, clock24h = true): string {
  if (clock24h) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }
  const h = date.getHours();
  const suffix = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())} ${suffix}`;
}

/** ساعةٌ مجرّدة (لعرض مواعيد التذكيرات). */
export function formatHour(hour: number, clock24h = true): string {
  if (clock24h) return `${pad2(hour)}:00`;
  const suffix = hour < 12 ? 'ص' : 'م';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${suffix}`;
}
