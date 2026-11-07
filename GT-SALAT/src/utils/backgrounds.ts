/**
 * خلفيّات لوحة التحكّم — نظير `domain/HomeBackgrounds.kt` في الهاتف (المعرّفات والعناوين نفسها،
 * فتنتقل في النسخ الاحتياطيّ). الصور أفقيّة 1920×1080 تُولَّد من أصول الهاتف بـ`tools/prepare_backgrounds.sh`.
 */
const FULL = import.meta.glob('../assets/backgrounds/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const THUMB = import.meta.glob('../assets/backgrounds/thumb/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

export const DEFAULT_BG = 'hassan';
export const CUSTOM_BG = 'custom';

export interface HomeBackground {
  id: string;
  title: string;
  place: string;
}

export const HOME_BACKGROUNDS: HomeBackground[] = [
  { id: DEFAULT_BG, title: 'مسجد حسّان', place: 'الرباط · يتبع الوضع الداكن والفاتح' },
  { id: 'haram', title: 'المسجد الحرام', place: 'مكّة المكرّمة' },
  { id: 'nabawi', title: 'المسجد النبويّ', place: 'المدينة المنوّرة' },
  { id: 'aqsa', title: 'قبّة الصخرة', place: 'المسجد الأقصى المبارك' },
  { id: 'hassan2_sea', title: 'مسجد الحسن الثاني', place: 'الدار البيضاء' },
  { id: 'hassan2_sunset', title: 'مسجد الحسن الثاني عند الغروب', place: 'الدار البيضاء' },
  { id: 'hassan_day', title: 'مسجد حسّان نهاراً', place: 'الرباط' },
  { id: 'hassan_night', title: 'مسجد حسّان ليلاً', place: 'الرباط' },
  { id: 'qarawiyyin', title: 'جامع القرويّين', place: 'فاس' },
];

/** الملفّ الفعليّ: الافتراضيّ نهاريٌّ في الفاتح وليليٌّ في الداكن، والمجهول يسقط إلى الافتراضيّ. */
export function resolveBackground(id: string, dark: boolean): string {
  if (id === DEFAULT_BG || !HOME_BACKGROUNDS.some((b) => b.id === id)) return dark ? 'hassan_night' : 'hassan_day';
  return id;
}

export function backgroundUrl(file: string): string {
  return FULL[`../assets/backgrounds/${file}.webp`] ?? '';
}

export function backgroundThumb(id: string, dark: boolean): string {
  return THUMB[`../assets/backgrounds/thumb/${resolveBackground(id, dark)}.webp`] ?? '';
}

/**
 * غشاوةٌ فوق الصورة بحسب درجة الظهور (هادئة/متوازنة/واضحة) — تحفظ وضوح النصوص المكتوبة
 * على الخلفيّة مباشرةً (العناوين)؛ والبطاقات فوقها زجاجٌ بخلفيّته الخاصّة.
 */
export function scrimAlpha(level: number, dark: boolean): number {
  const l = Math.max(0, Math.min(2, level));
  return dark ? [0.62, 0.48, 0.34][l] : [0.7, 0.58, 0.45][l];
}
