import { useEffect, useState } from 'react';
import type { TimeZoneStatus } from '@electron/types';
import { Button, ChipGroup, SettingRow } from './common';

/** "GMT+01:00" بأرقامٍ 0-9 من إزاحةٍ بالدقائق شرقَ غرينتش. */
function gmt(minutes: number | null): string {
  if (minutes == null) return 'غير معروف';
  const sign = minutes < 0 ? '-' : '+';
  const a = Math.abs(minutes);
  return `GMT${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

/**
 * توقيت التطبيق: تلقائيّ يتبع إزاحة النظام الفعليّة (ولو قَدُمت بيانات المناطق في Electron)،
 * أو يدويّ بإزاحةٍ يختارها المستخدم. التطبيق يُعيد فتح نافذته ليسري التغيير على الواجهة.
 */
export function TimeZoneSetting() {
  const [st, setSt] = useState<TimeZoneStatus | null>(null);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [hours, setHours] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.gtSalat.time.status().then((s) => {
      setSt(s);
      setMode(s.mode);
      setHours(s.mode === 'manual' ? Math.round(s.appOffset / 60) : Math.round((s.systemOffset ?? s.appOffset) / 60));
    });
  }, []);

  if (!st) return null;

  const dirty = mode !== st.mode || (mode === 'manual' && hours * 60 !== st.appOffset);
  const apply = async () => {
    setBusy(true);
    // النافذة تُستبدَل بعد هذا النداء فتعود إلى هذه الصفحة بالحال الجديدة.
    const s = await window.gtSalat.time.set(mode, hours);
    setSt(s);
    setBusy(false);
  };

  let sub = `النظام: ${gmt(st.systemOffset)} · التطبيق: ${gmt(st.appOffset)}`;
  if (st.mode === 'auto' && st.applied) sub += ' — صُحِّح تلقائيّاً لأنّ بيانات المناطق المضمَّنة قديمة';
  if (st.unsupported) sub += ' — اختلافٌ بإزاحةٍ نصفيّة لا يُصحَّح تلقائيّاً، فاختر الوضع اليدويّ';

  return (
    <>
      <SettingRow label="توقيت التطبيق" sub={sub}>
        <ChipGroup<'auto' | 'manual'>
          value={mode}
          options={[{ value: 'auto', label: 'يتبع النظام' }, { value: 'manual', label: 'يدويّ' }]}
          onChange={setMode}
        />
      </SettingRow>
      {mode === 'manual' && (
        <SettingRow label="الإزاحة عن غرينتش" sub="اختر إزاحة بلدك الحاليّة إن كان وقت التطبيق لا يطابق ساعتك">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button size="sm" disabled={hours <= -12} onClick={() => setHours(hours - 1)}>−</Button>
            <span className="mono" style={{ fontSize: 13, color: 'var(--teal-400)', minWidth: 86, textAlign: 'center' }}>
              {gmt(hours * 60)}
            </span>
            <Button size="sm" disabled={hours >= 14} onClick={() => setHours(hours + 1)}>+</Button>
          </div>
        </SettingRow>
      )}
      {dirty && (
        <SettingRow label="" sub="تُعاد نافذة التطبيق ليسري التوقيت الجديد على الواجهة والأذان.">
          <Button size="sm" disabled={busy} onClick={apply}>تطبيق</Button>
        </SettingRow>
      )}
    </>
  );
}
