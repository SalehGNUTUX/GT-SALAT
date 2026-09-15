import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { UpdateChannel, UpdateInfo, UpdateProgress } from '@electron/types';

/**
 * حالة التحديث **مزوّدٌ واحدٌ يلفّ التطبيق** لا حالةً في كلّ شاشة.
 *
 * التحديث يظهر في موضعين — شريطُ أعلى النافذة وبطاقةُ «حول» في الإعدادات الإضافية —
 * ولو كان لكلٍّ حالتُه لبدأ المستخدمُ التنزيلَ في أحدهما فرآه الآخرُ لم يبدأ، ولو ضغط
 * فيه لانطلق تنزيلٌ ثانٍ يكتب في الملفّ الجزئيّ نفسه. (العملية الرئيسية ترفض الثاني
 * أصلاً، لكنّ الواجهة لا ينبغي أن تعرضه.)
 */

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'uptodate'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'installed'
  | 'error';

export interface UpdaterApi {
  phase: UpdatePhase;
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
  /** الحزمة المنزَّلة الجاهزة للتثبيت. */
  file: string | null;
  /** تعذّر التثبيت التلقائيّ: الحزمة جاهزةٌ وهذا أمرُها ليُتمّها المستخدم بنفسه. */
  manual: { file: string; cmd?: string } | null;
  error: string;
  /** كيف رُكِّبت هذه النسخة — `dev` و`unknown` لا تُثبَّت من داخل التطبيق. */
  channel: UpdateChannel | null;
  /** هل يستطيع التطبيق تحديث نفسه هنا؟ (حزمةٌ مطابقةٌ + صيغةٌ معروفة) */
  canSelfUpdate: boolean;
  check: (silent?: boolean) => Promise<UpdateInfo | null>;
  download: () => Promise<void>;
  cancel: () => void;
  install: () => Promise<void>;
  restart: () => void;
  reveal: () => void;
  openPage: () => void;
  /** يُعرَض الشريط ثانيةً بعد فحصٍ طلبه المستخدم بنفسه. */
  adopt: (info: UpdateInfo) => void;
}

const UpdaterContext = createContext<UpdaterApi | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [manual, setManual] = useState<{ file: string; cmd?: string } | null>(null);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState<UpdateChannel | null>(null);
  const infoRef = useRef<UpdateInfo | null>(null);

  const adopt = useCallback((i: UpdateInfo) => {
    infoRef.current = i;
    setInfo(i);
    // لا نُرجِع تنزيلاً جارياً أو حزمةً جاهزةً إلى «متوفّرة» لمجرّد وصول بثٍّ جديد.
    setPhase((p) => (p === 'downloading' || p === 'ready' || p === 'installing' || p === 'installed' ? p : 'available'));
  }, []);

  useEffect(() => {
    void window.gtSalat.update.channel().then(setChannel);

    // نتيجةُ فحص الإقلاع إن سبق الفحصُ فتحَ هذه الشاشة، ثمّ بثُّ ما بعده.
    void window.gtSalat.update.last().then((i) => {
      if (i?.available) adopt(i);
    });
    const unsubAvailable = window.gtSalat.update.onAvailable((i) => adopt(i));
    const unsubProgress = window.gtSalat.update.onProgress(setProgress);
    return () => {
      unsubAvailable();
      unsubProgress();
    };
  }, [adopt]);

  const check = useCallback(
    async (silent = false) => {
      if (!silent) {
        setPhase('checking');
        setError('');
      }
      const res = await window.gtSalat.update.check();
      infoRef.current = res;
      setInfo(res);
      if (!res.checked) {
        if (!silent) {
          setError('تعذّر الاتصال — تحقّق من الإنترنت');
          setPhase('error');
        }
        return res;
      }
      if (res.available) setPhase('available');
      else if (!silent) setPhase('uptodate');
      return res;
    },
    [],
  );

  const download = useCallback(async () => {
    const asset = infoRef.current?.asset;
    if (!asset) return;
    setError('');
    setManual(null);
    setProgress({ received: 0, total: asset.size, percent: 0, bytesPerSecond: 0 });
    setPhase('downloading');
    const res = await window.gtSalat.update.download(asset);
    if (res.ok && res.file) {
      setFile(res.file);
      setProgress({ received: asset.size, total: asset.size, percent: 100, bytesPerSecond: 0 });
      setPhase('ready');
      return;
    }
    setProgress(null);
    if (res.cancelled) {
      setPhase('available');                 // الجزء المنزَّل باقٍ — الاستئناف يلتقطه
      return;
    }
    setError(res.error || 'تعذّر التنزيل');
    setPhase('error');
  }, []);

  const cancel = useCallback(() => {
    void window.gtSalat.update.cancel();
  }, []);

  const install = useCallback(async () => {
    if (!file) return;
    setError('');
    setPhase('installing');
    const res = await window.gtSalat.update.install(file);
    if (res.ok) {
      setPhase('installed');
      return;
    }
    if (res.manual) {
      setManual({ file: res.file || file, cmd: res.cmd });
      setPhase('ready');
      setError(installErrorText(res.error));
      return;
    }
    setError(installErrorText(res.error));
    setPhase('error');
  }, [file]);

  const value: UpdaterApi = {
    phase,
    info,
    progress,
    file,
    manual,
    error,
    channel,
    canSelfUpdate: !!info?.asset && channel !== 'dev' && channel !== 'unknown',
    check,
    download,
    cancel,
    install,
    restart: () => { void window.gtSalat.update.restart(); },
    reveal: () => { if (file) void window.gtSalat.update.reveal(file); },
    openPage: () => { void window.gtSalat.update.openPage(); },
    adopt,
  };

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

export function useUpdater(): UpdaterApi {
  const ctx = useContext(UpdaterContext);
  if (!ctx) throw new Error('useUpdater خارج UpdaterProvider');
  return ctx;
}

/** رسائل العملية الرئيسية المقتضبة تُترجَم إلى ما يفهمه المستخدم ويعرف منه ما يفعل. */
function installErrorText(err?: string): string {
  if (!err) return 'تعذّر التثبيت';
  if (err === 'not-writable') return 'لا صلاحية للكتابة في مجلّد الصورة — ثبّتها بنفسك بالأمر أدناه';
  if (err === 'dev-build') return 'هذه شجرة تطوير لا حزمةٌ مثبَّتة — لا شيء يُستبدَل';
  if (err === 'unknown-packaging') return 'لم يتبيّن كيف ثُبّتت هذه النسخة — ثبّت الحزمة بنفسك';
  if (/dismissed|not authorized|Error executing command as another user/i.test(err)) {
    return 'أُلغي طلب الصلاحيات — التثبيت يحتاج كلمة مرور المدير';
  }
  return err;
}

/** حجمٌ بالبايت إلى نصٍّ مقروء — يشترك فيه شريط التحديث وبطاقة الإعدادات. */
export function fmtBytes(n: number): string {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} م.ب`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} غ.ب`;
}
