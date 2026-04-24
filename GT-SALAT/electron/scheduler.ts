import { getNextPrayer, getTodayTimetable } from './prayer.js';
import { getSettings } from './settings.js';
import { getRandomDhikr } from './dhikr.js';
import { notify } from './notifier.js';
import * as audio from './audio.js';
import type { PrayerTime, NextPrayerInfo } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function writeTerminalStatus(next: NextPrayerInfo | null): void {
  try {
    const dir = path.join(os.homedir(), '.gt-salat');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const s = getSettings();
    const city = s.city || '';
    let content = '';
    if (next) {
      const tsSeconds = Math.floor(next.prayer.timestamp / 1000);
      content = `PRAYER_NAME="${next.prayer.name}"\nPRAYER_TIME="${next.prayer.time}"\nPRAYER_TS=${tsSeconds}\nCITY="${city}"\n`;
    }
    fs.writeFileSync(path.join(dir, 'status'), content, 'utf-8');
  } catch {}
}

let tickTimer: NodeJS.Timeout | null = null;
let zikrTimer: NodeJS.Timeout | null = null;
let announcedForPrayer = new Set<string>(); // مفاتيح "prayerId@timestamp"
let announcedApproaching = new Set<string>();

function resetDayIfNeeded(): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const key of [...announcedForPrayer]) {
    if (!key.endsWith(today)) announcedForPrayer.delete(key);
  }
  for (const key of [...announcedApproaching]) {
    if (!key.endsWith(today)) announcedApproaching.delete(key);
  }
}

async function tick(): Promise<void> {
  try {
    resetDayIfNeeded();
    const s = getSettings();

    // كتابة ملف الحالة للطرفية دائماً (حتى في وضع عدم الإزعاج)
    if (s.setupCompleted) {
      getNextPrayer().then(writeTerminalStatus).catch(() => {});
    }

    if (s.doNotDisturb || !s.enableSalatNotify || !s.setupCompleted) return;

    const today = await getTodayTimetable();
    if (!today) return;

    const now = Date.now();
    const dateStr = today.date;

    for (const p of today.prayers) {
      if (p.id === 'sunrise') continue;
      const diff = p.timestamp - now;
      const key = `${p.id}@${dateStr}`;

      // تنبيه الاقتراب (قبل X دقيقة)
      const approachKey = `approach-${key}`;
      const approachMs = s.preNotifyMinutes * 60_000;
      if (
        diff <= approachMs &&
        diff > approachMs - 60_000 &&
        !announcedApproaching.has(approachKey)
      ) {
        announcedApproaching.add(approachKey);
        announceApproaching(p, s.preNotifyMinutes);
      }

      // التنبيه عند دخول الوقت
      if (diff <= 0 && diff > -60_000 && !announcedForPrayer.has(key)) {
        announcedForPrayer.add(key);
        announcePrayer(p);
      }
    }
  } catch (err) {
    console.error('[scheduler] tick error:', err);
  }
}

function announceApproaching(p: PrayerTime, minutes: number): void {
  const s = getSettings();
  notify({
    type: 'approaching',
    title: `⏰ تبقى ${minutes} دقيقة على صلاة ${p.name}`,
    body: 'استعد للصلاة',
    urgent: false,
  });
  if (s.systemSalatNotify) audio.play('approaching');
}

function announcePrayer(p: PrayerTime): void {
  const s = getSettings();
  notify({
    type: 'salat',
    title: `🕌 حان الآن وقت صلاة ${p.name}`,
    body: 'الله أكبر',
    urgent: true,
  });

  if (s.systemSalatNotify) {
    const afterAdhan = () => {
      const cur = getSettings();
      if (!cur.doNotDisturb && cur.enableDuaAfterAdhan) {
        audio.play('dua_after_adhan');
      }
    };
    const useCustom = s.useCustomAdhan && !!s.customAdhanPath;
    if (useCustom) {
      s.enableDuaAfterAdhan ? audio.playFile(s.customAdhanPath, afterAdhan) : audio.playFile(s.customAdhanPath);
    } else {
      s.enableDuaAfterAdhan ? audio.play(s.adhanType, afterAdhan) : audio.play(s.adhanType);
    }
  }

  if (s.enablePostPrayerDhikr) {
    const delayMs = Math.max(s.postPrayerDhikrDelayMinutes, 1) * 60_000;
    setTimeout(() => {
      const cur = getSettings();
      if (!cur.doNotDisturb && cur.enablePostPrayerDhikr) {
        notify({ type: 'zikr', title: '📿 أذكار وأدعية بعد الصلاة', body: p.name });
        audio.play('post_prayer_dhikr');
      }
    }, delayMs);
  }
}

async function zikrTick(): Promise<void> {
  const s = getSettings();
  if (s.doNotDisturb || !s.enableZikrNotify || !s.systemZikrNotify) return;
  const d = getRandomDhikr();
  if (!d) return;
  notify({
    type: 'zikr',
    title: '🕊️ ذكر',
    body: d.text.length > 200 ? d.text.slice(0, 200) + '…' : d.text,
  });
}

export function startScheduler(): void {
  stopScheduler();
  tick();
  tickTimer = setInterval(tick, 30_000); // كل 30 ثانية للدقة

  const s = getSettings();
  const intervalMs = Math.max(s.zikrIntervalMinutes, 5) * 60_000;
  zikrTimer = setInterval(zikrTick, intervalMs);
}

export function stopScheduler(): void {
  if (tickTimer) clearInterval(tickTimer);
  if (zikrTimer) clearInterval(zikrTimer);
  tickTimer = null;
  zikrTimer = null;
}

export function restartSchedulerIfRunning(): void {
  if (tickTimer) startScheduler();
}
