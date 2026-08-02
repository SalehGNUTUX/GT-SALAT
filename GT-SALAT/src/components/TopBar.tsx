import type { AppSettings } from '../hooks/useSettings';
import type { NextPrayerInfo } from '../hooks/usePrayer';
import { formatClock, formatClockNow, formatGregorian, formatHijri } from '../utils/format';

interface Props {
  pageLabel: string;
  time: Date;
  city?: string;
  hijriFromApi?: string;
  settings: AppSettings;
  /** الصلاة القادمة — تُعرَض في كل الأقسام فلا يعود المستخدم للوحة التحكم ليعرفها. */
  next: NextPrayerInfo | null;
  /** يظهر زرّ رجوعٍ عند الدخول إلى قسمٍ فرعي. */
  onBack?: () => void;
  /** النقر على بطاقة الصلاة القادمة يفتح لوحة التحكم. */
  onOpenDashboard?: () => void;
}

export function TopBar({ pageLabel, time, city, hijriFromApi, settings, next, onBack, onOpenDashboard }: Props) {
  const timeStr = formatClockNow(time, settings.clock24h);
  // تاريخ الإنترنت يُستعمل ما دامت الإزاحة صفراً؛ وأيّ إزاحةٍ تعني حساباً محلياً بأمّ القرى.
  const hijriStr = settings.hijriOffset === 0 && hijriFromApi ? hijriFromApi : formatHijri(time, settings.hijriOffset);
  const gregStr = formatGregorian(time, settings.monthScheme, settings.country);

  return (
    <div
      style={{
        height: 64,
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      {/* يمين: زرّ الرجوع + عنوان الصفحة + المدينة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button
            onClick={onBack}
            title="رجوع"
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--teal-400)',
              fontSize: 15,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ←
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-primary)' }}>{pageLabel}</div>
          {city && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>📍 {city}</div>}
        </div>
      </div>

      {/* وسط: الصلاة القادمة */}
      {next && (
        <div
          onClick={onOpenDashboard}
          title="افتح لوحة التحكم"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 14px',
            borderRadius: 99,
            background: 'rgba(245,197,24,0.08)',
            border: '1px solid var(--gold-600)',
            cursor: onOpenDashboard ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13 }}>🕌</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-500)' }}>{next.prayer.name}</span>
          <span className="mono" style={{ fontSize: 12.5, color: 'var(--fg-secondary)' }}>
            {formatClock(next.prayer.time, settings.clock24h)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>·</span>
          <span className="mono" style={{ fontSize: 12.5, color: 'var(--teal-400)', fontWeight: 700 }}>
            {next.remainingText}
          </span>
        </div>
      )}

      {/* يسار: تاريخ + وقت */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--gold-500)', direction: 'rtl' }}>🌙 {hijriStr}</div>
          <div className="mono" style={{ fontSize: 17, color: 'var(--teal-400)', fontWeight: 600 }}>
            {timeStr}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{gregStr}</div>
      </div>
    </div>
  );
}
