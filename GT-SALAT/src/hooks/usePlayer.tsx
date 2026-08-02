import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * مشغّلٌ عالميٌّ واحدٌ لكل التطبيق (الإذاعات الآن، وتلاوة القرآن لاحقاً).
 *
 * **لماذا على مستوى التطبيق لا داخل الصفحة؟** لأن عنصر `<audio>` لو كان داخل صفحةٍ لتوقّف
 * البثّ لحظةَ مغادرتها (تُفكَّك المكوّنات). هنا يبقى العنصر حيّاً في `App`، فيستمرّ الصوت
 * أثناء التنقّل، ويبقى شريط المشغّل ظاهراً يعيدك إلى قسمه بنقرة.
 *
 * **مشغّلٌ واحدٌ لا غير**: تشغيل مقطعٍ جديد يوقف السابق تلقائياً، فلا يتراكب صوتان.
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
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error';

interface PlayerApi {
  track: PlayerTrack | null;
  status: PlayerStatus;
  volume: number;
  /** يشغّل المقطع، أو يوقفه إن كان هو الجاري (تبديل). */
  toggle: (track: PlayerTrack) => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

const VOLUME_KEY = 'gt_player_volume';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseInt(localStorage.getItem(VOLUME_KEY) ?? '', 10);
    return Number.isNaN(v) ? 80 : v;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, track]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';
    setTrack(null);
    setStatus('idle');
  }, []);

  const toggle = useCallback(
    (next: PlayerTrack) => {
      const el = audioRef.current;
      if (!el) return;
      if (track?.id === next.id && status !== 'idle' && status !== 'error') {
        stop();
        return;
      }
      setTrack(next);
      setStatus('loading');
      el.src = next.url;
      el.volume = volume / 100;
      el.play().catch(() => setStatus('error'));
    },
    [track, status, volume, stop],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem(VOLUME_KEY, String(v));
  }, []);

  return (
    <PlayerContext.Provider value={{ track, status, volume, toggle, stop, setVolume }}>
      <audio
        ref={audioRef}
        onPlaying={() => setStatus('playing')}
        onWaiting={() => setStatus('loading')}
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
