import { useEffect, useMemo, useState } from 'react';
import { Card, EmptyState } from '../../components/common';
import type { DayTimetable } from '../../hooks/usePrayer';
import type { AppSettings } from '../../hooks/useSettings';
import { formatClock, formatGregorian, hijriParts, ramadanRange } from '../../utils/format';

/** الإمساك قبل الفجر بعشر دقائق — عرفٌ شائعٌ احتياطاً. */
const IMSAK_BEFORE_FAJR_MIN = 10;

function shiftClock(hhmm: string, deltaMinutes: number): string {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  let total = h * 60 + m + deltaMinutes;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * إمساكية رمضان: الإمساك والفجر والمغرب لكل أيام الشهر.
 *
 * يُحسَب نطاق رمضان محلياً بتقويم أمّ القرى (مع إزاحة المستخدم الهجرية)، ثم تُجلب
 * جداول الشهرين الميلاديين اللذين يقع فيهما — فرمضان يمتدّ على شهرين ميلاديين غالباً.
 * قد يفرق يومٌ عن رؤية الهلال المحلية، وهذا مُنبَّهٌ عليه في الصفحة.
 */
export function ImsakiahPage({ settings }: { settings: AppSettings }) {
  const [days, setDays] = useState<DayTimetable[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => ramadanRange(new Date(), settings.hijriOffset ?? 0), [settings.hijriOffset]);

  useEffect(() => {
    if (!range) { setLoading(false); return; }
    setLoading(true);
    const months = new Set<string>();
    for (const d of [range.start, range.end]) months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    Promise.all(
      Array.from(months).map((key) => {
        const [y, m] = key.split('-').map(Number);
        return window.gtSalat.prayer.month(y, m);
      }),
    ).then((results) => {
      setDays(results.flat() as DayTimetable[]);
      setLoading(false);
    });
  }, [range?.start.getTime(), range?.end.getTime()]);

  const rows = useMemo(() => {
    if (!range) return [];
    const out: { date: Date; day: number; t?: DayTimetable }[] = [];
    const map = new Map(days.map((d) => [d.date, d]));
    const cursor = new Date(range.start);
    let i = 1;
    while (cursor <= range.end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      out.push({ date: new Date(cursor), day: i, t: map.get(iso) });
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    return out;
  }, [range, days]);

  if (!range) {
    return <EmptyState icon="🌛" text="تعذّر تحديد نطاق رمضان" />;
  }

  const todayIso = new Date().toDateString();
  const h = hijriParts(new Date(), settings.hijriOffset ?? 0);
  const inRamadan = h?.month === 9;
  const daysLeft = Math.max(0, Math.ceil((range.start.getTime() - Date.now()) / 86_400_000));

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26 }}>🌛</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-500)' }}>
              {inRamadan ? `رمضان — اليوم ${h?.day}` : `رمضان بعد ${daysLeft} يوماً`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
              {formatGregorian(range.start, settings.monthScheme, settings.country, false)}
              {' — '}
              {formatGregorian(range.end, settings.monthScheme, settings.country, false)}
              {' · '}
              {rows.length} يوماً
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 12, lineHeight: 1.9 }}>
          الإمساك محسوبٌ قبل الفجر بـ{IMSAK_BEFORE_FAJR_MIN} دقائق احتياطاً. بداية الشهر بتقويم أمّ القرى
          الحسابي، وقد تفرق يوماً عن رؤية الهلال في بلدك — اعتمد إعلان جهة الإفتاء عندك.
        </div>
      </Card>

      {loading ? (
        <EmptyState icon="⏳" text="… يجري تجهيز الإمساكية" />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '58px 1fr 1fr 1fr 1fr',
              gap: 0,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg-secondary)',
              background: 'var(--bg-elevated)',
              padding: '12px 16px',
            }}
          >
            <div>اليوم</div>
            <div>التاريخ</div>
            <div>الإمساك</div>
            <div>الفجر</div>
            <div>المغرب (الإفطار)</div>
          </div>
          {rows.map((r) => {
            const fajr = r.t?.prayers.find((p) => p.id === 'fajr')?.time;
            const maghrib = r.t?.prayers.find((p) => p.id === 'maghrib')?.time;
            const isToday = r.date.toDateString() === todayIso;
            return (
              <div
                key={r.day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '58px 1fr 1fr 1fr 1fr',
                  padding: '11px 16px',
                  borderTop: '1px solid var(--bg-elevated)',
                  background: isToday ? 'var(--accent-tint)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <div className="mono" style={{ color: isToday ? 'var(--teal-400)' : 'var(--gold-500)', fontWeight: 700 }}>
                  {r.day}
                </div>
                <div style={{ color: 'var(--fg-secondary)', fontSize: 12 }}>
                  {formatGregorian(r.date, settings.monthScheme, settings.country)}
                </div>
                <div className="mono" style={{ color: 'var(--fg-primary)' }}>
                  {fajr ? formatClock(shiftClock(fajr, -IMSAK_BEFORE_FAJR_MIN), settings.clock24h) : '—'}
                </div>
                <div className="mono" style={{ color: 'var(--fg-secondary)' }}>
                  {fajr ? formatClock(fajr, settings.clock24h) : '—'}
                </div>
                <div className="mono" style={{ color: 'var(--color-maghrib)' }}>
                  {maghrib ? formatClock(maghrib, settings.clock24h) : '—'}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
