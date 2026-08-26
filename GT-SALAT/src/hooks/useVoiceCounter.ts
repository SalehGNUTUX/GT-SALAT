import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * عدّادٌ صوتيٌّ يعمل **دون إنترنت** — منقولٌ عن `VoiceCounter.kt` في نسخة الهاتف بنفس أرقامه:
 * يراقب سعة الميكروفون، فكلّ **نطقةٍ** (ارتفاعٌ فوق العتبة ثمّ هبوط) تُحسَب مرّةً.
 * ليس تعرّفاً على كلمةٍ بعينها، بل استجابةٌ لصوت المُسبِّح.
 *
 * **العدّ عند نهاية النطقة لا بدايتها**، وبشرطِ مدّةٍ منطقيّةٍ لعبارةٍ قصيرة (220مل–3ث)
 * — وإلّا حُسبت نقرةُ لوحة المفاتيح والضجيجُ العابر تسبيحاً.
 *
 * فرقٌ عن الهاتف يجب الانتباه إليه: عيّنات Web Audio عشريّةٌ في المدى ‎-1..1‎، بينما هي
 * `int16` هناك — فعتبات الهاتف (3800..700) تُقسَم على 32768 كي تبقى الحساسيّة نفسها.
 */
const THRESHOLD_HIGH = 3800 / 32768; // حساسيّةٌ دنيا
const THRESHOLD_LOW = 700 / 32768;   // حساسيّةٌ قصوى
const HYSTERESIS = 0.55;             // نسبةُ الهبوط التي تُنهي النطقة
const MIN_MS = 220;                  // أدنى مدّةٍ لعبارةٍ قصيرة
const MAX_MS = 3000;                 // أقصى مدّة — يُقصي الضجيج المستمرّ
const DEBOUNCE_MS = 300;

export interface VoiceCounterState {
  active: boolean;
  error: string | null;
  /** مستوى الصوت الجاري (0..1 تقريباً) — لعرض مؤشّرٍ يطمئن المستخدم أنّ الميكروفون يعمل. */
  level: number;
}

export function useVoiceCounter(sensitivity: number, onCount: () => void) {
  const [state, setState] = useState<VoiceCounterState>({ active: false, error: null, level: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  // المعالج يُنشَأ مرّةً، فيجب أن يرى أحدث دالّة عدٍّ وأحدث حساسيّة — كقائمة المشغّل في `usePlayer`.
  const onCountRef = useRef(onCount);
  const sensRef = useRef(sensitivity);
  onCountRef.current = onCount;
  sensRef.current = sensitivity;

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setState((s) => ({ ...s, active: false, level: 0 }));
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      let above = false;
      let aboveStart = 0;
      let lastCount = 0;

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        const s = Math.min(100, Math.max(0, sensRef.current));
        const threshold = THRESHOLD_HIGH - (THRESHOLD_HIGH - THRESHOLD_LOW) * (s / 100);
        const now = performance.now();

        if (!above && rms > threshold) {
          above = true;
          aboveStart = now;
        } else if (above && rms < threshold * HYSTERESIS) {
          above = false;
          const dur = now - aboveStart;
          if (dur >= MIN_MS && dur <= MAX_MS && now - lastCount > DEBOUNCE_MS) {
            lastCount = now;
            onCountRef.current();
          }
        }

        setState((prev) => (Math.abs(prev.level - rms) > 0.005 ? { ...prev, level: rms } : prev));
        rafRef.current = requestAnimationFrame(tick);
      };

      setState({ active: true, error: null, level: 0 });
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState({ active: false, error: 'تعذّر الوصول إلى الميكروفون — تأكّد من توصيله ومن إذن التسجيل.', level: 0 });
    }
  }, []);

  // إغلاق الصفحة أو التطبيق لا يترك الميكروفون مفتوحاً.
  useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}
