import { useEffect, useState } from 'react';
import type { AppSettings } from '../hooks/useSettings';
import { backgroundThumb, CUSTOM_BG, HOME_BACKGROUNDS } from '../utils/backgrounds';
import { Button, ChipGroup, SettingRow, Slider, Toggle } from './common';

interface Props {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}

/**
 * «خلفيّة لوحة التحكّم والزجاج» — نظير قسم «خلفيّة الرئيسيّة» في الهاتف: تفعيلٌ، واختيار صورةٍ
 * (مساجد مضمَّنة أو صورةٌ من الحاسوب)، ودرجة ظهور، والسمة الزجاجيّة وشدّة تغبيشها.
 */
export function HomeBackgroundSettings({ settings, update }: Props) {
  const dark = settings.theme !== 'light';
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    window.gtSalat.background.customUrl().then(setCustomUrl);
  }, [settings.customBackgroundStamp]);

  const pick = async () => {
    setMsg('');
    const r = await window.gtSalat.background.pickCustom();
    if (r.error) setMsg(r.error);
  };

  const tile = (active: boolean): React.CSSProperties => ({
    position: 'relative',
    width: 150,
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: active ? '3px solid var(--teal-500)' : '1px solid var(--border-subtle)',
    cursor: 'pointer',
    background: 'var(--bg-elevated)',
    padding: 0,
    textAlign: 'right',
  });

  return (
    <>
      <SettingRow label="صورةٌ خلف لوحة التحكّم" sub="مساجد مختارة، أو صورةٌ من حاسوبك">
        <Toggle on={settings.homeBackgroundEnabled} onChange={(v) => update({ homeBackgroundEnabled: v })} />
      </SettingRow>

      {settings.homeBackgroundEnabled && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 0' }}>
            {HOME_BACKGROUNDS.map((b) => {
              const active = settings.homeBackgroundId === b.id;
              return (
                <button key={b.id} onClick={() => update({ homeBackgroundId: b.id })} title={`${b.title} — ${b.place}`} style={tile(active)}>
                  <img src={backgroundThumb(b.id, dark)} alt="" style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '4px 8px 6px', fontSize: 11.5, color: 'var(--fg-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.title}
                  </div>
                </button>
              );
            })}
            {/* صورة المستخدم: تظهر إن وُجدت، وزرّ إضافتها دائماً */}
            {customUrl && (
              <button onClick={() => update({ homeBackgroundId: CUSTOM_BG })} title="صورتك" style={tile(settings.homeBackgroundId === CUSTOM_BG)}>
                <img src={customUrl} alt="" style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '4px 8px 6px', fontSize: 11.5, color: 'var(--fg-secondary)' }}>صورتك</div>
              </button>
            )}
            <button
              onClick={pick}
              title="اختر صورةً من حاسوبك"
              style={{ ...tile(false), height: 116, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--teal-400)', borderStyle: 'dashed' }}
            >
              <span style={{ fontSize: 26 }}>🖼️</span>
              <span style={{ fontSize: 12 }}>{customUrl ? 'استبدال صورتك' : 'صورةٌ من حاسوبك'}</span>
            </button>
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 8 }}>{msg}</div>}
          {customUrl && (
            <SettingRow label="صورتك" sub="نسخةٌ مصغّرةٌ محفوظةٌ داخل التطبيق، ولا تُدرَج في النسخ الاحتياطيّ">
              <Button size="sm" onClick={() => window.gtSalat.background.removeCustom()}>حذف صورتك</Button>
            </SettingRow>
          )}
          <SettingRow label="درجة ظهور الصورة" sub="الأهدأ أوضح للنصوص، والأوضح أبرز للصورة">
            <ChipGroup<number>
              value={settings.homeBackgroundLevel}
              options={[{ value: 0, label: 'هادئة' }, { value: 1, label: 'متوازنة' }, { value: 2, label: 'واضحة' }]}
              onChange={(v) => update({ homeBackgroundLevel: v })}
            />
          </SettingRow>
        </>
      )}

      <SettingRow label="السمة الزجاجيّة" sub="لوحاتٌ شفّافةٌ فوق الخلفيّة في كلّ الأقسام، والصورة مموَّهةٌ خارج لوحة التحكّم">
        <Toggle on={settings.glassTheme} onChange={(v) => update({ glassTheme: v })} />
      </SettingRow>
      <SettingRow label="شدّة التغبيش" sub="0 خلفيّةٌ حادّة خلف البطاقات · 100 تمويهٌ كامل">
        <div style={{ width: 240 }}>
          <Slider value={settings.glassBlur} min={0} max={100} step={5} onCommit={(v) => update({ glassBlur: v })} />
        </div>
      </SettingRow>
    </>
  );
}
