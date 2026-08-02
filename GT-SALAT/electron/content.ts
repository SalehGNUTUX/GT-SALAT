/**
 * المحتوى الإسلامي المرجعي من `resources/content/*.json`.
 *
 * الملفات نفسها المستعملة في نسخة الهاتف (GT-SALAT-PHONE) بلا تعديل، كي تبقى النسختان
 * متطابقتَي المحتوى ويكفي نسخُها عند تحديث أيٍّ منهما. تُقرأ كسولاً وتُخزَّن في الذاكرة مرة واحدة.
 *
 * تنبيه: `tafsir.json` نحو 4 ميغابايت (6236 آية) — لا يُرسَل كاملاً عبر IPC أبداً؛
 * تُرسَل سورةٌ واحدةٌ أو فهرسٌ خفيفٌ فقط.
 */
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type {
  AsmaName,
  AyahHit,
  DailyAyah,
  DuaCategory,
  HadithCollection,
  HikamCategory,
  Hikmah,
  HisnCategory,
  HisnCategoryInfo,
  HistoryEvent,
  QuranMeta,
  Radio,
  SessionDhikr,
  TafsirSurah,
  TafsirSurahInfo,
} from './types.js';

function contentDir(): string {
  // تطوير: resources/content داخل المشروع. إنتاج: process.resourcesPath/content.
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources');
  return path.join(base, 'content');
}

const cache = new Map<string, unknown>();

