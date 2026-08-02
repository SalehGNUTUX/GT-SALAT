import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, SearchInput } from '../../components/common';
import type { Radio } from '@electron/types';
import type { AppSettings } from '../../hooks/useSettings';
import { usePlayer } from '../../hooks/usePlayer';

/** وجهة المشغّل العالمي حين تُشغَّل إذاعة — النقر على الشريط يعيد إلى هنا. */
export const RADIOS_SECTION = 'more/radios';

/** إذاعةٌ في القائمة الفعلية مع أعلامٍ للعرض. */
interface RadioItem extends Radio {
  /** الاسم الأصلي في الملف — مفتاحُ التعديل، لا يتغيّر بتغيّر الاسم المعروض. */
  key: string;
  isCustom: boolean;
  isEdited: boolean;
}

/**
 * الإذاعات القرآنية المباشرة.
 *
 * التشغيل عبر **المشغّل العالمي** (`usePlayer`)، فيستمرّ البثّ عند التنقّل ويبقى شريط
 * المشغّل ظاهراً يعيدك إلى هنا بنقرة.
 *
 * **لا يُمَسّ ملفّ `radios.json` أبداً**: تعديلات المستخدم تُخزَّن فوقه في الإعدادات
 * (`radioEdits` مفتاحها الاسم الأصلي، و`customRadios` لما يضيفه) — فتُحدَّث القائمة
 * الافتراضية مع التطبيق دون أن تضيع تعديلاته، ويستطيع استعادة الأصل بنقرة.
 */
