import { AudioSeekBar } from './AudioSeekBar';
import { useEffect, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';

/** خيارات مؤقّت الإيقاف بالدقائق، كما في الهاتف. */
const SLEEP_CHOICES = [15, 30, 45, 60, 90];

/**
 * شريط المشغّل السفلي — يبقى ظاهراً في كل الأقسام ما دام هناك صوتٌ يُبَثّ.
 * النقر على اسم المقطع يعيدك إلى القسم الذي شغّلته منه.
 */
export function MiniPlayer({ onOpen }: { onOpen: (section: string) => void }) {
  const { track, status, volume, index, queueLength, togglePause, next, prev, stop, setVolume, sleepEndsAt, setSleepTimer, reconnecting } = usePlayer();
  // ساعةٌ محلّيّة للمتبقّي من المؤقّت: تُعيد رسم الشريط وحده لا التطبيق كلّه.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (sleepEndsAt == null) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(t);
  }, [sleepEndsAt]);
  if (!track) return null;
  const sleepLeft = sleepEndsAt != null ? Math.max(1, Math.ceil((sleepEndsAt - Date.now()) / 60_000)) : null;

  const playing = status === 'playing';
  const inQueue = queueLength > 1;
  const statusText =
    status === 'playing' ? 'يُبَثّ الآن'
      : status === 'loading' ? (reconnecting > 0 ? `انقطع البثّ — إعادة الاتصال (المحاولة ${reconnecting})…` : 'جارٍ الاتصال…')
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
        backdropFilter: 'var(--glass-backdrop)',
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
          {sleepLeft != null ? ` · ⏲ يتوقّف بعد ${sleepLeft} دقيقة` : ''}
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

      {/* ⏲ مؤقّت الإيقاف — للنوم على الإذاعة أو التلاوة */}
      <select
        value={sleepEndsAt != null ? 'on' : ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'off') setSleepTimer(null);
          else if (v !== 'on' && v !== '') setSleepTimer(parseInt(v, 10));
        }}
        title="مؤقّت الإيقاف"
        style={{
          height: 30,
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${sleepEndsAt != null ? 'var(--teal-500)' : 'var(--border-subtle)'}`,
          background: 'var(--bg-panel)',
          color: sleepEndsAt != null ? 'var(--teal-400)' : 'var(--fg-muted)',
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <option value="" disabled hidden>⏲ مؤقّت</option>
        {sleepEndsAt != null && <option value="on" disabled hidden>⏲ {sleepLeft} دقيقة</option>}
        {SLEEP_CHOICES.map((m) => (
          <option key={m} value={m}>{m} دقيقة</option>
        ))}
        {sleepEndsAt != null && <option value="off">إلغاء المؤقّت</option>}
      </select>

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
