import { useEffect, useMemo, useState } from 'react';
import { Card, Button } from '../components/common';

interface Dhikr {
  id: number;
  text: string;
}

export function DhikrPage() {
  const [all, setAll] = useState<Dhikr[]>([]);
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('gt_dhikr_counts') ?? '{}'); } catch { return {}; }
  });

  useEffect(() => {
    window.gtSalat.dhikr.all().then(setAll);
  }, []);

  useEffect(() => {
    localStorage.setItem('gt_dhikr_counts', JSON.stringify(counts));
  }, [counts]);

  const filtered = useMemo(() => {
    if (!query.trim()) return all;
    const q = query.trim();
    return all.filter((d) => d.text.includes(q));
  }, [all, query]);

  const incr = (id: number) => setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const reset = (id: number) => setCounts((c) => { const { [id]: _, ...rest } = c; return rest; });
  const resetAll = () => {
    if (confirm('هل تريد إعادة ضبط جميع العدّادات؟')) setCounts({});
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="ابحث في الأذكار…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--fg-primary)',
            direction: 'rtl',
          }}
        />
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {filtered.length} / {all.length}
        </div>
        <Button variant="danger" size="sm" onClick={resetAll}>
          إعادة ضبط العدّادات
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((d) => {
          const cnt = counts[d.id] ?? 0;
          return (
            <Card key={d.id} style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 3,
                  height: '100%',
                  background: cnt > 0 ? 'var(--teal-500)' : 'var(--border-subtle)',
                  borderRadius: '0 10px 10px 0',
                }}
              />
              <div className="dhikr-text" style={{ fontSize: 20, color: 'var(--fg-primary)', marginBottom: 12 }}>
                {d.text}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>#{d.id + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => incr(d.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'rgba(0,188,212,0.1)',
                      border: '1px solid rgba(0,188,212,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 16px',
                      color: 'var(--teal-400)',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <span>+</span>
                    <span className="mono">{cnt}</span>
                  </button>
                  {cnt > 0 && (
                    <Button size="sm" onClick={() => reset(d.id)}>
                      صفر
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