export function RadiosPage({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const [defaults, setDefaults] = useState<Radio[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RadioItem | null>(null);
  const [adding, setAdding] = useState(false);
  const { track, status, toggle, stop } = usePlayer();

  useEffect(() => { window.gtSalat.content.radios().then(setDefaults); }, []);

  const favorites = useMemo(() => new Set(settings.favoriteRadios ?? []), [settings.favoriteRadios]);
  const edits = settings.radioEdits ?? {};
  const customs = settings.customRadios ?? [];

  const items: RadioItem[] = useMemo(() => {
    const base: RadioItem[] = defaults.map((r) => {
      const e = edits[r.name];
      return {
        key: r.name,
        name: e?.name || r.name,
        desc: e?.desc ?? r.desc,
        url: e?.url || r.url,
        isCustom: false,
        isEdited: !!e,
      };
    });
    const mine: RadioItem[] = customs.map((r) => ({
      key: r.name,
      name: r.name,
      desc: r.desc,
      url: r.url,
      isCustom: true,
      isEdited: false,
    }));
    return [...mine, ...base];
  }, [defaults, edits, customs]);

  const shown = useMemo(() => {
    const q = query.trim();
    const list = q ? items.filter((r) => r.name.includes(q) || (r.desc ?? '').includes(q)) : items;
    // المفضّلة أولاً مع حفظ الترتيب داخل كل مجموعة.
    return [...list].sort((a, b) => Number(favorites.has(b.key)) - Number(favorites.has(a.key)));
  }, [items, query, favorites]);

  const toggleFav = (key: string) => {
    const next = new Set(favorites);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update({ favoriteRadios: Array.from(next) });
  };

  const saveEdit = (item: RadioItem, values: Radio) => {
    if (item.isCustom) {
      update({ customRadios: customs.map((c) => (c.name === item.key ? values : c)) });
    } else {
      update({ radioEdits: { ...edits, [item.key]: values } });
    }
    setEditing(null);
  };

  const resetEdit = (item: RadioItem) => {
    const { [item.key]: _drop, ...rest } = edits;
    update({ radioEdits: rest });
    setEditing(null);
  };

  const removeCustom = (item: RadioItem) => {
    if (!confirm(`سيتم حذف إذاعة «${item.name}» التي أضفتها. هل أنت متأكد؟`)) return;
    if (track?.id === item.url) stop();
    update({
      customRadios: customs.filter((c) => c.name !== item.key),
      favoriteRadios: (settings.favoriteRadios ?? []).filter((f) => f !== item.key),
    });
    setEditing(null);
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث في الإذاعات…"
        extra={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{shown.length} إذاعة</span>
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>➕ أضف إذاعة</Button>
          </div>
        }
      />

      {shown.length === 0 ? (
        <EmptyState icon="📻" text="لا إذاعة بهذا الاسم" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {shown.map((r) => {
            const active = track?.id === r.url;
            const fav = favorites.has(r.key);
            return (
              <Card
                key={r.key}
                style={{
                  padding: '14px 16px',
                  borderColor: active ? 'var(--teal-500)' : undefined,
                  background: active ? 'var(--accent-tint)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <button
                    onClick={() =>
                      toggle({ id: r.url, title: r.name, subtitle: r.desc, url: r.url, section: RADIOS_SECTION, icon: '📻' })
                    }
                    title={active && status === 'playing' ? 'إيقاف' : 'تشغيل'}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: `1px solid ${active ? 'var(--teal-500)' : 'var(--border-subtle)'}`,
                      background: active ? 'var(--accent-tint-2)' : 'transparent',
                      color: 'var(--teal-400)',
                      fontSize: 13,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {active && status === 'playing' ? '⏹' : active && status === 'loading' ? '⏳' : '▶'}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-primary)', lineHeight: 1.6 }}>
                      {r.name}
                      {r.isCustom && <span style={{ fontSize: 10, color: 'var(--gold-500)', marginRight: 6 }}>مُضافة</span>}
                      {r.isEdited && <span style={{ fontSize: 10, color: 'var(--fg-muted)', marginRight: 6 }}>معدَّلة</span>}
                    </div>
                    {r.desc && (
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 3, lineHeight: 1.6 }}>{r.desc}</div>
                    )}
                    {active && status === 'error' && (
                      <div style={{ fontSize: 11.5, color: 'var(--color-error)', marginTop: 4 }}>
                        تعذّر الاتصال — عدّل الرابط أو جرّب إذاعةً أخرى
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleFav(r.key)}
                      title={fav ? 'إزالة من المفضّلة' : 'أضف إلى المفضّلة'}
                      style={{ background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', opacity: fav ? 1 : 0.3 }}
                    >
                      ⭐
                    </button>
                    <button
                      onClick={() => setEditing(r)}
                      title="تعديل الاسم والوصف والرابط"
                      style={{ background: 'transparent', border: 'none', fontSize: 13, cursor: 'pointer', opacity: 0.5 }}
                    >
                      ✎
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <RadioDialog
          title={`تعديل: ${editing.name}`}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(v) => saveEdit(editing, v)}
          onReset={editing.isEdited ? () => resetEdit(editing) : undefined}
          onDelete={editing.isCustom ? () => removeCustom(editing) : undefined}
        />
      )}

      {adding && (
        <RadioDialog
          title="إضافة إذاعة"
          initial={{ name: '', desc: '', url: '' }}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            update({ customRadios: [...customs, v] });
            setAdding(false);
          }}
          existingNames={items.map((i) => i.key)}
        />
      )}
    </div>
  );
}

/** حوار تحرير/إضافة إذاعة. */
function RadioDialog({
  title,
  initial,
  onSave,
  onCancel,
  onReset,
  onDelete,
  existingNames,
}: {
  title: string;
  initial: Radio;
  onSave: (v: Radio) => void;
  onCancel: () => void;
  onReset?: () => void;
  onDelete?: () => void;
  existingNames?: string[];
}) {
  const [name, setName] = useState(initial.name);
  const [desc, setDesc] = useState(initial.desc ?? '');
  const [url, setUrl] = useState(initial.url);

  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  const duplicate = !!existingNames?.includes(trimmedName);
  const badUrl = trimmedUrl.length > 0 && !/^https?:\/\//i.test(trimmedUrl);
  const valid = trimmedName.length > 0 && trimmedUrl.length > 0 && !duplicate && !badUrl;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 92vw)' }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)', marginBottom: 16 }}>{title}</div>

          <Field label="الاسم" value={name} onChange={setName} placeholder="إذاعة القرآن الكريم" />
          <Field label="الوصف (اختياري)" value={desc} onChange={setDesc} placeholder="رواية حفص عن عاصم" />
          <Field label="رابط البثّ" value={url} onChange={setUrl} placeholder="https://…" ltr />

          {duplicate && <Note color="var(--color-error)">يوجد اسمٌ مطابق — اختر اسماً آخر.</Note>}
          {badUrl && <Note color="var(--color-warning)">يجب أن يبدأ الرابط بـ http:// أو https://</Note>}

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Button variant="primary" disabled={!valid} onClick={() => onSave({ name: trimmedName, desc: desc.trim(), url: trimmedUrl })}>
              💾 حفظ
            </Button>
            <Button onClick={onCancel}>إلغاء</Button>
            <div style={{ flex: 1 }} />
            {onReset && <Button onClick={onReset}>↺ استعادة الأصل</Button>}
            {onDelete && <Button variant="danger" onClick={onDelete}>🗑️ حذف</Button>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--fg-primary)',
          direction: ltr ? 'ltr' : 'rtl',
          textAlign: ltr ? 'left' : 'right',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function Note({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ fontSize: 11.5, color, marginTop: -6 }}>{children}</div>;
}
