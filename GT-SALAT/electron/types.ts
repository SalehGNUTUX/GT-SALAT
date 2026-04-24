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

export interface PrayerTime {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  name: string;
  time: string;
  date: string;
  timestamp: number;
}

export interface DayTimetable {
  date: string;
  hijri?: string;
  prayers: PrayerTime[];
}

export interface NextPrayerInfo {
  prayer: PrayerTime;
  remainingMs: number;
  remainingText: string;
}

export interface CalculationMethod {
  id: number;
  nameEn: string;
  nameAr: string;
}

export interface NotificationLogEntry {
  id: string;
  timestamp: number;
  type: 'salat' | 'approaching' | 'zikr' | 'system';
  title: string;
  body: string;
}

export type ShellName = 'bash' | 'zsh' | 'fish';
