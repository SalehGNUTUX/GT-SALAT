import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CopyButton, EmptyState, SearchInput, SectionTitle } from '../../components/common';
import { Gallery } from '../../components/Gallery';
import { QasrToolPage } from './QasrTool';
import { TaharaToolPage } from './TaharaTool';
import { normalizeArabic } from '@electron/quran';
import type { LearnFile, LearnSection, LearnSource } from '@electron/types';

/**
 * «تعلّم الطهارة والصلاة» (المذهب المالكيّ) — المحتوى كلّه من `purity_salah.json`،
 * **وهو نفس ملفّ نسخة الهاتف بلا تعديل**: تصحيحُ نصٍّ أو مصدرٍ يكون في الـJSON لا هنا،
 * ثمّ يُنسَخ الملفّ إلى النسخة الأخرى فتبقيان متطابقتَين.
 *
 * الدرس بمستويين كما في الهاتف: `short` مبسَّطٌ ظاهرٌ دائماً، و`full` بزرّ «شرح أكثر» —
 * فلا يُغرَق المبتدئ بالتفصيل، ولا يُحرَم منه من أراده.
 */
export function LearnPage() {
  const [file, setFile] = useState<LearnFile | null>(null);
  const [openId, setOpenId] = useState<string>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.gtSalat.content.learn().then(setFile);
  }, []);

  const sections = file?.sections ?? [];
  const shown = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return sections;
    return sections.filter(
      (s) =>
        normalizeArabic(s.title).includes(q) ||
        normalizeArabic(s.intro ?? '').includes(q) ||
        (s.steps ?? []).some((st) => normalizeArabic(`${st.title ?? ''} ${st.short ?? ''} ${st.full ?? ''}`).includes(q)) ||
        (s.rulings ?? []).some((g) =>
          normalizeArabic(`${g.title ?? ''} ${(g.items ?? []).map((it) => it.text).join(' ')}`).includes(q),
        ),
    );
  }, [sections, query]);

  const open = sections.find((s) => s.id === openId) ?? null;

  if (!file) return <EmptyState icon="⏳" text="يُحمّل المحتوى…" />;

  if (open) {
    return <LearnSectionView section={open} disclaimer={file.disclaimer} onBack={() => setOpenId('')} />;
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {file.disclaimer && (
        <Card style={{ marginBottom: 16, borderColor: 'var(--gold-600)', background: 'var(--accent-tint)' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.9 }}>ℹ️ {file.disclaimer}</div>
        </Card>
      )}

      <SearchInput value={query} onChange={setQuery} placeholder="ابحث في الدروس والأحكام…" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 14,
          marginTop: 14,
        }}
      >
        {shown.map((s) => (
          <Card key={s.id} onClick={() => setOpenId(s.id)} style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.8, marginBottom: 8 }}>
              {(s.intro ?? '').slice(0, 90)}
              {(s.intro ?? '').length > 90 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--fg-secondary)', flexWrap: 'wrap' }}>
              {(s.steps ?? []).length > 0 && <span>📋 {s.steps!.length} خطوة</span>}
              {(s.rulings ?? []).length > 0 && <span>⚖️ {s.rulings!.length} مجموعة أحكام</span>}
              {galleryCount(s) > 0 && <span>🖼️ {galleryCount(s)} صورة</span>}
              {s.tool && <span style={{ color: 'var(--gold-500)' }}>🧭 أداة تفاعلية</span>}
            </div>
          </Card>
        ))}
      </div>

      {shown.length === 0 && <EmptyState text="لا نتائج لهذا البحث" />}
    </div>
  );
}

function galleryCount(s: LearnSection): number {
  return (s.imageCount ?? 0) + (s.galleries ?? []).reduce((a, g) => a + g.count, 0);
}

function SourceLine({ source }: { source?: LearnSource }) {
  if (!source || (!source.title && !source.ref)) return null;
  return (
    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
      📚 {[source.title, source.ref].filter(Boolean).join(' — ')}
    </div>
  );
}

