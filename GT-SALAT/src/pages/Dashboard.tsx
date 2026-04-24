import { useEffect, useState } from 'react';
import { Card, Button, SectionTitle } from '../components/common';
import { useNextPrayer, type PrayerTime, type DayTimetable } from '../hooks/usePrayer';

const PRAYER_COLORS: Record<string, string> = {
  fajr: 'var(--color-fajr)',
  sunrise: 'var(--color-sunrise)',
  dhuhr: 'var(--color-dhuhr)',
  asr: 'var(--color-asr)',
  maghrib: 'var(--color-maghrib)',
  isha: 'var(--color-isha)',
};

const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌇',
  isha: '🌃',
};

interface Props {
  city: string;
  today: DayTimetable | null;
}

export function DashboardPage({ city, today }: Props) {
  const next = useNextPrayer(1000);
  const [dhikr, setDhikr] = useState<{ id: number; text: string } | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    window.gtSalat.dhikr.random().then(setDhikr);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      window.gtSalat.audio.playing().then(setAudioPlaying);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const newDhikr = () => window.gtSalat.dhikr.random().then(setDhikr);

  const nowMs = Date.now();
  const isPast = (p: PrayerTime) => p.timestamp < nowMs;
  const isNext = (p: PrayerTime) => next?.prayer.id === p.id;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Next prayer */}
        <Card style={{ position: 'relative', overflow: 'hidden', padding: '22px 26px' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at top right, rgba(245,197,24,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>
            الصلاة القادمة
          </div>
          {next ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: 'var(--gold-500)' }}>{next.prayer.name}</span>
                <span className="mono" style={{ fontSize: 24, color: 'var(--fg-primary)' }}>
                  {next.prayer.time}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>⏳</span>
                  <span className="mono" style={{ fontSize: 17, color: 'var(--teal-400)', fontWeight: 700 }}>
                    {next.remainingText}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>متبقية</span>
                </div>
                {audioPlaying && (
                  <Button size="sm" variant="danger" onClick={() => window.gtSalat.audio.stop()}>
                    ⏹ إيقاف الأذان
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, color: 'var(--fg-muted)', padding: '18px 0' }}>
              أكمل الإعدادات أولاً لعرض مواقيت الصلاة.
            </div>
          )}
        </Card>

        {/* Today dhikr */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle
            action={
              <Button size="sm" onClick={newDhikr}>
                ذكر جديد
              </Button>
            }
          >
            ذكر اليوم
          </SectionTitle>
          <div
            className="dhikr-text fade-in"
            key={dhikr?.id}
            style={{ fontSize: 19, color: 'var(--fg-primary)', flex: 1, marginBottom: 10 }}
          >
            {dhikr?.text ?? '…'}
          </div>
        </Card>
      </div>

      {/* Today timetable */}
      <Card>
        <SectionTitle>مواقيت اليوم{city ? ` — ${city}` : ''}</SectionTitle>
        {today ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {today.prayers.map((p) => {
              const next = isNext(p);
              const past = !next && isPast(p);
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: next ? 'rgba(245,197,24,0.08)' : 'transparent',
                    borderRight: next ? '3px solid var(--gold-500)' : '3px solid transparent',
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{PRAYER_ICONS[p.id]}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: next ? 700 : 500,
                        color: next ? PRAYER_COLORS[p.id] : 'var(--fg-primary)',
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 14,
                      color: next ? 'var(--gold-500)' : 'var(--fg-secondary)',
                      fontWeight: next ? 700 : 400,
                    }}
                  >
                    {p.time}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>جاري تحميل المواقيت…</div>
        )}
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => window.gtSalat.prayer.prefetch()}>
          🔄 تحديث المواقيت
        </Button>
        <Button onClick={() => window.gtSalat.notify.test()}>🔔 اختبار إشعار</Button>
        <Button onClick={() => window.gtSalat.notify.testAdhan()}>🎵 اختبار الأذان الكامل</Button>
        <Button onClick={() => window.gtSalat.notify.testAdhanShort()}>🎵 اختبار الأذان القصير</Button>
        <Button onClick={() => window.gtSalat.notify.testApproaching()}>⏰ اختبار تنبيه الاقتراب</Button>
        <Button onClick={() => window.gtSalat.audio.play('dua_after_adhan')}>🤲 اختبار دعاء الأذان</Button>
        <Button onClick={() => window.gtSalat.audio.play('post_prayer_dhikr')}>📿 اختبار أذكار الصلاة</Button>
      </div>
    </div>
  );
}