function load<T>(file: string): T | null {
  if (cache.has(file)) return cache.get(file) as T;
  try {
    const p = path.join(contentDir(), file);
    if (!fs.existsSync(p)) {
      console.error(`[content] ملف مفقود: ${p}`);
      cache.set(file, null);
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
    cache.set(file, parsed);
    return parsed;
  } catch (err) {
    console.error(`[content] تعذّر قراءة ${file}:`, err);
    cache.set(file, null);
    return null;
  }
}

// ── أسماء الله الحسنى ──────────────────────────────────
export function getAsma(): AsmaName[] {
  return load<{ items: AsmaName[] }>('asma.json')?.items ?? [];
}

// ── الأحاديث ───────────────────────────────────────────
export function getHadithCollections(): HadithCollection[] {
  return load<{ collections: HadithCollection[] }>('hadith.json')?.collections ?? [];
}

// ── الأدعية المأثورة ───────────────────────────────────
export function getDuas(): DuaCategory[] {
  return load<{ categories: DuaCategory[] }>('duas.json')?.categories ?? [];
}

// ── الحِكَم والمواعظ ───────────────────────────────────
export function getHikamCategories(): HikamCategory[] {
  return load<{ categories: HikamCategory[] }>('hikam.json')?.categories ?? [];
}

function allHikam(): Hikmah[] {
  return getHikamCategories().flatMap((c) => c.items ?? []);
}

/** حكمةٌ ثابتةٌ لليوم (نفسها طوال اليوم)، أو عشوائيةٌ عند التجديد. */
export function getHikmah(seed: number): Hikmah | null {
  const all = allHikam();
  if (all.length === 0) return null;
  return all[((seed % all.length) + all.length) % all.length];
}

// ── حصن المسلم ─────────────────────────────────────────
function hisnCategories(): HisnCategory[] {
  return load<{ categories: HisnCategory[] }>('hisn.json')?.categories ?? [];
}

/** فهرسٌ خفيف: الأبواب بلا أذكارها (139 كيلوبايت تصير بضعة كيلوبايتات). */
export function getHisnIndex(): HisnCategoryInfo[] {
  return hisnCategories().map(({ items, ...info }) => ({
    ...info,
    count: info.count || items?.length || 0,
  }));
}

export function getHisnCategory(id: number): HisnCategory | null {
  return hisnCategories().find((c) => c.id === id) ?? null;
}

/** بحثٌ في كامل أذكار حصن المسلم — يعيد الأبواب المطابقة مع أذكارها المطابقة فقط. */
export function searchHisn(query: string): HisnCategory[] {
  const q = normalizeArabic(query);
  if (!q) return [];
  const out: HisnCategory[] = [];
  for (const cat of hisnCategories()) {
    if (normalizeArabic(cat.name).includes(q)) {
      out.push(cat);
      continue;
    }
    const items = (cat.items ?? []).filter((d) => normalizeArabic(d.text).includes(q));
    if (items.length > 0) out.push({ ...cat, items });
  }
  return out;
}

// ── التفسير الميسّر والقرآن النصّي ─────────────────────
function tafsirSurahs(): TafsirSurah[] {
  return load<{ surahs: TafsirSurah[] }>('tafsir.json')?.surahs ?? [];
}

/** فهرسٌ خفيف: السور بلا آياتها (لا يمرّ 4 ميغابايت عبر IPC). */
export function getTafsirIndex(): TafsirSurahInfo[] {
  return tafsirSurahs().map(({ ayahs, ...info }) => ({
    ...info,
    count: info.count || ayahs?.length || 0,
  }));
}

export function getTafsirSurah(n: number): TafsirSurah | null {
  return tafsirSurahs().find((s) => s.n === n) ?? null;
}

export function getQuranMeta(): QuranMeta {
  return load<QuranMeta>('quran_meta.json') ?? {};
}

/**
 * تطبيعٌ عربيٌّ للبحث: إزالة التشكيل والتطويل، وتوحيد الألف والياء والتاء المربوطة والهمزات —
 * فيطابق «الرحمن» ما رُسم «ٱلرَّحْمَٰن»، و«انا» ما رُسم «إنَّا».
 */
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g;

export function normalizeArabic(s: string): string {
  return (s || '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .trim()
    .toLowerCase();
}

/** بحثٌ شاملٌ عبر 6236 آية. `limit` يحدّ النتائج كي لا يثقل العرض. */
export function searchAyat(query: string, limit = 200): AyahHit[] {
  const q = normalizeArabic(query);
  if (q.length < 2) return [];
  const hits: AyahHit[] = [];
  for (const surah of tafsirSurahs()) {
    for (const a of surah.ayahs ?? []) {
      if (normalizeArabic(a.text).includes(q)) {
        hits.push({ surah: surah.n, surahName: surah.name, ayah: a.n, text: a.text });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

/** نصّ آيةٍ بعينها (لبطاقة الإشارات المرجعية). */
export function getAyah(surah: number, ayah: number): AyahHit | null {
  const s = tafsirSurahs().find((x) => x.n === surah);
  const a = s?.ayahs?.find((x) => x.n === ayah);
  if (!s || !a) return null;
  return { surah: s.n, surahName: s.name, ayah: a.n, text: a.text };
}

// ── آية اليوم ──────────────────────────────────────────
export function getDailyAyah(seed: number): DailyAyah | null {
  const all = load<{ items: DailyAyah[] }>('daily_ayat.json')?.items ?? [];
  if (all.length === 0) return null;
  return all[((seed % all.length) + all.length) % all.length];
}

// ── الأحداث التاريخية ──────────────────────────────────
export function getEvents(): HistoryEvent[] {
  const all = load<{ events: HistoryEvent[] }>('events.json')?.events ?? [];
  return [...all].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/** الأحداث التي تصادف يوماً هجرياً بعينه (شهر/يوم)، إن وُجدت. */
export function getEventsToday(hMonth: number, hDay: number): HistoryEvent[] {
  if (!hDay || !hMonth) return [];
  return getEvents().filter((e) => e.hMonth === hMonth && e.hDay === hDay);
}

// ── الإذاعات ───────────────────────────────────────────
export function getRadios(): Radio[] {
  return load<{ radios: Radio[] }>('radios.json')?.radios ?? [];
}

// ── أذكار الصباح والمساء ───────────────────────────────
export function getSessionAdhkar(type: 'morning' | 'evening'): SessionDhikr[] {
  const file = load<{ morning: SessionDhikr[]; evening: SessionDhikr[] }>('adhkar_me.json');
  if (!file) return [];
  return type === 'evening' ? file.evening : file.morning;
}
