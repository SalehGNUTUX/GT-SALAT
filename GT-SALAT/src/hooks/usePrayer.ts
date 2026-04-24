import { useEffect, useState } from 'react';

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

export function useNextPrayer(tickMs = 1000): NextPrayerInfo | null {
  const [info, setInfo] = useState<NextPrayerInfo | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchIt = async () => {
      const next = await window.gtSalat.prayer.next();
      if (mounted) setInfo(next);
    };
    fetchIt();
    const t = setInterval(fetchIt, tickMs);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [tickMs]);
  return info;
}

export function useTodayTimetable(): DayTimetable | null {
  const [today, setToday] = useState<DayTimetable | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const t = await window.gtSalat.prayer.today();
      if (mounted) setToday(t);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);
  return today;
}
