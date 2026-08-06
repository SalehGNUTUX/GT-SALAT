import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * مشغّلٌ عالميٌّ واحدٌ لكل التطبيق (الإذاعات وتلاوة القرآن).
 *
 * **لماذا على مستوى التطبيق لا داخل الصفحة؟** لأن عنصر `<audio>` لو كان داخل صفحةٍ لتوقّف
 * البثّ لحظةَ مغادرتها (تُفكَّك المكوّنات). هنا يبقى العنصر حيّاً في `App`، فيستمرّ الصوت
 * أثناء التنقّل، ويبقى شريط المشغّل ظاهراً يعيدك إلى قسمه بنقرة.
 *
 * **مشغّلٌ واحدٌ لا غير**: تشغيل مقطعٍ جديد (أو قائمةٍ جديدة) يوقف السابق تلقائياً.
 */
export interface PlayerTrack {
  /** معرّفٌ فريد (رابط البثّ عادةً) — للمقارنة وإبراز العنصر الجاري في قائمته. */
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  /** وجهة النقر على الشريط: «page» أو «page/sub» مثل «more/radios». */
  section: string;
  icon?: string;
  /**
   * موضعٌ اختياريٌّ داخل قائمة تشغيل — تستعمله التلاوة آية-بآية لتظليل الآية الجارية.
   * (`surah`/`ayah`؛ والبسملة تُرقَّم صفراً فلا تُظلَّل آيةٌ لا تُتلى بعد.)
   */
  mark?: { surah: number; ayah: number };
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerApi {
  track: PlayerTrack | null;
  status: PlayerStatus;
  volume: number;
  /** موضع المقطع الجاري في القائمة، و`queueLength` طولها (0 = مقطعٌ مفرد). */
  index: number;
  queueLength: number;
  /** يشغّل المقطع، أو يوقفه إن كان هو الجاري (تبديل). */
  toggle: (track: PlayerTrack) => void;
  /** يشغّل قائمةً متتابعة تبدأ من `startAt` — لتلاوة السورة آيةً آية. */
  playQueue: (tracks: PlayerTrack[], startAt?: number) => void;
  /** إيقافٌ مؤقّتٌ واستئنافٌ بلا فقدان الموضع. */
  togglePause: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  /**
   * عنصر الصوت نفسه — تحتاجه الصفحات التي تتبع الزمن (تظليل الآية مع السورة الكاملة).
   * يُقرأ منه `currentTime`/`duration` ويُشترَك في `timeupdate` **داخل الصفحة**،
   * فلا يُعاد رسم التطبيق كلّه أربع مرّاتٍ في الثانية.
   */
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerApi | null>(null);

const VOLUME_KEY = 'gt_player_volume';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [index, setIndex] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseInt(localStorage.getItem(VOLUME_KEY) ?? '', 10);
    return Number.isNaN(v) ? 80 : v;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // القائمة في ref لا في state: معالج `ended` يُنشَأ مرّةً ويجب أن يرى أحدث قائمة.
  const queueRef = useRef<PlayerTrack[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, track]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';
    queueRef.current = [];
    indexRef.current = 0;
    setIndex(0);
    setTrack(null);
    setStatus('idle');
  }, []);

  /** يشغّل عنصر القائمة رقم `i`، أو يتوقّف إن تجاوزناها. */
  const playAt = useCallback((i: number) => {
    const el = audioRef.current;
    const q = queueRef.current;
    if (!el) return;
    if (i < 0 || i >= q.length) {
      // بلغنا آخر القائمة — نُبقي آخر مقطعٍ ظاهراً في الشريط بلا تشغيل.
      setStatus('paused');
      return;
    }
    indexRef.current = i;
    setIndex(i);
    setTrack(q[i]);
    setStatus('loading');
    el.src = q[i].url;
    el.volume = volume / 100;
    el.play().catch(() => setStatus('error'));
  }, [volume]);

  const playQueue = useCallback((tracks: PlayerTrack[], startAt = 0) => {
    if (tracks.length === 0) return;
    queueRef.current = tracks;
    playAt(Math.max(0, Math.min(startAt, tracks.length - 1)));
  }, [playAt]);

  const toggle = useCallback(
    (next: PlayerTrack) => {
      const el = audioRef.current;
      if (!el) return;
      if (track?.id === next.id && status !== 'idle' && status !== 'error') {
        stop();
        return;
      }
      queueRef.current = [next];
      playAt(0);
    },
    [track, status, stop, playAt],
  );

  const togglePause = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    if (el.paused) {
      el.play().catch(() => setStatus('error'));
      setStatus('playing');
    } else {
      el.pause();
      setStatus('paused');
    }
  }, [track]);

  const next = useCallback(() => playAt(indexRef.current + 1), [playAt]);
  const prev = useCallback(() => playAt(indexRef.current - 1), [playAt]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem(VOLUME_KEY, String(v));
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        track,
        status,
        volume,
        index,
        queueLength: queueRef.current.length,
        toggle,
        playQueue,
        togglePause,
        next,
        prev,
        stop,
        setVolume,
        audioRef,
      }}
    >
      <audio
        ref={audioRef}
        onPlaying={() => setStatus('playing')}
        onWaiting={() => setStatus('loading')}
        onPause={() => setStatus((s) => (s === 'playing' ? 'paused' : s))}
        // الانتقال التلقائي إلى المقطع التالي — عليه تقوم التلاوة المتتابعة.
        onEnded={() => playAt(indexRef.current + 1)}
        onError={() => track && setStatus('error')}
        style={{ display: 'none' }}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer خارج PlayerProvider');
  return ctx;
}
