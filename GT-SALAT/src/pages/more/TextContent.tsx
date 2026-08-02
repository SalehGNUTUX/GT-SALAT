import { useEffect, useMemo, useState } from 'react';
import { Card, ChipGroup, CopyButton, EmptyState, SearchInput } from '../../components/common';
import type { AsmaName, DuaCategory, HadithCollection, HikamCategory, HistoryEvent } from '@electron/types';

/** تطبيعٌ عربيٌّ خفيف للبحث في الواجهة (نفس منطق العملية الرئيسية). */
function normalize(s: string): string {
  return (s || '')
    .replace(/[ً-ٰٟۖ-ۭـ﻿]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .trim()
    .toLowerCase();
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((f) => normalize(f ?? '').includes(q));
}

/** ترويسة بابٍ داخل قائمةٍ مصنّفة. */
function CategoryTitle({ icon, name, count }: { icon?: string; name: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 10px' }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)' }}>
        {icon ? `${icon} ` : ''}{name}
      </span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{count}</span>
    </div>
  );
}

// ═══════════════════════════ الأدعية المأثورة ═══════════════════════════

export function DuasPage() {
  const [cats, setCats] = useState<DuaCategory[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => { window.gtSalat.content.duas().then(setCats); }, []);

  const filtered = useMemo(
    () => cats
      .map((c) => ({ ...c, items: c.items.filter((d) => matches(query, d.text, d.source, d.context, c.name)) }))
      .filter((c) => c.items.length > 0),
    [cats, query],
  );

  const total = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الأدعية…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{total} دعاءً</div>}
      />
      {filtered.length === 0 ? (
        <EmptyState text="لا نتائج لهذا البحث" />
      ) : (
        filtered.map((c) => (
          <div key={c.id}>
            <CategoryTitle icon={c.icon} name={c.name} count={c.items.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.items.map((d) => (
                <Card key={`${c.id}-${d.n}`}>
                  <div className="dhikr-text" style={{ fontSize: 19, color: 'var(--fg-primary)', lineHeight: 2.1, marginBottom: 10 }}>
                    {d.text}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
                    {d.source && <span style={{ color: 'var(--gold-500)' }}>📖 {d.source}</span>}
                    {d.context && <span style={{ color: 'var(--fg-muted)' }}>{d.context}</span>}
                    <div style={{ flex: 1 }} />
                    <CopyButton text={d.text} source={d.source ? `${c.name} — ${d.source}` : c.name} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════ حِكَم ومواعظ ═══════════════════════════

export function HikamPage() {
  const [cats, setCats] = useState<HikamCategory[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => { window.gtSalat.content.hikam().then(setCats); }, []);

  const filtered = useMemo(
    () => cats
      .map((c) => ({ ...c, items: c.items.filter((h) => matches(query, h.text, h.sayer, h.source, c.name)) }))
      .filter((c) => c.items.length > 0),
    [cats, query],
  );

  const total = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الحِكَم…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{total} حكمةً</div>}
      />
      {filtered.length === 0 ? (
        <EmptyState text="لا نتائج لهذا البحث" />
      ) : (
        filtered.map((c) => (
          <div key={c.id}>
            <CategoryTitle icon={c.icon} name={c.name} count={c.items.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.items.map((h) => (
                <Card key={`${c.id}-${h.n}`}>
                  <div style={{ fontSize: 17, color: 'var(--fg-primary)', lineHeight: 2, marginBottom: 10 }}>
                    «{h.text}»
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
                    {h.sayer && <span style={{ color: 'var(--gold-500)' }}>— {h.sayer}</span>}
                    {h.source && <span style={{ color: 'var(--fg-muted)' }}>{h.source}</span>}
                    <div style={{ flex: 1 }} />
                    <CopyButton text={h.text} source={[h.sayer, h.source].filter(Boolean).join(' · ') || c.name} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════ الأحاديث ═══════════════════════════

export function HadithPage() {
  const [cols, setCols] = useState<HadithCollection[]>([]);
  const [active, setActive] = useState<string>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.gtSalat.content.hadith().then((c) => {
      setCols(c);
      if (c.length > 0) setActive(c[0].id);
    });
  }, []);

  const current = cols.find((c) => c.id === active);
  const items = useMemo(
    () => (current?.hadiths ?? []).filter((h) => matches(query, h.text, h.chapter, h.narrator, h.source)),
    [current, query],
  );

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {cols.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <ChipGroup<string>
            value={active}
            options={cols.map((c) => ({ value: c.id, label: `${c.name} (${c.hadiths.length})` }))}
            onChange={(v) => { setActive(v); setQuery(''); }}
          />
        </div>
      )}

      {current?.description && (
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 14, lineHeight: 1.9 }}>
          {current.description}{current.author ? ` — ${current.author}` : ''}
        </div>
      )}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الأحاديث…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{items.length} حديثاً</div>}
      />

      {items.length === 0 ? (
        <EmptyState text="لا نتائج لهذا البحث" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((h) => (
            <Card key={h.n}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--neutral-900)',
                    background: 'var(--gold-500)',
                    borderRadius: 99,
                    padding: '2px 9px',
                    fontWeight: 700,
                  }}
                >
                  {h.n}
                </span>
                {h.chapter && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-400)' }}>{h.chapter}</span>}
              </div>
              <div className="dhikr-text" style={{ fontSize: 18, color: 'var(--fg-primary)', lineHeight: 2.1, marginBottom: 10 }}>
                {h.text}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
                {h.narrator && <span style={{ color: 'var(--fg-secondary)' }}>🗣 {h.narrator}</span>}
                {h.source && <span style={{ color: 'var(--gold-500)' }}>📚 {h.source}</span>}
                {h.grade && <span style={{ color: 'var(--fg-muted)' }}>{h.grade}</span>}
                <div style={{ flex: 1 }} />
                <CopyButton
                  text={h.text}
                  source={[current?.name, h.chapter, h.source].filter(Boolean).join(' · ')}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════ أسماء الله الحسنى ═══════════════════════════

export function AsmaPage() {
  const [names, setNames] = useState<AsmaName[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => { window.gtSalat.content.asma().then(setNames); }, []);

  const filtered = useMemo(
    () => names.filter((n) => matches(query, n.arabic, n.meaning, n.ref)),
    [names, query],
  );

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الأسماء ومعانيها…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{filtered.length} اسماً</div>}
      />
      {filtered.length === 0 ? (
        <EmptyState text="لا نتائج لهذا البحث" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          {filtered.map((n) => {
            const expanded = open === n.index;
            return (
              <Card
                key={n.index}
                onClick={() => setOpen(expanded ? null : n.index)}
                style={{
                  padding: '16px 18px',
                  gridColumn: expanded ? '1 / -1' : undefined,
                  borderColor: expanded ? 'var(--teal-500)' : undefined,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span className="dhikr-text" style={{ fontSize: 24, color: 'var(--gold-500)', fontWeight: 700 }}>
                    {n.arabic}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{n.index}</span>
                </div>
                {expanded ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 14, color: 'var(--fg-primary)', lineHeight: 2 }}>{n.meaning}</div>
                    {n.ref && (
                      <div className="dhikr-text" style={{ fontSize: 16, color: 'var(--teal-400)', marginTop: 10, lineHeight: 2 }}>
                        {n.ref}
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <CopyButton
                        text={[n.arabic, n.meaning, n.ref].filter(Boolean).join('\n')}
                        source="أسماء الله الحسنى"
                        label="نسخ"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginTop: 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.meaning}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════ الأحداث التاريخية ═══════════════════════════

export function EventsPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => { window.gtSalat.content.events().then(setEvents); }, []);

  const filtered = useMemo(
    () => events.filter((e) => matches(query, e.title, e.text, e.year)),
    [events, query],
  );

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الأحداث…"
        extra={<div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{filtered.length} حدثاً</div>}
      />
      {filtered.length === 0 ? (
        <EmptyState text="لا نتائج لهذا البحث" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((e, i) => (
            <Card key={`${e.title}-${i}`} style={{ position: 'relative', paddingRight: 30 }}>
              <div
                style={{
                  position: 'absolute',
                  top: 22,
                  right: 12,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--gold-500)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)' }}>{e.title}</span>
                <span style={{ fontSize: 12, color: 'var(--gold-500)' }}>{e.year}</span>
                {!!e.hDay && !!e.hMonth && (
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    ({e.hDay}/{e.hMonth} هجرياً)
                  </span>
                )}
              </div>
              {e.text && <div style={{ fontSize: 13.5, color: 'var(--fg-secondary)', lineHeight: 2 }}>{e.text}</div>}
              <div style={{ marginTop: 10 }}>
                <CopyButton text={[e.title, e.text].filter(Boolean).join('\n')} source={e.year} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
