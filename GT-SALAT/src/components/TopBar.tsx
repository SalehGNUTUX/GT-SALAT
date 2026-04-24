interface Props {
  pageLabel: string;
  time: Date;
  city?: string;
  hijriFromApi?: string;
}

function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function getHijriDate(date: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const locales = ['ar-MA-u-ca-islamic-nu-latn', 'ar-DZ-u-ca-islamic', 'ar-u-ca-islamic'];
  for (const locale of locales) {
    try {
      return toWesternDigits(date.toLocaleDateString(locale, opts));
    } catch {}
  }
  return toWesternDigits(date.toLocaleDateString('ar-SA-u-ca-islamic', opts));
}

function getGregorianDate(date: Date): string {
  try {
    return date.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return date.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}

export function TopBar({ pageLabel, time, city, hijriFromApi }: Props) {
  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hijriStr = hijriFromApi || getHijriDate(time);
  const gregStr = getGregorianDate(time);

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
      {/* يمين: عنوان الصفحة + المدينة */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-primary)' }}>{pageLabel}</div>
        {city && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>📍 {city}</div>}
      </div>

      {/* يسار: تاريخ + وقت */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* التاريخ الهجري */}
          <div style={{ fontSize: 12, color: 'var(--gold-500)', direction: 'rtl' }}>
            🌙 {hijriStr}
          </div>
          {/* الوقت */}
          <div className="mono" style={{ fontSize: 17, color: 'var(--teal-400)', fontWeight: 600 }}>
            {timeStr}
          </div>
        </div>
        {/* التاريخ الميلادي */}
        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{gregStr}</div>
      </div>
    </div>
  );
}
