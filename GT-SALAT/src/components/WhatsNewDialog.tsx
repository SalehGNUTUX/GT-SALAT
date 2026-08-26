import { Button, Card } from './common';

/**
 * مستجدّات الإصدار الحاليّ — تُعرَض **مرّةً واحدةً** بعد التحديث، وتُتاح متى شاء المستخدم
 * من «إعدادات إضافية ← حول». نظيرُ `WhatsNew.kt` في نسخة الهاتف.
 *
 * **حدِّث `WHATS_NEW` مع كلّ إصدارٍ** ضِمن طقس الإصدار (بجانب `package.json` و`CHANGELOG.md`)
 * — نسخةٌ بلا مستجدّاتٍ محدَّثةٍ تعرض للمستخدم مستجدّات الإصدار الماضي فتُضلّله.
 */
export const WHATS_NEW = {
  version: '2.2.0',
  highlights: [
    '🌿 تذكيرُ السُّنن الموسميّة: عاشوراء وعرفة وعشر ذي الحجّة وستّ شوّال وصيام الاثنين والخميس وسنن الجمعة — رسالةٌ واحدةٌ في اليوم بأولويّة المناسبة.',
    '🎙️ وضعٌ صوتيٌّ للتسبيح: كلّ نطقةٍ تُحسَب تسبيحةً (يعمل دون إنترنت) بمنزلق حساسيّة.',
    '📿 التسبيح المختلط بنوعين متناوبين: «تسبيح» و«الباقيات الصالحات» — تتبدّل الكلمة مع كلّ عدّة، مع اختيار الذكر وهدفٍ بلا حدّ.',
    '⏹ زرُّ إيقاف الصوت في لوحة التحكّم يظهر فور تشغيل الأذان أو التنبيه أو الأذكار، ويُسمّي الصوت الجاري.',
    '🌍 قاعدةُ المواقع اتّسعت إلى 317 مدينةً في 88 دولة (كانت 82 مدينة) — تحديدُ الموقع دون إنترنت.',
    '🔎 توحيدُ تطبيع البحث مع نسخة الهاتف، فتتطابق نتائج البحث في النسختين.',
  ],
};

export function WhatsNewDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      {/* غلافٌ يوقف تصاعد النقر — `Card` لا يمرّر الحدث إلى معالجه. */}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
      <Card style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 4 }}>
          ✨ ما الجديد في GT-SALAT {WHATS_NEW.version}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
          هذه الرسالة تُعرَض مرّةً بعد التحديث — وتجدها متى شئت في «إعدادات إضافية ← حول».
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {WHATS_NEW.highlights.map((h) => (
            <div key={h} style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--fg-primary)' }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 20 }}>
          <Button onClick={onClose}>فهمت</Button>
        </div>
      </Card>
      </div>
    </div>
  );
}
