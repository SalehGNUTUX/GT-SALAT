import { useEffect, useState } from 'react';
import { Button } from './common';
import type { UpdateInfo } from '@electron/types';
import type { AppSettings } from '../hooks/useSettings';

/**
 * شريطٌ يظهر أعلى النافذة عند توفّر نسخةٍ جديدة، بزرٍّ يفتح صفحة التنزيل في المتصفّح.
 *
 * لا تنزيل ولا تثبيت تلقائي — التطبيق يُثبَّت من حزم النظام (DEB/RPM/AppImage)،
 * فمحاولة استبدال نفسه ستتعارض مع مدير الحزم. نكتفي بالإعلام وفتح الصفحة.
 * الإخفاء يُسجّل النسخة في الإعدادات فلا يُعاد إزعاج المستخدم بها.
 */
export function UpdateBanner({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // النتيجة المحفوظة من فحص الإقلاع (إن سبق الفحصُ فتحَ هذه الصفحة).
    window.gtSalat.update.last().then((i) => i?.available && setInfo(i));
    const unsub = window.gtSalat.update.onAvailable(setInfo);
    return () => { unsub(); };
  }, []);

  if (!info?.available || settings.dismissedUpdateVersion === info.latest) return null;

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
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>
          أنت على النسخة {info.current} — افتح صفحة الإصدار لتنزيل الحزمة المناسبة لتوزيعتك.
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={() => window.gtSalat.update.openPage()}>
        صفحة التنزيل ↗
      </Button>
      <Button
        size="sm"
        onClick={() => update({ dismissedUpdateVersion: info.latest })}
        style={{ padding: '6px 10px' }}
      >
        ✕
      </Button>
    </div>
  );
}
