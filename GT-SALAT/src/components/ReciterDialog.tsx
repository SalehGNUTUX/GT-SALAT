import { useState } from 'react';
import { Button, Card } from './common';
import type { Reciter, SurahReciter } from '@electron/types';

/**
 * حوارُ تحرير/إضافة قارئ — للنوعين معاً:
 *
 * - **آية-بآية** (`kind='ayah'`): الحقل الفعّال **مجلّد everyayah** (مثل `Alafasy_128kbps`)،
 *   لا الرابط الكامل — الروابط تُبنى في `electron/quran.ts`.
 * - **سورة كاملة** (`kind='surah'`): الحقل **رابط خادمٍ كامل** من mp3quran (مثل
 *   `https://server8.mp3quran.net/afs/`) لأنّ لكلّ قارئٍ خادماً مختلفاً.
 *
 * (المبدأ نفسه في GT-SQRM: اسمٌ + مجلّد everyayah، مع تعديلٍ وحذف.)
 */
export type ReciterDraft = {
  ar: string;
  riwaya: string;
  /** مجلّد everyayah لقارئ الآيات، أو رابط الخادم لقارئ السور. */
  source: string;
  style?: string;
};

const RIWAYAT = [
  { value: 'hafs', label: 'حفص' },
  { value: 'warsh', label: 'ورش' },
  { value: 'qalun', label: 'قالون' },
  { value: 'duri', label: 'الدوري' },
];

/**
 * أساليب التلاوة كما هي في `quran_meta.json` حرفياً («ترتيل» لا «مرتّل») — فلو كُتبت
 * بصيغةٍ أخرى بدت أساليبُ المضاف غير أساليب الافتراضيّ في القائمة الواحدة.
 * والاختيار من قائمةٍ لا كتابةً باليد: الحقل مقصورٌ على ثلاثة، وكتابته تُخطئ الرسم.
 */
const STYLES = [
  { value: '', label: 'بلا تحديد' },
  { value: 'ترتيل', label: 'ترتيل' },
  { value: 'مجود', label: 'مجوّد' },
  { value: 'حدر', label: 'حدر' },
];

export function toDraft(r: Reciter | SurahReciter, kind: 'ayah' | 'surah'): ReciterDraft {
  return {
    ar: r.ar,
    riwaya: r.riwaya ?? 'hafs',
    source: kind === 'ayah' ? (r as Reciter).everyayah ?? '' : (r as SurahReciter).server ?? '',
    style: (r as Reciter).style ?? '',
  };
}

export function ReciterDialog({
  title,
  kind,
  initial,
  onSave,
  onCancel,
  onReset,
  onDelete,
}: {
  title: string;
  kind: 'ayah' | 'surah';
  initial: ReciterDraft;
  onSave: (v: ReciterDraft) => void;
  onCancel: () => void;
  /** يظهر للقارئ الافتراضي المعدَّل فقط — يعيده إلى ما في `quran_meta.json`. */
  onReset?: () => void;
  /** يظهر للقارئ المضاف فقط — الافتراضي لا يُحذف بل يُستعاد. */
  onDelete?: () => void;
}) {
  const [ar, setAr] = useState(initial.ar);
  const [riwaya, setRiwaya] = useState(initial.riwaya);
  const [source, setSource] = useState(initial.source);
  const [style, setStyle] = useState(initial.style ?? '');

  const name = ar.trim();
  const src = source.trim();
  // خادم mp3quran رابطٌ كامل؛ ومجلّد everyayah اسمُ مجلّدٍ لا رابط — وخلطهما أشيع خطأ.
  const badServer = kind === 'surah' && src.length > 0 && !/^https?:\/\//i.test(src);
  const badFolder = kind === 'ayah' && /^https?:\/\//i.test(src);
  const valid = name.length > 0 && src.length > 0 && !badServer && !badFolder;

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
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)', marginBottom: 16 }}>{title}</div>

          <Field label="اسم القارئ" value={ar} onChange={setAr} placeholder="مشاري بن راشد العفاسي" />

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>الرواية</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RIWAYAT.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={riwaya === r.value ? 'primary' : 'ghost'}
                  onClick={() => setRiwaya(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {kind === 'ayah' ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>
                  أسلوب التلاوة (اختياري)
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STYLES.map((o) => (
                    <Button
                      key={o.value}
                      size="sm"
                      variant={style === o.value ? 'primary' : 'ghost'}
                      onClick={() => setStyle(o.value)}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Field
                label="مجلّد everyayah"
                value={source}
                onChange={setSource}
                placeholder="Alafasy_128kbps"
                ltr
              />
              <Note color="var(--fg-muted)">
                اسم المجلّد وحده لا الرابط الكامل. القائمة على{' '}
                <Link href="https://everyayah.com/data/">everyayah.com/data</Link> — يُبنى منه
                <span className="mono" style={{ direction: 'ltr', display: 'inline-block' }}> …/data/&#123;المجلّد&#125;/002255.mp3</span>
              </Note>
            </>
          ) : (
            <>
              <Field
                label="رابط خادم mp3quran"
                value={source}
                onChange={setSource}
                placeholder="https://server8.mp3quran.net/afs/"
                ltr
              />
              <Note color="var(--fg-muted)">
                رابط الخادم كاملاً؛ لكلّ قارئٍ خادمٌ مختلف. القائمة على{' '}
                <Link href="https://mp3quran.net/ar/api">mp3quran.net</Link> — يُبنى منه
                <span className="mono" style={{ direction: 'ltr', display: 'inline-block' }}> &#123;الخادم&#125;/002.mp3</span>
              </Note>
            </>
          )}

          {badServer && <Note color="var(--color-warning)">يجب أن يبدأ رابط الخادم بـ http:// أو https://</Note>}
          {badFolder && <Note color="var(--color-warning)">أدخل اسم المجلّد وحده — لا الرابط الكامل.</Note>}

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() => onSave({ ar: name, riwaya, source: src, style: style.trim() })}
            >
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

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        window.gtSalat.app.openUrl(href);
      }}
      style={{ color: 'var(--teal-400)' }}
    >
      {children}
    </a>
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
  return <div style={{ fontSize: 11.5, color, marginTop: -4, marginBottom: 12, lineHeight: 1.9 }}>{children}</div>;
}
