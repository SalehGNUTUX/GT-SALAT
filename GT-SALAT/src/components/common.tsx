import { ReactNode, useState } from 'react';

export function Card({
  children,
  style,
  onClick,
  id,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** لتثبيت مرساةٍ يُقفَز إليها بالتمرير (مثل آيةٍ بعينها في قارئ القرآن). */
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 22px',
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? 'var(--teal-500)' : 'var(--neutral-600)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'all 0.2s',
          right: on ? 3 : 'auto',
          left: on ? 'auto' : 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled,
  style,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: React.CSSProperties;
  /** تلميحٌ يظهر عند التحويم — مهمٌّ للأزرار الأيقونية بلا نصّ. */
  title?: string;
}) {
  const padding = size === 'sm' ? '6px 14px' : size === 'lg' ? '12px 24px' : '8px 18px';
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  let bg = 'transparent';
  let color = 'var(--fg-secondary)';
  let border = '1px solid var(--border-subtle)';
  if (variant === 'primary') {
    bg = 'var(--teal-500)';
    color = 'var(--neutral-900)';
    border = '1px solid var(--teal-500)';
  } else if (variant === 'secondary') {
    bg = 'var(--accent-tint)';
    color = 'var(--teal-400)';
    border = '1px solid var(--accent-border)';
  } else if (variant === 'danger') {
    bg = 'transparent';
    color = 'var(--color-error)';
    border = '1px solid rgba(244,67,54,0.4)';
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="btn-press"
      style={{
        padding,
        fontSize,
        borderRadius: 'var(--radius-sm)',
        background: bg,
        color,
        border,
        fontWeight: 500,
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-secondary)', letterSpacing: '0.04em' }}>{children}</div>
      {action}
    </div>
  );
}

/** صفّ إعدادٍ: عنوانٌ ووصفٌ اختياري على اليمين، وأداة التحكم على اليسار. */
export function SettingRow({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--bg-elevated)',
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/**
 * قسمٌ قابلٌ للطيّ. القسم المفتوح مُخزَّنٌ في الإعدادات فيُتذكَّر عبر الجلسات،
 * وفتح قسمٍ يطوي الباقي (أكورديون) — فلا تطول الصفحة بلا حدّ.
 */
export function Collapsible({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card style={{ marginBottom: 12, padding: expanded ? '18px 22px' : '14px 22px', transition: 'padding 0.15s' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: expanded ? 'var(--teal-400)' : 'var(--fg-secondary)', letterSpacing: '0.03em' }}>
          {icon ? `${icon} ` : ''}{title}
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--fg-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>
      </div>
      {expanded && <div style={{ marginTop: 12 }}>{children}</div>}
    </Card>
  );
}

/** مجموعة أزرارٍ متبادلة الإقصاء (اختيارٌ واحد). */
export function ChipGroup<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            onClick={() => !disabled && onChange(o.value)}
            disabled={disabled}
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              border: `1px solid ${active ? 'var(--teal-500)' : 'var(--border-subtle)'}`,
              background: active ? 'var(--accent-tint-2)' : 'transparent',
              color: active ? 'var(--teal-400)' : 'var(--fg-secondary)',
              fontSize: 12.5,
              fontWeight: active ? 600 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** منزلقٌ بقيمةٍ حيّة تظهر أثناء السحب (تُبثّ عند الترك فقط كي لا تُثقل التخزين). */
export function Slider({
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  const [live, setLive] = useState(value);
  const [dragging, setDragging] = useState(false);
  const shown = dragging ? live : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => { setDragging(true); setLive(parseInt(e.target.value, 10)); }}
        // نثبّت القيمة عند رفع المؤشّر أو المفتاح أو مغادرة الحقل — لا عند كل حركة،
        // فكل تثبيتٍ كتابةٌ على القرص وبثٌّ لكل الواجهة.
        onPointerUp={() => { setDragging(false); onCommit(live); }}
        onKeyUp={() => { setDragging(false); onCommit(live); }}
        onBlur={() => { if (dragging) { setDragging(false); onCommit(live); } }}
        style={{ flex: 1, accentColor: 'var(--teal-500)', cursor: 'pointer' }}
      />
      <span className="mono" style={{ fontSize: 13, color: 'var(--teal-400)', minWidth: 52, textAlign: 'left' }}>
        {shown}{suffix}
      </span>
    </div>
  );
}

/** زرّ معاينةٍ صوتية يبدّل تشغيل/إيقاف حسب الحالة الجارية. */
export function PreviewButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={playing ? 'إيقاف' : 'تجربة'}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: `1px solid ${playing ? 'var(--color-error)' : 'var(--border-subtle)'}`,
        background: playing ? 'rgba(244,67,54,0.12)' : 'transparent',
        color: playing ? 'var(--color-error)' : 'var(--teal-400)',
        fontSize: 12,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {playing ? '⏹' : '▶'}
    </button>
  );
}

/** صفٌّ يفتح رابطاً خارجياً في المتصفح. */
export function LinkRow({ title, sub, url }: { title: string; sub?: string; url: string }) {
  return (
    <div
      onClick={() => window.gtSalat.app.openUrl(url)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--bg-elevated)',
        cursor: 'pointer',
        gap: 12,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--teal-400)', fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)', flexShrink: 0 }}>↗</span>
    </div>
  );
}

/** حقل بحثٍ موحّد لكل شاشات المحتوى. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  extra,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  extra?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 14,
          color: 'var(--fg-primary)',
          direction: 'rtl',
          fontFamily: 'inherit',
        }}
      />
      {extra}
    </div>
  );
}

/** حالةٌ فارغة موحّدة (لا نتائج / لم يُحمَّل بعد). */
export function EmptyState({ icon = '🔍', text }: { icon?: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--fg-muted)' }}>
      <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

export function StatusDot({ ok, color }: { ok?: boolean; color?: string }) {
  const inactive = ok === false && !color;
  const c = color ?? (ok ? 'var(--color-success)' : 'var(--color-error)');
  return (
    <div
      className={inactive ? 'blink-error' : 'pulse-dot'}
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: c,
        boxShadow: inactive ? undefined : `0 0 8px ${c}`,
        flexShrink: 0,
      }}
    />
  );
}
