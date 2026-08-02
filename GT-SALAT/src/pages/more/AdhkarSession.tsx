import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CopyButton } from '../../components/common';
import type { SessionDhikr } from '@electron/types';

/**
 * جلسة أذكار الصباح/المساء: يمرّ المستخدم على الأذكار ذكراً ذكراً، ولكلٍّ عدد تكراره.
 * يُحفَظ تقدّم اليوم في localStorage فلا يضيع بإغلاق الصفحة، ويُصفَّر تلقائياً في اليوم التالي.
 */
export function AdhkarSessionPage({ type }: { type: 'morning' | 'evening' }) {
  const [items, setItems] = useState<SessionDhikr[]>([]);
  const storeKey = `gt_adhkar_${type}`;
  const today = new Date().toISOString().slice(0, 10);

  const [progress, setProgress] = useState<Record<number, number>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) ?? '{}');
      return raw.date === today ? raw.counts ?? {} : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.gtSalat.content.sessionAdhkar(type).then(setItems);
  }, [type]);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify({ date: today, counts: progress }));
  }, [progress, storeKey, today]);

  const totalRequired = useMemo(() => items.reduce((s, d) => s + d.count, 0), [items]);
  const totalDone = useMemo(
    () => items.reduce((s, d) => s + Math.min(progress[d.n] ?? 0, d.count), 0),
    [items, progress],
  );
  const percent = totalRequired ? Math.round((totalDone / totalRequired) * 100) : 0;
  const finished = totalRequired > 0 && totalDone >= totalRequired;

  const tap = (n: number, max: number) =>
    setProgress((p) => ({ ...p, [n]: (p[n] ?? 0) >= max ? 0 : (p[n] ?? 0) + 1 }));

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* شريط التقدّم */}
      <Card style={{ marginBottom: 18, position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: finished ? 'var(--color-success)' : 'var(--fg-primary)' }}>
            {finished ? '✓ أتممت أذكار ' : 'تقدّم أذكار '}
            {type === 'morning' ? 'الصباح' : 'المساء'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="mono" style={{ fontSize: 13, color: 'var(--teal-400)', fontWeight: 700 }}>
              {totalDone} / {totalRequired}
            </span>
            <Button size="sm" onClick={() => setProgress({})}>إعادة الضبط</Button>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: finished ? 'var(--color-success)' : 'var(--teal-500)',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((d) => {
          const done = Math.min(progress[d.n] ?? 0, d.count);
          const complete = done >= d.count;
          return (
            <Card
              key={d.n}
              onClick={() => tap(d.n, d.count)}
              style={{ position: 'relative', opacity: complete ? 0.6 : 1, transition: 'opacity 0.2s', userSelect: 'none' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 3,
                  height: '100%',
                  background: complete ? 'var(--color-success)' : 'var(--gold-500)',
                  borderRadius: '0 10px 10px 0',
                }}
              />
              <div className="dhikr-text" style={{ fontSize: 18, color: 'var(--fg-primary)', marginBottom: 14, lineHeight: 2.1 }}>
                {d.text}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>#{d.n}</span>
                  <CopyButton text={d.text} source={type === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'} />
                </div>
                <span
                  title={complete ? 'انقر لإعادة الضبط' : 'انقر في أي موضعٍ من البطاقة'}
                  style={{
                    background: complete ? 'rgba(76,175,80,0.12)' : 'var(--accent-tint)',
                    border: `1px solid ${complete ? 'var(--color-success)' : 'var(--accent-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 20px',
                    color: complete ? 'var(--color-success)' : 'var(--teal-400)',
                    fontSize: 14,
                    fontWeight: 700,
                    minWidth: 92,
                    display: 'inline-block',
                    textAlign: 'center',
                  }}
                >
                  {complete ? '✓ تمّ' : `${done} / ${d.count}`}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
