import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Button, Card, SectionTitle } from './common';

/**
 * شكل البطاقات لصفحتَي الإعدادات (الأساسيّة والإضافيّة) — نظير الهاتف 2.2 (`settingsCards`):
 * شبكةٌ تفتح كلّ بطاقةٍ منها صفحة قسمها، والرجوع بزرٍّ أو بـEsc. والأقسام نفسها لا تُعاد كتابتها:
 * تقرأ `SettingsPageCtx` فلا تُرسَم في الشبكة، وتُرسَم وحدها في صفحتها.
 */
export interface SettingsCategory {
  title: string;
  icon: string;
  sub: string;
  /** بطاقةٌ تنقل إلى مكانٍ آخر بدل فتح قسمٍ في الصفحة (اختصار «الإعدادات الإضافيّة»). */
  onOpen?: () => void;
}

export const SettingsPageCtx = createContext<{ cards: boolean; page: string | null }>({ cards: false, page: null });

/** حالة الصفحة المفتوحة، وEsc يعود إلى الشبكة. */
export function useSettingsPage(cards: boolean): [string | null, (p: string | null) => void] {
  const [page, setPage] = useState<string | null>(null);
  useEffect(() => {
    if (!cards || !page) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards, page]);
  return [page, setPage];
}

/**
 * قسمٌ بعنوانٍ ثابت (الإعدادات الأساسيّة): بطاقةٌ بعنوانها في شكل القائمة، ولا شيء في الشبكة،
 * ومحتواه وحده في صفحته. **عنوانه يطابق مدخل الشبكة حرفيّاً.**
 */
export function TitledSection({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  const { cards, page } = useContext(SettingsPageCtx);
  if (cards && page !== title) return null;
  return (
    <Card style={{ marginBottom: 16 }}>
      {!cards && <SectionTitle>{icon} {title}</SectionTitle>}
      {children}
    </Card>
  );
}

/** الشبكة: بطاقاتٌ بأيقونةٍ في دائرةٍ ملوّنة وعنوانٍ ووصفٍ قصير (بأسلوب بطاقات «المزيد»). */
export function SettingsCardsGrid({ categories, onOpen }: { categories: SettingsCategory[]; onOpen: (title: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {categories.map((c) => (
        <Card key={c.title} onClick={() => (c.onOpen ? c.onOpen() : onOpen(c.title))} style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div
            style={{
              width: 52, height: 52, margin: '0 auto 10px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'var(--accent-tint-2)',
              border: '1px solid var(--accent-border)',
            }}
          >
            {c.icon}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{c.sub}</div>
        </Card>
      ))}
    </div>
  );
}

/** ترويسة صفحة القسم: الرجوع إلى الشبكة، وأيقونة القسم واسمه. */
export function SettingsPageHeader({ categories, title, onBack }: { categories: SettingsCategory[]; title: string; onBack: () => void }) {
  const c = categories.find((x) => x.title === title);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <Button size="sm" onClick={onBack} title="العودة إلى الإعدادات (Esc)">→ الإعدادات</Button>
      {c && <span style={{ fontSize: 22 }}>{c.icon}</span>}
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal-400)' }}>{title}</span>
    </div>
  );
}
