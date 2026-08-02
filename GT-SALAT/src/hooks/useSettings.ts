import { useEffect, useState, useCallback } from 'react';
import type { AppSettings } from '@electron/types';

/**
 * `AppSettings` مصدرها الوحيد `electron/types.ts` — استيراد أنواعٍ فقط، يُمحى وقت البناء
 * فلا تتسرّب شيفرة العملية الرئيسية إلى حزمة الواجهة. (كان يُكرَّر يدوياً هنا فتفرّق النسختان.)
 */
export type { AppSettings };

export function useSettings(): [AppSettings | null, (patch: Partial<AppSettings>) => Promise<void>] {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.gtSalat.settings.get().then(setSettings);
    const unsub = window.gtSalat.settings.onChange((s: AppSettings) => setSettings(s));
    return () => { unsub(); };
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const merged = await window.gtSalat.settings.set(patch);
    setSettings(merged);
  }, []);

  return [settings, update];
}
