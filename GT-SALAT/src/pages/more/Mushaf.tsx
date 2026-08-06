import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ChipGroup, Toggle } from '../../components/common';
import type { DownloadTask, QuranMeta, SurahMeta } from '@electron/types';
import { pageImageUrl, pageImageFallbacks, mushafRel, TOTAL_PAGES } from '@electron/quran';
import type { AppSettings } from '../../hooks/useSettings';

/**
 * المصحف المصوَّر — 604 صفحة بروايتَي حفص وورش.
 *
 * الصور تُجلب من الشبكة (مستودعا Quran-PNG وQuranHub)، ولهذا وُسِّع `img-src` في الـCSP
 * إلى https — توسيعٌ مقصورٌ على الصور، والسكربتات و`connect-src` تبقى محصورة.
 *
 * **قلب الألوان في الوضع الداكن يتبع سِمة التطبيق لا سِمة النظام** — وإلّا بهت المصحف
 * عند فرض وضعٍ مخالفٍ لسِمة النظام (نفس المزلق المثبَّت في نسخة الهاتف).
 */
export function MushafPage({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const [meta, setMeta] = useState<QuranMeta | null>(null);
  const [page, setPage] = useState(() => clamp(settings.lastMushafPage || 1));
  const [jumpOpen, setJumpOpen] = useState(false);
  const [task, setTask] = useState<DownloadTask | null>(null);
  const [stat, setStat] = useState<{ files: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const riwaya = settings.mushafRiwaya || 'hafs';
  const dark = settings.theme === 'dark';
  const invert = dark && settings.mushafInvert !== false;

  useEffect(() => {
    window.gtSalat.content.quranMeta().then(setMeta);
    window.gtSalat.downloads.current().then(setTask);
    const unsub = window.gtSalat.downloads.onProgress(setTask);
    return () => { unsub(); };
  }, []);

  const riwayaRef = settings.mushafRiwaya || 'hafs';
  const refreshStat = () => window.gtSalat.downloads.stat('mushaf', riwayaRef, TOTAL_PAGES).then(setStat);
  useEffect(() => { refreshStat(); }, [riwayaRef, task?.running]);

  // الحذف المؤجَّل بمهلة تراجع — لا تضيع 604 صفحةٍ بنقرةٍ خاطئة.
  useEffect(() => {
    if (!pendingDelete) return;
    const t = setTimeout(async () => {
      await window.gtSalat.downloads.remove('mushaf', riwayaRef);
      setPendingDelete(false);
      refreshStat();
    }, 7000);
    return () => clearTimeout(t);
  }, [pendingDelete, riwayaRef]);

  // حفظ الصفحة الأخيرة — يُبثّ إلى الإعدادات بعد استقرار التصفّح لا مع كل ضغطة.
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== settings.lastMushafPage) update({ lastMushafPage: page });
    }, 700);
    return () => clearTimeout(t);
  }, [page]);

  // الأسهم للتنقّل: في مصحفٍ عربيٍّ الصفحة التالية إلى اليسار.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') setPage((p) => clamp(p + 1));
      if (e.key === 'ArrowRight') setPage((p) => clamp(p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const surahs = meta?.surahs ?? [];
  /** السورة التي تبدأ عندها هذه الصفحة أو قبلها — لعرض اسمها في الترويسة. */
  const currentSurah: SurahMeta | undefined = useMemo(
    () => [...surahs].reverse().find((s) => (s.page ?? 1) <= page),
    [surahs, page],
  );
  const currentJuz = useMemo(
    () => [...(meta?.juz ?? [])].reverse().find((j) => j.page <= page)?.n,
    [meta, page],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ترويسةٌ ثابتة */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <ChipGroup<string>
            value={riwaya}
            options={[{ value: 'hafs', label: 'حفص' }, { value: 'warsh', label: 'ورش' }]}
            onChange={(v) => update({ mushafRiwaya: v })}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => clamp(p - 1))}>
              ❯ السابقة
            </Button>
            <input
              type="number"
              min={1}
              max={TOTAL_PAGES}
              value={page}
              onChange={(e) => setPage(clamp(parseInt(e.target.value, 10) || 1))}
              className="mono"
              style={{
                width: 74,
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                fontSize: 13,
                color: 'var(--fg-primary)',
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>/ {TOTAL_PAGES}</span>
            <Button size="sm" disabled={page >= TOTAL_PAGES} onClick={() => setPage((p) => clamp(p + 1))}>
              التالية ❮
            </Button>
          </div>

          <Button size="sm" variant="secondary" onClick={() => setJumpOpen((v) => !v)}>
            📖 انتقل إلى سورة
          </Button>

          <div style={{ flex: 1 }} />

          <div style={{ fontSize: 12.5, color: 'var(--gold-500)' }}>
            {currentSurah ? `سورة ${currentSurah.ar}` : ''}
            {currentJuz ? ` · الجزء ${currentJuz}` : ''}
          </div>

          {/* تنزيل الرواية الحالية للعمل دون إنترنت */}
          {(() => {
            const mine = task && task.kind === 'mushaf' && task.key === riwaya;
            const running = !!mine && task!.running;
            const files = pendingDelete ? 0 : stat?.files ?? 0;
            const complete = files >= TOTAL_PAGES;
            if (pendingDelete) {
              return <Button size="sm" variant="secondary" onClick={() => setPendingDelete(false)}>↺ تراجع الحذف</Button>;
            }
            if (running) {
              return (
                <Button size="sm" variant="danger" onClick={() => window.gtSalat.downloads.cancel()}>
                  إلغاء ({Math.round((task!.done / Math.max(1, task!.total)) * 100)}٪)
                </Button>
              );
            }
            if (complete) {
              return <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>🗑️ حذف المُنزَّل</Button>;
            }
            return (
              <Button
                size="sm"
                variant="secondary"
                disabled={!!task?.running}
                onClick={() => window.gtSalat.downloads.start('mushaf', riwaya, {})}
                title="تنزيل 604 صفحة للعمل دون إنترنت"
              >
                ⬇ تنزيل {files > 0 ? `(${files}/${TOTAL_PAGES})` : ''}
              </Button>
            );
          })()}

          {dark && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>قلب الألوان</span>
              <Toggle on={invert} onChange={(v) => update({ mushafInvert: v })} />
            </div>
          )}
        </div>

        {confirming && (
          <Card style={{ marginBottom: 14, padding: '12px 16px', borderColor: 'var(--color-error)' }}>
            <div style={{ fontSize: 13, color: 'var(--fg-primary)', marginBottom: 10 }}>
              حذف صفحات المصحف المُنزَّلة برواية {riwaya === 'warsh' ? 'ورش' : 'حفص'}؟ ستبقى مهلةُ تراجعٍ بعد التأكيد.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="danger" onClick={() => { setConfirming(false); setPendingDelete(true); }}>
                نعم، احذف
              </Button>
              <Button size="sm" onClick={() => setConfirming(false)}>إلغاء</Button>
            </div>
          </Card>
        )}

        {jumpOpen && (
          <Card style={{ marginBottom: 14, padding: '14px 16px', maxHeight: 260, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
              {surahs.map((s) => (
                <button
                  key={s.n}
                  onClick={() => { setPage(clamp(s.page ?? 1)); setJumpOpen(false); }}
                  style={{
                    textAlign: 'right',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--fg-primary)',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--teal-400)', marginLeft: 6 }}>{s.n}</span>
                  {s.ar}
                  <span style={{ color: 'var(--fg-muted)', fontSize: 10.5 }}> · ص{s.page}</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* الصفحة */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', minHeight: 0 }}>
        <PageImage page={page} riwaya={riwaya} invert={invert} />
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 10 }}>
          تنقّل بالسهمين ← → · الصور من {riwaya === 'warsh' ? 'مجمّع الملك فهد (QuranHub)' : 'مصحف المدينة (Quran-PNG)'}
        </div>
      </div>
    </div>
  );
}

function clamp(p: number): number {
  return Math.max(1, Math.min(TOTAL_PAGES, p));
}

/** صورة الصفحة مع سلسلة مصادرَ بديلةٍ تُجرَّب بالترتيب عند تعذّر الأساسي. */
function PageImage({ page, riwaya, invert }: { page: number; riwaya: string; invert: boolean }) {
  const [local, setLocal] = useState<string | null>(null);
  const remote = useMemo(
    () => [pageImageUrl(page, riwaya), ...pageImageFallbacks(page, riwaya)],
    [page, riwaya],
  );
  // المُنزَّل أولاً ثم الشبكة — فتعمل الصفحة دون إنترنت متى نُزِّلت.
  const urls = local ? [local, ...remote] : remote;
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIdx(0);
    setLoaded(false);
    setLocal(null);
    window.gtSalat.downloads.localUrl(mushafRel(page, riwaya)).then(setLocal);
  }, [page, riwaya]);

  const failed = idx >= urls.length;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 320,
        background: invert ? 'var(--bg-base)' : '#fff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        padding: 8,
      }}
    >
      {failed ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-error)', fontSize: 13 }}>
          تعذّر تحميل الصفحة {page} — تحقّق من الإنترنت أو جرّب الرواية الأخرى.
        </div>
      ) : (
        <>
          {!loaded && (
            <div style={{ position: 'absolute', color: 'var(--fg-muted)', fontSize: 13 }}>… تحميل الصفحة {page}</div>
          )}
          <img
            src={urls[idx]}
            alt={`صفحة ${page}`}
            onLoad={() => setLoaded(true)}
            onError={() => setIdx((i) => i + 1)}
            style={{
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              // القلب يجعل الورق أسود والحبر أبيض — أريح للعين في الوضع الداكن.
              filter: invert ? 'invert(1) hue-rotate(180deg)' : 'none',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />
        </>
      )}
    </div>
  );
}
