import { useEffect, useState, useCallback } from 'react';

export interface AppSettings {
  lat: number | null;
  lon: number | null;
  city: string;
  country: string;
  methodId: number;
  methodName: string;
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
}

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
