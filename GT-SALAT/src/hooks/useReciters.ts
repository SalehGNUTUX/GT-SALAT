import { useMemo } from 'react';
import type { QuranMeta, Reciter, SurahReciter } from '@electron/types';
import type { AppSettings } from './useSettings';

/**
 * مصادر التلاوة بعد تطبيق تعديلات المستخدم — **مصدرٌ واحدٌ للقسمين** («القرآن النصّيّ»
 * و«القرآن المسموع»)، فلا يرى أحدهما قارئاً لا يراه الآخر.
 *
 * **قاعدة (نفس مبدأ الإذاعات):** `resources/content/quran_meta.json` **لا يُعدَّل أبداً** —
 * تعديلات المستخدم طبقةٌ فوقه في الإعدادات مفتاحها **معرّف القارئ الأصلي** (لا اسمه، فلا
 * تنكسر بتغيير الاسم). هكذا تُحدَّث القائمة الافتراضية مع التطبيق دون ضياع تعديلاته،
 * ويمكنه استعادة الأصل متى شاء.
 *
 * وفائدته العمليّة: حين يتعطّل مصدرٌ (يتغيّر مجلّد everyayah أو خادم mp3quran) يصلحه
 * المستخدم بنفسه دون انتظار تحديثٍ للتطبيق.
 */
export interface RecitersView {
  ayah: Reciter[];
  surah: SurahReciter[];
  /** أصولٌ بلا تعديل — لمعرفة ما إذا كان القارئ معدَّلاً وما القيمة التي تُستعاد إليها. */
  ayahOriginal: Map<string, Reciter>;
  surahOriginal: Map<string, SurahReciter>;
}

export function useReciters(meta: QuranMeta | null, settings: AppSettings): RecitersView {
  return useMemo(() => {
    const ayahEdits = settings.reciterEdits ?? {};
    const surahEdits = settings.surahReciterEdits ?? {};
    const baseAyah = (meta?.reciters ?? []).filter((r) => r.everyayah);
    const baseSurah = meta?.surahReciters ?? [];

    const ayahOriginal = new Map(baseAyah.map((r) => [r.id, r]));
    const surahOriginal = new Map(baseSurah.map((r) => [r.id, r]));

    return {
      ayah: [
        ...baseAyah.map((r) => ({ ...r, ...(ayahEdits[r.id] ?? {}), id: r.id })),
        ...(settings.customReciters ?? []),
      ],
      surah: [
        ...baseSurah.map((r) => ({ ...r, ...(surahEdits[r.id] ?? {}), id: r.id })),
        ...(settings.customSurahReciters ?? []),
      ],
      ayahOriginal,
      surahOriginal,
    };
  }, [
    meta,
    settings.reciterEdits,
    settings.customReciters,
    settings.surahReciterEdits,
    settings.customSurahReciters,
  ]);
}

/** معرّفٌ للقارئ المضاف — بادئةٌ تميّزه عن الافتراضي فلا يُخلَط به عند الحذف والاستعادة. */
export function newReciterId(): string {
  return `custom_${Date.now().toString(36)}`;
}

export function isCustomReciter(id: string): boolean {
  return id.startsWith('custom_');
}

export function riwayaLabel(r: string | undefined): string {
  if (r === 'warsh') return 'ورش';
  if (r === 'qalun') return 'قالون';
  if (r === 'duri') return 'الدوري';
  return 'حفص';
}
