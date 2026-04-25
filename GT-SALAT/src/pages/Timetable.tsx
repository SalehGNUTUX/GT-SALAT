import { useEffect, useState, useCallback } from 'react';
import { Card, Button, SectionTitle } from '../components/common';
import type { DayTimetable } from '../hooks/usePrayer';

type ViewMode = 'weekly' | 'biweekly' | 'monthly';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const PRAYER_COLORS: Record<string, string> = {
  fajr: 'var(--color-fajr)',
  sunrise: 'var(--color-sunrise)',
  dhuhr: 'var(--color-dhuhr)',
  asr: 'var(--color-asr)',
  maghrib: 'var(--color-maghrib)',
  isha: 'var(--color-isha)',
};

const PRAYER_NAMES_AR: Record<string, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const VIEW_LABELS: Record<ViewMode, string> = {
  weekly: 'أسبوعي',
  biweekly: 'نصف شهري',
  monthly: 'شهري',
};

async function fetchMonth(y: number, m: number): Promise<DayTimetable[]> {
  return (await window.gtSalat.prayer.month(y, m)) ?? [];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndDate(start: Date, mode: ViewMode): Date {
  if (mode === 'weekly') return addDays(start, 6);
  if (mode === 'biweekly') return addDays(start, 13);
  // monthly: آخر يوم في الشهر الحالي
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

function formatRange(start: Date, end: Date, mode: ViewMode): string {
  if (mode === 'monthly') {
    return `${MONTHS_AR[start.getMonth()]} ${start.getFullYear()}`;
  }
  const sDay = start.getDate();
  const eDay = end.getDate();
  if (start.getMonth() === end.getMonth()) {
    return `${sDay} — ${eDay} ${MONTHS_AR[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${sDay} ${MONTHS_AR[start.getMonth()]} — ${eDay} ${MONTHS_AR[end.getMonth()]} ${end.getFullYear()}`;
}

export function TimetablePage() {
  const now = todayDate();
  const todayStr = dateStr(now);

  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [startDate, setStartDate] = useState<Date>(now);
  const [data, setData] = useState<DayTimetable[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = getEndDate(startDate, viewMode);

      // اجمع كل الأشهر المعنية في النطاق
      const monthKeys = new Set<string>();
      let cur = new Date(startDate);
      while (cur <= endDate) {
        monthKeys.add(`${cur.getFullYear()}-${cur.getMonth() + 1}`);
        cur = addDays(cur, 1);
      }

      let allRows: DayTimetable[] = [];
      for (const key of monthKeys) {
        const [y, m] = key.split('-').map(Number);
        const rows = await fetchMonth(y, m);
        allRows = [...allRows, ...rows];
      }

      const startStr = dateStr(startDate);
      const endStr = dateStr(endDate);
      setData(allRows.filter((d) => d.date >= startStr && d.date <= endStr));
    } finally {
      setLoading(false);
    }
  }, [startDate, viewMode]);

  useEffect(() => { load(); }, [load]);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setStartDate(todayDate());
  };

  const prevWindow = () => {
    if (viewMode === 'weekly') setStartDate((d) => addDays(d, -7));
    else if (viewMode === 'biweekly') setStartDate((d) => addDays(d, -14));
    else setStartDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextWindow = () => {
    if (viewMode === 'weekly') setStartDate((d) => addDays(d, 7));
    else if (viewMode === 'biweekly') setStartDate((d) => addDays(d, 14));
    else setStartDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const endDate = getEndDate(startDate, viewMode);
  const rangeLabel = formatRange(startDate, endDate, viewMode);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* أشرطة التحكم */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>

        {/* أزرار نوع العرض */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-panel)', borderRadius: 8, padding: 4 }}>
          {(['weekly', 'biweekly', 'monthly'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleViewMode(m)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: viewMode === m ? 700 : 400,
                background: viewMode === m ? 'var(--teal-500)' : 'transparent',
                color: viewMode === m ? 'var(--neutral-900)' : 'var(--fg-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {VIEW_LABELS[m]}
            </button>
          ))}
        </div>

        {/* التنقل */}
        <Button size="sm" onClick={prevWindow}>◀ السابق</Button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)', minWidth: 200, textAlign: 'center' }}>
          {rangeLabel}
        </div>
        <Button size="sm" onClick={nextWindow}>التالي ▶</Button>

        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={() => { setStartDate(todayDate()); }}>
          اليوم
        </Button>
        <Button onClick={load}>🔄 تحديث</Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* رأس الجدول */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px repeat(6, 1fr)',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>اليوم</div>
          {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((id) => (
            <div
              key={id}
              style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: PRAYER_COLORS[id], textAlign: 'center' }}
            >
              {PRAYER_NAMES_AR[id]}
            </div>
          ))}
        </div>

        {loading && <div style={{ padding: 20, color: 'var(--fg-muted)' }}>جاري التحميل…</div>}
        {!loading && data.length === 0 && (
          <div style={{ padding: 20, color: 'var(--fg-muted)' }}>
            لم تُحمَّل المواقيت. تحقق من إعدادات الموقع والإنترنت.
          </div>
        )}

        {data.map((day) => {
          const isToday = day.date === todayStr;
          return (
            <div
              key={day.date}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px repeat(6, 1fr)',
                borderBottom: '1px solid var(--bg-elevated)',
                background: isToday ? 'rgba(0,188,212,0.05)' : 'transparent',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: isToday ? 'var(--teal-400)' : 'var(--fg-secondary)',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {parseInt(day.date.split('-')[2], 10)} {isToday && '←'}
              </div>
              {day.prayers.map((p) => (
                <div
                  key={p.id}
                  className="mono"
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    color: isToday ? 'var(--fg-primary)' : 'var(--fg-secondary)',
                    textAlign: 'center',
                  }}
                >
                  {p.time}
                </div>
              ))}
            </div>
          );
        })}
      </Card>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
        يتم تخزين الجداول محلياً للعمل دون إنترنت. الحساب المحلي يعمل كبديل عند تعذّر الاتصال.
      </div>
    </div>
  );
}
