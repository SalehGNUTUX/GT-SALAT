import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import {
  Coordinates,
  CalculationMethod as AdhanMethod,
  PrayerTimes,
  Madhab,
} from 'adhan';
import type {
  PrayerTime,
  DayTimetable,
  NextPrayerInfo,
  CalculationMethod,
} from './types.js';
import { getSettings } from './settings.js';

const PRAYER_NAMES_AR: Record<PrayerTime['id'], string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 1, nameEn: 'University of Islamic Sciences, Karachi', nameAr: 'جامعة العلوم الإسلامية، كراتشي' },
  { id: 2, nameEn: 'Islamic Society of North America (ISNA)', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { id: 3, nameEn: 'Muslim World League', nameAr: 'رابطة العالم الإسلامي' },
  { id: 4, nameEn: 'Umm Al-Qura University, Makkah', nameAr: 'جامعة أم القرى، مكة' },
  { id: 5, nameEn: 'Egyptian General Authority of Survey', nameAr: 'الهيئة العامة المصرية للمساحة' },
  { id: 7, nameEn: 'Institute of Geophysics, University of Tehran', nameAr: 'معهد الجيوفيزياء، جامعة طهران' },
  { id: 8, nameEn: 'Gulf Region', nameAr: 'الخليج' },
  { id: 9, nameEn: 'Kuwait', nameAr: 'الكويت' },
  { id: 10, nameEn: 'Qatar', nameAr: 'قطر' },
  { id: 11, nameEn: 'Majlis Ugama Islam Singapura, Singapore', nameAr: 'سنغافورة' },
  { id: 12, nameEn: 'Union Organization Islamic de France', nameAr: 'اتحاد المنظمات الإسلامية بفرنسا' },
  { id: 13, nameEn: 'Diyanet İşleri Başkanlığı, Turkey', nameAr: 'رئاسة الشؤون الدينية، تركيا' },
  { id: 14, nameEn: 'Spiritual Administration of Muslims of Russia', nameAr: 'الإدارة الدينية لمسلمي روسيا' },
  { id: 15, nameEn: 'Moonsighting Committee Worldwide', nameAr: 'لجنة رؤية الهلال العالمية' },
  { id: 16, nameEn: 'Dubai (experimental)', nameAr: 'دبي (تجريبي)' },
  { id: 17, nameEn: 'Jabatan Kemajuan Islam Malaysia (JAKIM)', nameAr: 'ماليزيا (JAKIM)' },
  { id: 18, nameEn: 'Tunisia', nameAr: 'تونس' },
  { id: 19, nameEn: 'Algeria', nameAr: 'الجزائر' },
  { id: 20, nameEn: 'KEMENAG - Kementerian Agama Republik Indonesia', nameAr: 'وزارة الشؤون الدينية، إندونيسيا' },
  { id: 21, nameEn: 'Morocco', nameAr: 'المغرب' },
  { id: 22, nameEn: 'Comunidade Islamica de Lisboa', nameAr: 'الجالية الإسلامية، لشبونة' },
];

export function suggestMethodByCountry(country: string): number {
  const lc = (country || '').toLowerCase();
  if (/morocco|maroc|المغرب/.test(lc)) return 21;
  if (/algeria|algérie|الجزائر/.test(lc)) return 19;
  if (/tunisia|tunisie|تونس/.test(lc)) return 18;
  if (/egypt|egypte|مصر/.test(lc)) return 5;
  if (/saudi|السعودية|مكة|مدينة/.test(lc)) return 4;
  if (/kuwait|الكويت/.test(lc)) return 9;
  if (/qatar|قطر/.test(lc)) return 10;
  if (/emirates|uae|الإمارات|دبي/.test(lc)) return 8;
  if (/bahrain|البحرين|oman|عُمان/.test(lc)) return 8;
  if (/turkey|türkiye|تركيا/.test(lc)) return 13;
  if (/malaysia|ماليزيا/.test(lc)) return 17;
  if (/indonesia|إندونيسيا/.test(lc)) return 20;
  if (/france|فرنسا/.test(lc)) return 12;
  if (/united states|canada|أمريكا/.test(lc)) return 2;
  if (/singapore|سنغافورة/.test(lc)) return 11;
  if (/russia|روسيا/.test(lc)) return 14;
  if (/iran|إيران/.test(lc)) return 7;
  return 3;
}

