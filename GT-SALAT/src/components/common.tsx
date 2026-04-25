import { ReactNode } from 'react';

export function Card({ children, style, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: React.CSSProperties;
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
    bg = 'rgba(0,188,212,0.1)';
    color = 'var(--teal-400)';
    border = '1px solid rgba(0,188,212,0.3)';
  } else if (variant === 'danger') {
    bg = 'transparent';
    color = 'var(--color-error)';
    border = '1px solid rgba(244,67,54,0.4)';
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
