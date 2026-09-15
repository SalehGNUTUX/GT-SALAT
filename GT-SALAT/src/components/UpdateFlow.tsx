import { useState } from 'react';
import { Button } from './common';
import { fmtBytes, useUpdater } from '../hooks/useUpdater';

/**
 * أزرار التحديث وشريط تقدّمه — **مكوّنٌ واحدٌ** يستعمله شريطُ أعلى النافذة وبطاقةُ
 * «حول» في الإعدادات الإضافية، فلا يفترق سلوكُ التحديث بين موضعَي ظهوره.
 *
 * والحالة كلّها من `useUpdater` (مزوّدٌ واحدٌ يلفّ التطبيق)، فالتنزيل الذي يبدأ في
 * الشريط يُرى جارياً في الإعدادات ويُثبَّت من أيّهما.
 */
export function UpdateFlow({ compact = false }: { compact?: boolean }) {
  const u = useUpdater();
  const [copied, setCopied] = useState(false);

  const busy = u.phase === 'downloading' || u.phase === 'installing';
  const pct = u.progress ? Math.round(u.progress.percent) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: compact ? 260 : undefined }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* حزمةٌ مطابقةٌ لهذه النسخة ⇒ يُنزَّل ويُثبَّت من هنا. وإلّا فالصفحةُ وحدها. */}
        {u.canSelfUpdate && (u.phase === 'available' || u.phase === 'error') && (
          <Button variant="primary" size="sm" onClick={() => void u.download()}>
            ⬇️ نزّل وثبّت{u.info?.asset ? ` (${fmtBytes(u.info.asset.size)})` : ''}
          </Button>
        )}

        {u.phase === 'downloading' && (
          <>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }} className="mono">
              {pct}%
              {u.progress && u.progress.bytesPerSecond > 0 && (
                <span style={{ color: 'var(--fg-muted)' }}> · {fmtBytes(u.progress.bytesPerSecond)}/ث</span>
              )}
            </span>
            <Button size="sm" onClick={u.cancel}>إيقاف</Button>
          </>
        )}

        {u.phase === 'ready' && (
          <Button variant="primary" size="sm" onClick={() => void u.install()}>
            ⚙️ ثبّت الآن
          </Button>
        )}

        {u.phase === 'installing' && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-secondary)' }}>… يُثبّت (قد يُطلَب إذن المدير)</span>
        )}

        {u.phase === 'installed' && (
          <>
            <span style={{ fontSize: 12.5, color: 'var(--color-success)' }}>✓ ثُبِّتت النسخة الجديدة</span>
            <Button variant="primary" size="sm" onClick={u.restart}>↻ أعد التشغيل الآن</Button>
          </>
        )}

        {u.phase !== 'installed' && !busy && (
          <Button size="sm" onClick={u.openPage}>صفحة الإصدار ↗</Button>
        )}
      </div>

      {u.phase === 'downloading' && u.progress && (
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--teal-500)',
              transition: 'width 0.25s linear',
            }}
          />
        </div>
      )}

      {u.phase === 'downloading' && u.progress && !compact && (
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }} className="mono">
          {fmtBytes(u.progress.received)} من {fmtBytes(u.progress.total)}
          {u.info?.asset?.sha256 && ' · ستُطابَق البصمة المنشورة بعد التنزيل'}
        </div>
      )}

      {u.error && (
        <div style={{ fontSize: 11.5, color: 'var(--color-warning)', lineHeight: 1.7 }}>
          ⚠ {u.error}
        </div>
      )}

      {/* تعذّر التثبيت التلقائيّ — الحزمة منزَّلةٌ ومُتحقَّقٌ منها، فيُعطى المستخدم أمرَها */}
      {u.manual && (
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
            الحزمة جاهزةٌ في جهازك — أتمّ التثبيت بنفسك:
          </div>
          {u.manual.cmd && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code
                className="mono"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11.5,
                  direction: 'ltr',
                  textAlign: 'left',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  color: 'var(--teal-400)',
                }}
              >
                {u.manual.cmd}
              </code>
              {/* أمرُ طرفيةٍ لا محتوىً يُشارَك — فلا يمرّ بتوقيع المشاركة وإلّا فسد الأمر */}
              <Button
                size="sm"
                onClick={async () => {
                  await window.gtSalat.app.copy(u.manual!.cmd!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? '✓ نُسخ' : '⧉ نسخ'}
              </Button>
            </div>
          )}
          <div>
            <Button size="sm" onClick={u.reveal}>📁 أظهر الحزمة</Button>
          </div>
        </div>
      )}
    </div>
  );
}
