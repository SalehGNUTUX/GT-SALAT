import { Button } from './common';
import { UpdateFlow } from './UpdateFlow';
import { useUpdater } from '../hooks/useUpdater';
import type { AppSettings } from '../hooks/useSettings';

/**
 * شريطٌ يظهر أعلى النافذة عند توفّر نسخةٍ جديدة — **ويُحدِّث من مكانه**: تنزيلٌ بتقدّمٍ
 * ظاهر ثمّ تثبيتٌ بالطريق الذي رُكِّبت به هذه النسخة (صورة تستبدل نفسها، أو حزمةٌ
 * تُسلَّم لمدير الحزم)، فلا انتقال إلى المستودع وجلبٌ يدويّ.
 *
 * وحين لا حزمة تطابق هذه النسخة (شجرة تطوير، أو معماريةٌ لم تُنشَر لها حزمة) يبقى
 * الزرّ الوحيد صفحةَ الإصدار — لا زرَّ تحديثٍ لا يستطيع الوفاء بما يَعِد.
 *
 * والإخفاء يُسجّل النسخة في الإعدادات فلا يُعاد إزعاج المستخدم بها، ولا يُخفى الشريط
 * أثناء تنزيلٍ أو تثبيتٍ جارٍ فيضيع من المستخدم أثرُ ما بدأه.
 */
export function UpdateBanner({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const u = useUpdater();
  const info = u.info;
  const busy = u.phase === 'downloading' || u.phase === 'installing' || u.phase === 'ready' || u.phase === 'installed';

  if (!info?.available) return null;
  if (settings.dismissedUpdateVersion === info.latest && !busy) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px',
        background: 'rgba(245,197,24,0.1)',
        borderBottom: '1px solid var(--gold-600)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 18 }}>⬆️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gold-500)' }}>
          توفّرت نسخة GT-SALAT {info.latest}
          {info.prerelease && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}> (تجريبيّة)</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>
          {u.canSelfUpdate
            ? `أنت على النسخة ${info.current} — نزّلها وثبّتها من هنا دون مغادرة التطبيق.`
            : `أنت على النسخة ${info.current} — افتح صفحة الإصدار لتنزيل الحزمة المناسبة لتوزيعتك.`}
        </div>
      </div>

      <UpdateFlow compact />

      {!busy && (
        <Button
          size="sm"
          onClick={() => update({ dismissedUpdateVersion: info.latest })}
          style={{ padding: '6px 10px' }}
          title="إخفاء حتى النسخة القادمة"
        >
          ✕
        </Button>
      )}
    </div>
  );
}
