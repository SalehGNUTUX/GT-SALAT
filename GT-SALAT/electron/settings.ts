import Store from 'electron-store';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import type { AppSettings } from './types.js';

export const DEFAULT_SETTINGS: AppSettings = {
  lat: null,
  lon: null,
  city: '',
  country: '',
  methodId: 3,
  methodName: 'Muslim World League',
  preNotifyMinutes: 15,
  zikrIntervalMinutes: 30,
  adhanType: 'full',
  enableSalatNotify: true,
  enableZikrNotify: true,
  systemSalatNotify: true,
  systemZikrNotify: true,
  terminalSalatNotify: false,
  terminalZikrNotify: false,
  terminalShells: [],
  autoUpdateTimetables: true,
  autoStart: true,
  minimizeToTray: true,
  startMinimized: false,
  theme: 'dark',
  doNotDisturb: false,
  setupCompleted: false,
  enableDuaAfterAdhan: false,
  enablePostPrayerDhikr: false,
  postPrayerDhikrDelayMinutes: 20,
  customAdhanPath: '',
  useCustomAdhan: false,
};

const store = new Store<AppSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS,
  clearInvalidConfig: true,
});

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(store.store as AppSettings) };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const merged = { ...current, ...patch };
  store.set(merged as Record<string, unknown>);
  return merged;
}

export function resetSettings(): AppSettings {
  store.clear();
  return getSettings();
}

/**
 * استيراد الإعدادات القديمة من ~/.GT-salat-dikr/settings.conf إن وُجدت.
 * يتم مرة واحدة فقط عند أول تشغيل.
 */
export function importLegacySettings(): boolean {
  const legacyPath = path.join(os.homedir(), '.GT-salat-dikr', 'settings.conf');
  if (!fs.existsSync(legacyPath)) return false;

  try {
    const content = fs.readFileSync(legacyPath, 'utf-8');
    const kv: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (m) kv[m[1]] = m[2];
    }

    const patch: Partial<AppSettings> = {};
    if (kv.LAT) patch.lat = parseFloat(kv.LAT);
    if (kv.LON) patch.lon = parseFloat(kv.LON);
    if (kv.CITY) patch.city = kv.CITY;
    if (kv.COUNTRY) patch.country = kv.COUNTRY;
    if (kv.METHOD_ID) patch.methodId = parseInt(kv.METHOD_ID, 10);
    if (kv.METHOD_NAME) patch.methodName = kv.METHOD_NAME;
    if (kv.PRE_PRAYER_NOTIFY) patch.preNotifyMinutes = parseInt(kv.PRE_PRAYER_NOTIFY, 10);
    if (kv.ZIKR_NOTIFY_INTERVAL) patch.zikrIntervalMinutes = Math.round(parseInt(kv.ZIKR_NOTIFY_INTERVAL, 10) / 60);
    if (kv.ADHAN_TYPE === 'short' || kv.ADHAN_TYPE === 'full') patch.adhanType = kv.ADHAN_TYPE;
    if (kv.ENABLE_SALAT_NOTIFY) patch.enableSalatNotify = kv.ENABLE_SALAT_NOTIFY === '1';
    if (kv.ENABLE_ZIKR_NOTIFY) patch.enableZikrNotify = kv.ENABLE_ZIKR_NOTIFY === '1';
    if (kv.SYSTEM_SALAT_NOTIFY) patch.systemSalatNotify = kv.SYSTEM_SALAT_NOTIFY === '1';
    if (kv.SYSTEM_ZIKR_NOTIFY) patch.systemZikrNotify = kv.SYSTEM_ZIKR_NOTIFY === '1';
    if (kv.TERMINAL_SALAT_NOTIFY) patch.terminalSalatNotify = kv.TERMINAL_SALAT_NOTIFY === '1';
    if (kv.TERMINAL_ZIKR_NOTIFY) patch.terminalZikrNotify = kv.TERMINAL_ZIKR_NOTIFY === '1';

    patch.setupCompleted = !!(patch.lat && patch.lon);
    setSettings(patch);
    return true;
  } catch {
    return false;
  }
}

export function getStorePath(): string {
  return store.path;
}
