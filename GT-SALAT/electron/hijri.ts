/**
 * التقويم الهجري (أمّ القرى) عبر `Intl` — بلا تبعيات، تستعمله العملية الرئيسية
 * (تذكير الأيام البيض) والواجهة معاً، فيبقى الحساب واحداً في الطرفين.
 *
 * الأرقام هنا عددية دائماً؛ التنسيق النصّي بالأرقام المغربية 0-9 يتم عند العرض.
 */

export const HIJRI_MONTHS = [
  'محرَّم', 'صفر', 'ربيع الأوّل', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجّة',
];

export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export interface HijriParts {
  day: number;
  month: number;   // 1..12
  year: number;
}

/**
 * التاريخ الهجري بتقويم أمّ القرى مع إزاحةٍ بالأيام لتصحيح فرق المنطقة/الرؤية.
 * تُطبَّق الإزاحة على مكوّنات التاريخ الميلادي قبل التحويل — أسلمُ من التلاعب برقم اليوم
 * الهجري (لا يتجاوز نهاية الشهر خطأً) ولا يفسدها التوقيت الصيفي.
 */
export function hijriParts(date: Date, offset = 0): HijriParts | null {
  try {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    // نُمرّر منتصف اليوم بتوقيت UTC كي لا ينزلق اليوم بسبب المنطقة الزمنية.
    const utcNoon = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    const parts = fmt.formatToParts(utcNoon);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '', 10);
    const day = get('day');
    const month = get('month');
    const year = get('year');
    if (!day || !month || !year) return null;
    return { day, month, year };
  } catch {
    return null;
  }
}

/** «18 صفر 1448 هـ» — مع اسم اليوم اختيارياً. */
export function formatHijri(date: Date, offset = 0, withWeekday = false): string {
  const h = hijriParts(date, offset);
  if (!h) return '';
  const wd = withWeekday ? `${WEEKDAYS_AR[date.getDay()]} ` : '';
  return `${wd}${h.day} ${HIJRI_MONTHS[h.month - 1] ?? ''} ${h.year} هـ`;
}

/** هل هذا اليوم من الأيام البيض (13/14/15 هجرياً)؟ */
export function isWhiteDay(date: Date, offset = 0): boolean {
  const h = hijriParts(date, offset);
  return !!h && h.day >= 13 && h.day <= 15;
}

/** هل نحن في رمضان؟ */
export function isRamadan(date: Date, offset = 0): boolean {
  return hijriParts(date, offset)?.month === 9;
}

/** يوم رمضان (1..30)، أو 0 إن لم نكن فيه. */
export function ramadanDay(date: Date, offset = 0): number {
  const h = hijriParts(date, offset);
  return h && h.month === 9 ? h.day : 0;
}

/**
 * النطاق الميلادي لرمضان (الحالي إن كنّا فيه، وإلا القادم) — لبناء الإمساكية.
 * يُبحَث يوماً بيوم انطلاقاً من اليوم، وهو أضبط من الحساب الحسابي لأنه يتّبع تحويل Intl نفسه.
 */
export function ramadanRange(from: Date = new Date(), offset = 0): { start: Date; end: Date } | null {
  const startOfDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // إن كنّا داخل رمضان نرجع إلى أوّله؛ وإلا نتقدّم حتى نبلغه (سنةٌ قمرية على الأكثر).
  const today = hijriParts(startOfDay, offset);
  if (!today) return null;

  let cursor = new Date(startOfDay);
  if (today.month === 9) {
    cursor = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() - (today.day - 1));
  } else {
    let found = false;
    for (let i = 0; i <= 366; i++) {
      const probe = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() + i);
      const h = hijriParts(probe, offset);
      if (h && h.month === 9 && h.day === 1) {
        cursor = probe;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  // نهاية الشهر: آخر يومٍ ما زال في رمضان (29 أو 30).
  let end = new Date(cursor);
  for (let i = 1; i <= 30; i++) {
    const probe = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
    if (hijriParts(probe, offset)?.month !== 9) break;
    end = probe;
  }
  return { start: cursor, end };
}
