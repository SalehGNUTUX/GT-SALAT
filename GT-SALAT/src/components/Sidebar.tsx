import { StatusDot } from './common';
import appIcon from '@/assets/icons/app-icon.png';

export type PageId = 'dashboard' | 'timetable' | 'quran' | 'dhikr' | 'more' | 'settings' | 'advanced' | 'status';

interface Props {
  page: PageId;
  /** القسم الفرعي الجاري — لإبراز المثبَّت المفتوح. */
  sub?: string | null;
  onSelect: (p: PageId) => void;
  version: string;
  doNotDisturb: boolean;
  notifyActive: boolean;
  /** أقسام «المزيد» التي ثبّتها المستخدم (ثلاثة على الأكثر). */
  favorites: { id: string; label: string; icon: string }[];
  onOpenFavorite: (id: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: '🕌' },
  { id: 'timetable', label: 'مواقيت الصلاة', icon: '🕐' },
  { id: 'quran', label: 'القرآن الكريم', icon: '📖' },
  { id: 'dhikr', label: 'الأذكار', icon: '📖' },
  { id: 'more', label: 'المزيد', icon: '⊞' },
  { id: 'settings', label: 'الإعدادات الأساسية', icon: '⚙️' },
  { id: 'advanced', label: 'الإعدادات الإضافية', icon: '🎛️' },
  { id: 'status', label: 'حالة النظام', icon: '📊' },
];

export function Sidebar({ page, sub, onSelect, version, doNotDisturb, notifyActive, favorites, onOpenFavorite, theme, onToggleTheme }: Props) {
  return (
    <aside
      style={{
        width: 230,
        minHeight: '100vh',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '22px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={appIcon} style={{ width: 40, height: 40, objectFit: 'contain' }} alt="GT-SALAT" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-400)', lineHeight: 1.2 }}>GT-SALAT</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>الإصدار {version}</div>
        </div>
        {/* تبديل السِمة في متناول اليد — لا يُبحَث عنه في الإعدادات */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--gold-500)',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        {NAV.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 8,
                background: active ? 'var(--accent-tint)' : 'transparent',
                color: active ? 'var(--teal-400)' : 'var(--fg-secondary)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                marginBottom: 4,
                transition: 'all 0.15s',
                borderRight: active ? '3px solid var(--teal-500)' : '3px solid transparent',
                textAlign: 'right',
              }}
              onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}

        {/* الأقسام المثبَّتة من «المزيد» */}
        {favorites.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--fg-muted)',
                padding: '12px 14px 6px',
                letterSpacing: '0.06em',
              }}
            >
              ⭐ المثبَّتة
            </div>
            {favorites.map((f) => {
              const active = page === 'more' && sub === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onOpenFavorite(f.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderRadius: 8,
                    background: active ? 'var(--accent-tint)' : 'transparent',
                    color: active ? 'var(--teal-400)' : 'var(--fg-secondary)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    marginBottom: 3,
                    transition: 'all 0.15s',
                    borderRight: active ? '3px solid var(--teal-500)' : '3px solid transparent',
                    textAlign: 'right',
                  }}
                  onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 15 }}>{f.icon}</span>
                  {f.label}
                </button>
              );
            })}
          </>
        )}
      </nav>

      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <StatusDot ok={notifyActive && !doNotDisturb} />
          <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
            {doNotDisturb ? 'وضع عدم الإزعاج' : notifyActive ? 'الإشعارات مفعّلة' : 'الإشعارات معطّلة'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot ok color="var(--teal-500)" />
          <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>شريط المهام نشط</span>
        </div>
      </div>
    </aside>
  );
}
