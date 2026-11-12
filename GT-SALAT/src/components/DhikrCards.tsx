import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CopyButton } from './common';

export interface CountedDhikr {
  n: number;
  text: string;
  /** العدد المقرَّر؛ و0 = عدٌّ مفتوح (أذكار القائمة العامّة): بلا إكمالٍ ولا انتقالٍ تلقائيّ. */
  count: number;
}

/**
 * الأذكار المعدودة بطاقةً بطاقة — نظير عرض البطاقات في الهاتف (`adhkarSessionCards`، الافتراضيّ منذ 2.4):
 * بطاقةٌ واحدةٌ كبيرة، النقر في أيّ موضعٍ منها يعدّ مرّة، وإكمال عددها ينقل تلقائيّاً إلى التالية.
 * لوحة المفاتيح: المسافة/Enter للعدّ، والسهمان للتنقّل (← التالي في RTL).
 */
export function DhikrCardsView({
  items,
  counts,
  onTap,
  source,
  onReset,
}: {
  items: CountedDhikr[];
  counts: Record<number, number>;
  onTap: (n: number, max: number) => void;
  source: string;
  /** زرّ «صفر» لتصفير البطاقة الحاليّة (للعدّ المفتوح). */
  onReset?: (n: number) => void;
}) {
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  const idx = Math.min(i, Math.max(0, items.length - 1));
  const d = items[idx];

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const go = useCallback((to: number) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    setI(Math.max(0, Math.min(items.length - 1, to)));
  }, [items.length]);

  const tap = useCallback(() => {
    if (!d) return;
    const before = counts[d.n] ?? 0;
    onTap(d.n, d.count);
    // اكتمل الآن ⇒ انتقالٌ تلقائيٌّ بعد لحظةٍ يرى فيها علامة الإتمام.
    if (d.count > 0 && before + 1 === d.count && idx < items.length - 1) {
      timer.current = window.setTimeout(() => { timer.current = null; setI(idx + 1); }, 350);
    }
  }, [d, counts, onTap, idx, items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); }
      else if (e.key === 'ArrowLeft') go(idx + 1);
      else if (e.key === 'ArrowRight') go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap, go, idx]);

  if (!d) return null;
  const open = d.count <= 0;
  const done = open ? counts[d.n] ?? 0 : Math.min(counts[d.n] ?? 0, d.count);
  const complete = !open && done >= d.count;
  const pct = open ? (done > 0 ? 1 : 0) : done / d.count;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>
      <Card
        onClick={tap}
        style={{ padding: '30px 34px', minHeight: 300, display: 'flex', flexDirection: 'column', userSelect: 'none', opacity: complete ? 0.75 : 1, transition: 'opacity 0.2s' }}
      >
        <div className="dhikr-text" style={{ flex: 1, fontSize: 23, lineHeight: 2.15, color: 'var(--fg-primary)', textAlign: 'center' }}>
          {d.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>#{d.n}</span>
            <CopyButton text={d.text} source={source} />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--gold-500)' }}>
            {open ? 'عدٌّ مفتوح' : d.count === 1 ? 'مرّةً واحدة' : `تُقال ${d.count} مرّات`}
            {onReset && done > 0 && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onReset(d.n); }}>صفر</Button>
            )}
          </span>
          {/* عدّادٌ دائريٌّ يمتلئ مع العدّ */}
          <div
            title={complete ? 'انقر لإعادة الضبط' : 'انقر في أيّ موضعٍ من البطاقة (أو المسافة)'}
            style={{
              width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `conic-gradient(${complete ? 'var(--color-success)' : 'var(--teal-500)'} ${pct * 360}deg, var(--bg-elevated) 0deg)`,
            }}
          >
            <div
              className="mono"
              style={{
                width: 54, height: 54, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, fontWeight: 700, color: complete ? 'var(--color-success)' : 'var(--teal-400)',
              }}
            >
              {open ? done : complete ? '✓' : d.count - done}
            </div>
          </div>
        </div>
      </Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Button size="sm" disabled={idx <= 0} onClick={() => go(idx - 1)}>→ السابق</Button>
        <span className="mono" style={{ fontSize: 13, color: 'var(--fg-muted)', minWidth: 70, textAlign: 'center' }}>
          {idx + 1} / {items.length}
        </span>
        <Button size="sm" disabled={idx >= items.length - 1} onClick={() => go(idx + 1)}>التالي ←</Button>
      </div>
    </div>
  );
}

/** زرّ التبديل بين البطاقات والقائمة للأذكار المعدودة (`adhkarSessionCards`، مفتاح الهاتف نفسه). */
export function DhikrViewToggle({ cards, onChange }: { cards: boolean; onChange: (cards: boolean) => void }) {
  return (
    <Button size="sm" onClick={() => onChange(!cards)} title={cards ? 'العرض قائمةً' : 'العرض بطاقاتٍ تنتقل تلقائيّاً'}>
      {cards ? '☰ قائمة' : '🗂 بطاقات'}
    </Button>
  );
}