function LearnSectionView({
  section,
  disclaimer,
  onBack,
}: {
  section: LearnSection;
  disclaimer?: string;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (n: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 900 }}>
      <div style={{ marginBottom: 14 }}>
        <Button size="sm" variant="secondary" onClick={onBack}>← كلّ الدروس</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 8 }}>{section.title}</div>
        {section.intro && <div style={{ fontSize: 14, lineHeight: 2 }}>{section.intro}</div>}
        {section.draft && (
          <div style={{ fontSize: 12, color: 'var(--color-warning, var(--gold-500))', marginTop: 10 }}>
            ⚠ هذا القسم مسودّةٌ تحتاج مراجعةً فقهيّةً قبل اعتماده.
          </div>
        )}
      </Card>

      {/* الأداة التفاعليّة قبل الدرس: من فتح القسم لأجلها لا يبحث عنها في الذيل. */}
      {section.tool === 'qasr' && <QasrToolPage />}
      {section.tool === 'tahara' && <TaharaToolPage />}

      {section.imageDir && (section.imageCount ?? 0) > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>🖼️ الدليل المصوَّر</SectionTitle>
          <Gallery dir={section.imageDir} count={section.imageCount ?? 0} />
        </Card>
      )}

      {(section.galleries ?? []).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>🖼️ الأدلّة المصوَّرة</SectionTitle>
          {(section.galleries ?? []).map((g) => (
            <Gallery key={g.dir} dir={g.dir} count={g.count} title={g.title} />
          ))}
        </Card>
      )}

      {(section.steps ?? []).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>📋 الخطوات</SectionTitle>
          {(section.steps ?? []).map((st, idx) => {
            const n = st.n ?? idx + 1;
            const isOpen = expanded.has(n);
            return (
              <div
                key={n}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--teal-400)', fontWeight: 700, fontSize: 13 }}>{n}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{st.title}</span>
                      {st.ruling && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'var(--accent-tint)',
                            color: 'var(--gold-500)',
                          }}
                        >
                          {st.ruling}
                        </span>
                      )}
                    </div>
                    {st.short && <div style={{ fontSize: 14, lineHeight: 2, marginTop: 4 }}>{st.short}</div>}

                    {st.said && (
                      <div
                        className="dhikr-text"
                        style={{
                          fontSize: 16,
                          lineHeight: 2.1,
                          marginTop: 8,
                          padding: '10px 14px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        {st.said}
                      </div>
                    )}

                    {isOpen && st.full && (
                      <div style={{ fontSize: 13, lineHeight: 2, marginTop: 8, color: 'var(--fg-secondary)' }}>{st.full}</div>
                    )}
                    {isOpen && <SourceLine source={st.source} />}

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {st.full && (
                        <Button size="sm" variant="secondary" onClick={() => toggle(n)}>
                          {isOpen ? '▴ اطوِ' : '▾ شرحٌ أكثر'}
                        </Button>
                      )}
                      <CopyButton text={`${st.title}\n${st.short ?? ''}${st.said ? `\n${st.said}` : ''}`} source={section.title} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {(section.rulings ?? []).map((g, gi) => (
        <Card key={gi} style={{ marginBottom: 16 }}>
          <SectionTitle>⚖️ {g.title}</SectionTitle>
          {(g.items ?? []).map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--teal-400)' }}>•</span>
              <span style={{ fontSize: 14, lineHeight: 1.9, flex: 1 }}>{it.text}</span>
              {it.ruling && (
                <span style={{ fontSize: 11, color: 'var(--gold-500)', whiteSpace: 'nowrap' }}>{it.ruling}</span>
              )}
            </div>
          ))}
          {g.note && <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 10, lineHeight: 1.9 }}>{g.note}</div>}
          <SourceLine source={g.source} />
        </Card>
      ))}

      {section.note && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 2 }}>{section.note}</div>
        </Card>
      )}

      {disclaimer && (
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.9, marginTop: 8 }}>ℹ️ {disclaimer}</div>
      )}
    </div>
  );
}
