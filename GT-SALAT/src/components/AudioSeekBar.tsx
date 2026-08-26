import { useEffect, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';

/**
 * شريطُ مدّةٍ وعدّادُ زمنٍ للمقطع الجاري: «مضى / الباقي» وسحبٌ للانتقال، وقفزٌ ±.
 *
 * **للملفّات لا للبثّ**: الإذاعة بثٌّ حيٌّ مدّته `Infinity`، فلا معنى لشريطٍ فيها — يختفي
 * من تلقائه عند تعذّر معرفة المدّة. أمّا الأذكار الصوتيّة والرقية (63 دقيقة) والسور الكاملة
 * فملفّاتٌ محلّيّة أو مخزَّنة، والتنقّل فيها بالثانية حاجةٌ لا زينة.
 *
 * **الاشتراك في `timeupdate` داخل هذا المكوّن لا في المزوّد** (قاعدة `usePlayer`): لو رُفع
 * الزمن إلى حالة المزوّد لأُعيد رسم التطبيق كلّه أربع مرّاتٍ في الثانية.
 */
export function AudioSeekBar({ compact = false }: { compact?: boolean }) {
  const { audioRef, track } = usePlayer();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** أثناء السحب يُتجاهَل `timeupdate` — وإلّا نازع الصوتُ إصبعَ المستخدم على المقبض. */
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    onMeta();
    onTime();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
    };
    // المقطع الجديد يُعيد الاشتراك ويصفّر القراءة — لا تبقى مدّةُ السابق معروضة.
  }, [audioRef, track?.id]);

  useEffect(() => {
    setTime(0);
    setDuration(0);
  }, [track?.id]);

  // بثٌّ حيٌّ أو مدّةٌ لم تُعرَف بعد: لا شريط.
  if (!duration || !Number.isFinite(duration)) return null;

  const shown = dragging ?? time;
  const seek = (t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.min(duration, Math.max(0, t));
    setTime(el.currentTime);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
      {!compact && (
        <button onClick={() => seek(shown - 10)} title="إلى الوراء 10 ثوانٍ" style={skipBtn}>
          ↺10
        </button>
      )}

      <span className="mono" style={timeStyle}>{formatTime(shown)}</span>

      <input
        type="range"
        min={0}
        max={Math.floor(duration)}
        value={Math.floor(shown)}
        onChange={(e) => setDragging(parseInt(e.target.value, 10))}
        onMouseUp={() => {
          if (dragging !== null) seek(dragging);
          setDragging(null);
        }}
        onKeyUp={() => {
          if (dragging !== null) seek(dragging);
          setDragging(null);
        }}
        style={{ flex: 1, minWidth: 60, accentColor: 'var(--teal-500)', cursor: 'pointer' }}
      />

      {/* الباقي لا المدّة الكلّية: «كم بقي» أنفع لمن يستمع لتسجيلٍ طويل. */}
      <span className="mono" style={timeStyle} title={`المدّة الكلّية ${formatTime(duration)}`}>
        −{formatTime(Math.max(0, duration - shown))}
      </span>

      {!compact && (
        <button onClick={() => seek(shown + 30)} title="إلى الأمام 30 ثانية" style={skipBtn}>
          30↻
        </button>
      )}
    </div>
  );
}

const timeStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--fg-muted)',
  minWidth: 46,
  textAlign: 'center',
  flexShrink: 0,
};

const skipBtn: React.CSSProperties = {
  height: 24,
  padding: '0 8px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--fg-secondary)',
  fontSize: 10.5,
  fontFamily: 'inherit',
  cursor: 'pointer',
  flexShrink: 0,
};

/** «5:04» للأقلّ من ساعة، و«1:03:22» لما تجاوزها — الرقيةُ 63 دقيقة فتحتاج الساعات. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}