function cacheDir(): string {
  const dir = path.join(app.getPath('userData'), 'timetables');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cacheFile(year: number, month: number, methodId: number): string {
  return path.join(cacheDir(), `timetable_${year}_${String(month).padStart(2, '0')}_m${methodId}.json`);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function methodToAdhan(id: number) {
  switch (id) {
    case 1: return AdhanMethod.Karachi();
    case 2: return AdhanMethod.NorthAmerica();
    case 3: return AdhanMethod.MuslimWorldLeague();
    case 4: return AdhanMethod.UmmAlQura();
    case 5: return AdhanMethod.Egyptian();
    case 8: return AdhanMethod.Dubai();
    case 9: return AdhanMethod.Kuwait();
    case 10: return AdhanMethod.Qatar();
    case 11: return AdhanMethod.Singapore();
    case 12: return AdhanMethod.MoonsightingCommittee();
    case 13: return AdhanMethod.Turkey();
    case 15: return AdhanMethod.MoonsightingCommittee();
    case 16: return AdhanMethod.Dubai();
    default: return AdhanMethod.MuslimWorldLeague();
  }
}

/**
 * حساب محلي كامل للمواقيت باستخدام مكتبة adhan. يعمل offline بدون API.
 */
export function computeLocal(date: Date, lat: number, lon: number, methodId: number): DayTimetable {
  const coords = new Coordinates(lat, lon);
  const params = methodToAdhan(methodId);
  params.madhab = Madhab.Shafi;
  const pt = new PrayerTimes(coords, date, params);

  const prayers: PrayerTime[] = [
    { id: 'fajr', name: PRAYER_NAMES_AR.fajr, time: formatTime(pt.fajr), date: formatDate(pt.fajr), timestamp: pt.fajr.getTime() },
    { id: 'sunrise', name: PRAYER_NAMES_AR.sunrise, time: formatTime(pt.sunrise), date: formatDate(pt.sunrise), timestamp: pt.sunrise.getTime() },
    { id: 'dhuhr', name: PRAYER_NAMES_AR.dhuhr, time: formatTime(pt.dhuhr), date: formatDate(pt.dhuhr), timestamp: pt.dhuhr.getTime() },
    { id: 'asr', name: PRAYER_NAMES_AR.asr, time: formatTime(pt.asr), date: formatDate(pt.asr), timestamp: pt.asr.getTime() },
    { id: 'maghrib', name: PRAYER_NAMES_AR.maghrib, time: formatTime(pt.maghrib), date: formatDate(pt.maghrib), timestamp: pt.maghrib.getTime() },
    { id: 'isha', name: PRAYER_NAMES_AR.isha, time: formatTime(pt.isha), date: formatDate(pt.isha), timestamp: pt.isha.getTime() },
  ];

  return { date: formatDate(date), prayers };
}

/**
 * جلب الجدول الشهري من AlAdhan API، ويخزّنه محلياً للعمل بدون إنترنت.
 */
export async function fetchMonthlyFromApi(year: number, month: number, lat: number, lon: number, methodId: number): Promise<DayTimetable[] | null> {
  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=${methodId}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json() as { data: any[] };
    if (!Array.isArray(json.data)) return null;

    const timetable: DayTimetable[] = json.data.map((day) => {
      const d = day.date.gregorian.date.split('-'); // DD-MM-YYYY
      const dateStr = `${d[2]}-${d[1]}-${d[0]}`;
      const hijriWeekday = (day.date.hijri.weekday?.ar ?? '') as string;
      const hijri = `${hijriWeekday ? hijriWeekday + ' ' : ''}${day.date.hijri.day} ${day.date.hijri.month.ar} ${day.date.hijri.year} هـ`.trim();
      const makeTime = (key: string): PrayerTime => {
        const raw = (day.timings[key] as string).split(' ')[0]; // "05:12 (GMT+1)"
        const [hh, mm] = raw.split(':').map((x: string) => parseInt(x, 10));
        const dateObj = new Date(parseInt(d[2]), parseInt(d[1]) - 1, parseInt(d[0]), hh, mm);
        return {
          id: key.toLowerCase() as PrayerTime['id'],
          name: PRAYER_NAMES_AR[key.toLowerCase() as PrayerTime['id']] ?? key,
          time: `${pad2(hh)}:${pad2(mm)}`,
          date: dateStr,
          timestamp: dateObj.getTime(),
        };
      };
      return {
        date: dateStr,
        hijri,
        prayers: [
          makeTime('Fajr'),
          makeTime('Sunrise'),
          makeTime('Dhuhr'),
          makeTime('Asr'),
          makeTime('Maghrib'),
          makeTime('Isha'),
        ],
      };
    });

    fs.writeFileSync(cacheFile(year, month, methodId), JSON.stringify(timetable, null, 2), 'utf-8');
    return timetable;
  } catch {
    return null;
  }
}

/**
 * يعيد جدول شهر كامل: يجرّب الكاش أولاً، ثم API، ثم الحساب المحلي.
 */
export async function getMonthTimetable(year: number, month: number): Promise<DayTimetable[]> {
  const s = getSettings();
  if (s.lat == null || s.lon == null) {
    return [];
  }

  const file = cacheFile(year, month, s.methodId);
  if (fs.existsSync(file)) {
    try {
      const stat = fs.statSync(file);
      const ageDays = (Date.now() - stat.mtimeMs) / 86_400_000;
      if (ageDays < 7) {
        return JSON.parse(fs.readFileSync(file, 'utf-8')) as DayTimetable[];
      }
    } catch {}
  }

  const api = await fetchMonthlyFromApi(year, month, s.lat, s.lon, s.methodId);
  if (api) return api;

  // fallback: حساب محلي لكل أيام الشهر
  const daysInMonth = new Date(year, month, 0).getDate();
  const local: DayTimetable[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    local.push(computeLocal(date, s.lat, s.lon, s.methodId));
  }
  return local;
}

export async function getTodayTimetable(): Promise<DayTimetable | null> {
  const s = getSettings();
  if (s.lat == null || s.lon == null) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dateStr = formatDate(now);

  const month_data = await getMonthTimetable(year, month);
  const today = month_data.find((d) => d.date === dateStr);
  if (today) return today;

  return computeLocal(now, s.lat, s.lon, s.methodId);
}

export async function getNextPrayer(): Promise<NextPrayerInfo | null> {
  const today = await getTodayTimetable();
  if (!today) return null;

  const now = Date.now();
  // نتجاهل الشروق من الـ "next prayer" الفعلي لكن نحتفظ به في الجدول
  const real = today.prayers.filter((p) => p.id !== 'sunrise');
  const upcoming = real.find((p) => p.timestamp > now);

  let prayer: PrayerTime;
  if (upcoming) {
    prayer = upcoming;
  } else {
    // بعد العشاء → فجر الغد
    const tomorrow = new Date(Date.now() + 86_400_000);
    const s = getSettings();
    if (s.lat == null || s.lon == null) return null;
    const t = computeLocal(tomorrow, s.lat, s.lon, s.methodId);
    prayer = t.prayers.find((p) => p.id === 'fajr')!;
  }

  const remainingMs = prayer.timestamp - now;
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  const s = Math.floor((remainingMs % 60_000) / 1000);
  const remainingText = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

  return { prayer, remainingMs, remainingText };
}

/**
 * اكتشاف الموقع الجغرافي من IP.
 */
export async function autoDetectLocation(): Promise<{ lat: number; lon: number; city: string; country: string; suggestedMethodId: number } | null> {
  const endpoints = [
    { url: 'https://ipapi.co/json/', map: (j: any) => ({ lat: j.latitude, lon: j.longitude, city: j.city, country: j.country_name }) },
    { url: 'http://ip-api.com/json/?fields=status,city,country,lat,lon,query', map: (j: any) => ({ lat: j.lat, lon: j.lon, city: j.city, country: j.country }) },
  ];
  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(ep.url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const j = await res.json();
      const mapped = ep.map(j);
      if (typeof mapped.lat === 'number' && typeof mapped.lon === 'number') {
        return { ...mapped, suggestedMethodId: suggestMethodByCountry(mapped.country) };
      }
    } catch {}
  }
  return null;
}

export async function prefetchUpcomingMonths(): Promise<void> {
  const now = new Date();
  const s = getSettings();
  if (s.lat == null || s.lon == null) return;
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    await getMonthTimetable(d.getFullYear(), d.getMonth() + 1);
  }
}

export function countCachedMonths(): number {
  try {
    return fs.readdirSync(cacheDir()).filter((f) => f.startsWith('timetable_') && f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}
