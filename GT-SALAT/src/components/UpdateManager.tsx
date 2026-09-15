import { useEffect, useState } from 'react';
import { Button, SettingRow, Toggle } from './common';
import { UpdateFlow } from './UpdateFlow';
import { fmtBytes, useUpdater } from '../hooks/useUpdater';
import type { UpdateChannel } from '@electron/types';
import type { AppSettings } from '../hooks/useSettings';

/**
 * إدارة التحديث في «حول GT-SALAT»: فحصٌ، ثمّ تنزيلٌ وتثبيتٌ من داخل التطبيق،
 * وملاحظاتُ الإصدار، ومساحةُ الحزم المنزَّلة.
 *
 * والصيغةُ تُعلَن صراحةً (صورة · DEB · RPM · شجرة تطوير) لأنّ طريق التثبيت يختلف
 * بها: صاحبُ الصورة تُستبدَل صورتُه، وصاحبُ الحزمة يُطلَب منه إذنُ المدير. فلو
 * أُخفيت لبدا طلبُ كلمة المرور مفاجئاً بلا سبب.
 */

const CHANNEL_TEXT: Record<UpdateChannel, { label: string; how: string }> = {
  appimage: { label: 'AppImage', how: 'تُستبدَل الصورة نفسها ثمّ يُعاد التشغيل — بلا صلاحيات مدير' },
  deb: { label: 'حزمة DEB', how: 'تُسلَّم الحزمة إلى مدير حزم النظام — يُطلَب إذن المدير مرّة' },
  rpm: { label: 'حزمة RPM', how: 'تُسلَّم الحزمة إلى مدير حزم النظام — يُطلَب إذن المدير مرّة' },
  dev: { label: 'شجرة تطوير', how: 'لا تثبيت من داخل التطبيق — هذه ليست نسخةً محزَّمة' },
  unknown: { label: 'تثبيتٌ يدويّ', how: 'لم يدّعِ مدير حزمٍ هذه النسخة — تُنزَّل الحزمة وتُثبَّت يدوياً' },
};

export function UpdateManager({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const u = useUpdater();
  const [packages, setPackages] = useState<{ bytes: number; files: number }>({ bytes: 0, files: 0 });

  const refreshPackages = () => { void window.gtSalat.update.packagesSize().then(setPackages); };
  useEffect(refreshPackages, [u.phase]);

  const ch = u.channel ? CHANNEL_TEXT[u.channel] : null;

  return (
    <>
      <SettingRow label="التنبيه عند توفّر نسخةٍ جديدة" sub="فحصٌ خفيفٌ لصفحة إصدارات GitHub عند بدء التشغيل">
        <Toggle on={settings.checkUpdates} onChange={(v) => update({ checkUpdates: v })} />
      </SettingRow>

      <SettingRow
        label="قبول النسخ التجريبيّة"
        sub="تشمل الفحصَ إصداراتٍ موسومةً تجريبيّةً (beta) — مطفأٌ افتراضياً"
      >
        <Toggle
          on={settings.allowPrereleaseUpdates}
          onChange={(v) => update({ allowPrereleaseUpdates: v })}
        />
      </SettingRow>

      <SettingRow label="طريقة تثبيت هذه النسخة" sub={ch?.how}>
        <span style={{ fontSize: 12.5, color: 'var(--fg-secondary)' }}>{ch?.label ?? '…'}</span>
      </SettingRow>

      <SettingRow
        label="التحديث"
        sub={
          u.phase === 'uptodate'
            ? '✓ أنت على أحدث نسخة'
            : u.info?.available
              ? `توفّرت ${u.info.latest}${u.info.asset ? ` · ${u.info.asset.name}` : ' · لا حزمة تطابق هذه النسخة'}`
              : undefined
        }
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="sm"
            disabled={u.phase === 'checking' || u.phase === 'downloading' || u.phase === 'installing'}
            onClick={async () => {
              const info = await u.check();
              // الفحص بطلب المستخدم يُعيد إظهار الشريط ولو سبق إخفاؤه لهذه النسخة.
              if (info?.available && settings.dismissedUpdateVersion === info.latest) {
                void update({ dismissedUpdateVersion: '' });
              }
            }}
          >
            {u.phase === 'checking' ? '… يفحص' : '🔄 فحص الآن'}
          </Button>
        </div>
      </SettingRow>

      {(u.info?.available || u.phase === 'error' || u.manual) && (
        <div style={{ padding: '4px 0 12px' }}>
          <UpdateFlow />
        </div>
      )}

      {u.info?.available && u.info.notes && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ fontSize: 12.5, color: 'var(--teal-400)', cursor: 'pointer' }}>
            ما في النسخة {u.info.latest}
          </summary>
          <div
            style={{
              fontSize: 12,
              color: 'var(--fg-secondary)',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              maxHeight: 260,
              overflowY: 'auto',
              marginTop: 8,
              padding: 10,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {cleanNotes(u.info.notes)}
          </div>
        </details>
      )}

      {packages.files > 0 && (
        <SettingRow label="الحزم المنزَّلة" sub={`${packages.files} ملفّاً · ${fmtBytes(packages.bytes)}`}>
          <Button
            size="sm"
            disabled={u.phase === 'downloading' || u.phase === 'installing'}
            onClick={async () => {
              await window.gtSalat.update.clearPackages();
              refreshPackages();
            }}
          >
            🗑 تفريغ
          </Button>
        </SettingRow>
      )}
    </>
  );
}

/**
 * ملاحظات الإصدار تأتي بصيغة Markdown، وعرضُها خاماً يُظهر النجوم والشَّرَطات حروفاً
 * بين يدي القارئ. ولا داعي لمكتبة Markdown كاملة لبطاقةٍ كهذه: يكفي تجريدُ ما يَرِد
 * فعلاً في سجلّ هذا المشروع — العناوين والعريض والشيفرة والفواصل.
 */
function cleanNotes(md: string): string {
  return md
    .split('\n')
    .filter((l) => !/^-{3,}\s*$/.test(l.trim()))
    .map((l) =>
      l
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\s*[-*]\s+/, '• ')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1'),
    )
    .join('\n')
    .trim();
}
