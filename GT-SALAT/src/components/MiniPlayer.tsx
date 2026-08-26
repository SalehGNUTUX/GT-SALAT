import { AudioSeekBar } from './AudioSeekBar';
import { usePlayer } from '../hooks/usePlayer';

/**
 * شريط المشغّل السفلي — يبقى ظاهراً في كل الأقسام ما دام هناك صوتٌ يُبَثّ.
 * النقر على اسم المقطع يعيدك إلى القسم الذي شغّلته منه.
 */
export function MiniPlayer({ onOpen }: { onOpen: (section: string) => void }) {
  const { track, status, volume, index, queueLength, togglePause, next, prev, stop, setVolume } = usePlayer();
  if (!track) return null;

  const playing = status === 'playing';
  const inQueue = queueLength > 1;
  const statusText =
    status === 'playing' ? 'يُبَثّ الآن'
      : status === 'loading' ? 'جارٍ الاتصال…'
      : status === 'paused' ? 'متوقّفٌ مؤقّتاً'
      : status === 'error' ? 'تعذّر الاتصال بالبثّ — جرّب مصدراً آخر'
      : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--teal-600)',
        flexShrink: 0,
      }}
    >
      {/* في قائمةٍ متتابعة (آيات التلاوة أو قائمة الإذاعات): سابق/تالٍ حول زرّ التشغيل.
          أيقونتا السابق والتالي معكوستان في RTL — «السابق» يشير يميناً. */}
      {inQueue && (
        <button onClick={prev} disabled={index <= 0} title="السابق" style={navBtn(index <= 0)}>
          ⏭
        </button>
      )}

      {/* ⏸/▶ إيقافٌ مؤقّتٌ واستئناف — لا يُغلق المشغّل */}
      <button
        onClick={togglePause}
        title={playing ? 'إيقاف مؤقّت' : 'استئناف'}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '1px solid var(--teal-500)',
          background: 'var(--accent-tint)',
          color: 'var(--teal-400)',
          fontSize: 13,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {playing ? '⏸' : status === 'loading' ? '⏳' : '▶'}
      </button>

      {inQueue && (
        <button
          onClick={next}
          disabled={index >= queueLength - 1}
          title="التالي"
          style={navBtn(index >= queueLength - 1)}
        >
          ⏮
        </button>
      )}

      {/* النقر يعيد المستخدم إلى القسم الذي شغّل منه */}
      <div
        onClick={() => onOpen(track.section)}
        title="العودة إلى القسم"
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--fg-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.icon ? `${track.icon} ` : ''}{track.title}
        </div>
        <div style={{ fontSize: 11.5, color: status === 'error' ? 'var(--color-error)' : 'var(--fg-muted)', marginTop: 2 }}>
          {statusText}{track.subtitle && status !== 'error' ? ` · ${track.subtitle}` : ''}
          {inQueue && status !== 'error' ? ` · ${index + 1}/${queueLength}` : ''}
        </div>
      </div>

      {/* يظهر للملفّات وحدها (الأذكار والرقية والسور الكاملة) ويختفي في البثّ الحيّ —
          `AudioSeekBar` يقرّر ذلك بنفسه من مدّة العنصر. */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <AudioSeekBar compact />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 178, marginInlineEnd: 6 }}>
        <span style={{ fontSize: 13 }}>🔉</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          style={{ flex: 1, accentColor: 'var(--teal-500)', cursor: 'pointer' }}
        />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 38, textAlign: 'center', flexShrink: 0 }}
        >
          {volume}٪
        </span>
      </div>

      {/* ⏹ إيقافٌ تامّ يُغلق المشغّل — منفصلٌ عن الإيقاف المؤقّت */}
      <button
        onClick={stop}
        title="إيقافٌ تامّ وإغلاق المشغّل"
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          color: 'var(--fg-muted)',
          fontSize: 13,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ⏹
      </button>
    </div>
  );
}

/** زرّ تنقّلٍ صغيرٌ في القائمة (سابق/تالٍ). */
function navBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid var(--border-subtle)',
    background: 'transparent',
    color: 'var(--fg-secondary)',
    fontSize: 11,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    flexShrink: 0,
  };
}
