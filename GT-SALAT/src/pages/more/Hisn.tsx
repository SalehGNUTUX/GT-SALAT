import { useEffect, useState } from 'react';
import { Button, Card, CopyButton, EmptyState, SearchInput } from '../../components/common';
import type { HisnCategory, HisnCategoryInfo } from '@electron/types';

/**
 * حصن المسلم المصنّف: فهرس الأبواب ← أذكار الباب.
 * البحث يمرّ عبر العملية الرئيسية (267 ذكراً) فلا يُحمَّل الملفّ كاملاً في الواجهة.
 */
export function HisnPage() {
  const [index, setIndex] = useState<HisnCategoryInfo[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HisnCategory[] | null>(null);
  const [open, setOpen] = useState<HisnCategory | null>(null);

  useEffect(() => {
    window.gtSalat.content.hisnIndex().then(setIndex);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      window.gtSalat.content.hisnSearch(q).then(setResults);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  // عرض باب مفتوح
  if (open) {
    return (
      <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Button size="sm" onClick={() => setOpen(null)}>← الأبواب</Button>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal-400)' }}>
            {open.icon} {open.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{open.items?.length ?? 0} ذكراً</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(open.items ?? []).map((d) => (
            <DhikrCard key={d.n} n={d.n} text={d.text} count={d.count ?? 1} source={open.name} />
          ))}
        </div>
      </div>
    );
  }

  const shown = results ?? null;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في 267 ذكراً من حصن المسلم…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{index.length} باباً</div>}
      />

      {shown ? (
        shown.length === 0 ? (
          <EmptyState text="لا نتائج لهذا البحث" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {shown.map((cat) => (
              <div key={cat.id}>
                <div
                  onClick={() => window.gtSalat.content.hisnCategory(cat.id).then((c) => c && setOpen(c))}
                  style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-400)', marginBottom: 8, cursor: 'pointer' }}
                >
                  {cat.icon} {cat.name} ←
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(cat.items ?? []).map((d) => (
                    <DhikrCard key={d.n} n={d.n} text={d.text} count={d.count ?? 1} source={cat.name} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {index.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => window.gtSalat.content.hisnCategory(cat.id).then((c) => c && setOpen(c))}
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon || '📿'}</span>
                <span style={{ fontSize: 13.5, color: 'var(--fg-primary)' }}>{cat.name}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>
                {cat.count}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * بطاقة ذكرٍ بعدّادِ تكرار. **النقر في أي موضعٍ من البطاقة يعدّ مرّة** — لا يلزم إصابة
 * زرٍّ صغير، فالمستخدم يذكر وعينه على النصّ لا على الزرّ. والنقر بعد الاكتمال يُصفّر.
 */
function DhikrCard({ n, text, count, source }: { n: number; text: string; count: number; source?: string }) {
  const [done, setDone] = useState(0);
  const complete = done >= count;
  const tap = () => setDone((d) => (d >= count ? 0 : d + 1));

  return (
    <Card
      onClick={tap}
      style={{ position: 'relative', opacity: complete ? 0.62 : 1, transition: 'opacity 0.2s', userSelect: 'none' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 3,
          height: '100%',
          background: complete ? 'var(--color-success)' : 'var(--border-subtle)',
          borderRadius: '0 10px 10px 0',
        }}
      />
      <div className="dhikr-text" style={{ fontSize: 18, color: 'var(--fg-primary)', marginBottom: 12, lineHeight: 2 }}>
        {text}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>#{n}</span>
          <CopyButton text={text} source={source ? `حصن المسلم — ${source}` : 'حصن المسلم'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {count > 1 && (
            <span style={{ fontSize: 12, color: 'var(--gold-500)' }}>تُقال {count} مرّات</span>
          )}
          <span
            title={complete ? 'انقر لإعادة الضبط' : 'انقر في أي موضعٍ من البطاقة'}
            style={{
              background: complete ? 'rgba(76,175,80,0.12)' : 'var(--accent-tint)',
              border: `1px solid ${complete ? 'var(--color-success)' : 'var(--accent-border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 16px',
              color: complete ? 'var(--color-success)' : 'var(--teal-400)',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-block',
            }}
          >
            {complete ? '✓ تمّ' : `${done} / ${count}`}
          </span>
        </div>
      </div>
    </Card>
  );
}
