import { useEffect, useState } from 'react';
import { Button } from './common';
import type { AppSettings } from '../hooks/useSettings';

/** مدّة الصمت بعد الإغلاق العادي: أسبوعان — «بين الحين والآخر» لا في كل تشغيل. */
const SNOOZE_DAYS = 14;

/**
 * رسالةٌ تعرّف بنسخة الهاتف (أندرويد).
 *
 * تحترم المستخدم: «إغلاق» يُسكتها أسبوعين، و«لا تُظهرها ثانيةً» تُسكتها للأبد.
 * القرار محفوظٌ في الإعدادات لا في localStorage، فيبقى مع النسخ الاحتياطي وإعادة التثبيت.
 */
export function PhonePromoBanner({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const [phoneRepo, setPhoneRepo] = useState('');

  useEffect(() => {
    window.gtSalat.content.credits().then((c) => setPhoneRepo(c.phoneRepo));
  }, []);

  if (settings.phonePromoNever) return null;
  if (Date.now() < (settings.phonePromoUntil ?? 0)) return null;

  const snooze = () => update({ phonePromoUntil: Date.now() + SNOOZE_DAYS * 86_400_000 });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px',
        background: 'var(--accent-tint)',
        borderBottom: '1px solid var(--accent-border)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 18 }}>📱</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--teal-400)' }}>
          GT-SALAT متوفّر لهاتفك أيضاً
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>
          نسخة أندرويد بنفس المحتوى، مع الأذان في وقته والقبلة والودجت — بنكهةٍ حرّةٍ بلا خدمات Google.
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => { if (phoneRepo) window.gtSalat.app.openUrl(phoneRepo); snooze(); }}
      >
        تعرّف عليها ↗
      </Button>
      <Button size="sm" onClick={() => update({ phonePromoNever: true })}>
        لا تُظهرها ثانيةً
      </Button>
      <Button size="sm" onClick={snooze} style={{ padding: '6px 10px' }} title="إغلاق">
        ✕
      </Button>
    </div>
  );
}
