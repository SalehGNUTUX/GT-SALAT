import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState } from './common';
import type { Place } from '@electron/types';

/**
 * منتقي المدينة من قاعدة المواقع المُضمَّنة — **يعمل بلا إنترنت ولا تحديد موقع**.
 *
 * الحاسوب لا GPS فيه، ومسار الاكتشاف الوحيد هو عنوان الإنترنت؛ فبلا اتصالٍ لم يكن
 * أمام المستخدم إلّا إدخال خطَّي الطول والعرض يدوياً. القاعدة نفسها المستعملة في نسخة
 * الهاتف (`places.json`) — 82 مدينةً في 51 دولة.
 *
 * الاختيار يضبط الإحداثيّات والمدينة والدولة، ويقترح طريقة الحساب المناسبة للبلد.
 */
export function PlacePicker({
  onPick,
  onClose,
}: {
  onPick: (place: Place) => void;
  onClose: () => void;
}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.gtSalat.content.places().then(setPlaces);
  }, []);

  // البحث يمرّ عبر العملية الرئيسية ليستفيد من التطبيع العربي نفسه.
  useEffect(() => {
    const t = setTimeout(() => {
      window.gtSalat.content.places(query.trim() || undefined).then(setPlaces);
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // نجمع حسب الدولة مع حفظ ترتيب الملفّ (الأقرب إلينا أولاً).
  const grouped = useMemo(() => {
    const map = new Map<string, Place[]>();
    for (const p of places) {
      const list = map.get(p.country) ?? [];
      list.push(p);
      map.set(p.country, list);
    }
    return [...map.entries()];
  }, [places]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(620px, 94vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}
      >
        <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '86vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)', flex: 1 }}>
              🏙️ اختر مدينتك
            </div>
            <Button size="sm" onClick={onClose}>إغلاق</Button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.8 }}>
            قاعدةٌ مُضمَّنةٌ تعمل بلا إنترنت — 82 مدينةً في 51 دولة. يُضبَط الموقع وتُقترَح
            طريقة الحساب المناسبة لبلدك.
          </div>

          <input
            autoFocus
            type="text"
            placeholder="ابحث عن مدينةٍ أو دولة…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--fg-primary)',
              direction: 'rtl',
              fontFamily: 'inherit',
              marginBottom: 12,
              flexShrink: 0,
            }}
          />

          <div style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
            {grouped.length === 0 ? (
              <EmptyState icon="🏙️" text="لا مدينة بهذا الاسم — جرّب اسم الدولة" />
            ) : (
              grouped.map(([country, cities]) => (
                <div key={country} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 6 }}>
                    {country}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                    {cities.map((p) => (
                      <button
                        key={`${p.country}-${p.city}`}
                        onClick={() => onPick(p)}
                        style={{
                          textAlign: 'right',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'transparent',
                          color: 'var(--fg-primary)',
                          fontSize: 13,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent-tint)';
                          e.currentTarget.style.borderColor = 'var(--teal-500)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                      >
                        {p.city}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
