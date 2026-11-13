import { useEffect, useState } from 'react';
import { Card, Button, Toggle, SectionTitle, SettingRow } from '../components/common';
import { SettingsCardsGrid, SettingsPageCtx, SettingsPageHeader, TitledSection, useSettingsPage, type SettingsCategory } from '../components/SettingsCards';
import { PlacePicker } from '../components/PlacePicker';
import type { AppSettings } from '../hooks/useSettings';
import type { PlaceEntry } from '@electron/types';

interface Props {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  onOpenAdvanced: () => void;
}

export function SettingsPage({ settings, update, onOpenAdvanced }: Props) {
  // شكل البطاقات (كالإعدادات الإضافيّة والهاتف 2.2): يحكمه `settingsCards` نفسه، ويُبدَّل في «المظهر».
  const cards = settings.settingsCards !== false;
  const [page, setPage] = useSettingsPage(cards);
  const categories: SettingsCategory[] = [
    { title: 'الموقع الجغرافي', icon: '📍', sub: 'المدينة والإحداثيّات وطريقة الحساب' },
    { title: 'الإشعارات', icon: '🔔', sub: 'تنبيهات الصلاة والأذكار والأذان' },
    { title: 'تكامل الطرفية (اختياري)', icon: '💻', sub: 'البسملة والذكر والصلاة في الطرفيّة' },
    { title: 'النظام', icon: '⚙️', sub: 'البدء مع الجهاز وشريط المهام' },
    { title: 'إجراءات', icon: '🔧', sub: 'تحديث الجداول وإعادة الضبط' },
    { title: 'الإعدادات الإضافية', icon: '🎛️', sub: 'المذهب والصوت والتقويم والمظهر', onOpen: onOpenAdvanced },
  ];
  const [methods, setMethods] = useState<{ id: number; nameAr: string }[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [installedShells, setInstalledShells] = useState<string[]>([]);
  const [shellApplyStatus, setShellApplyStatus] = useState<string>('');
  const [shellConfirmReset, setShellConfirmReset] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    window.gtSalat.prayer.methods().then(setMethods);
    window.gtSalat.autostart.get().then(setAutoStartEnabled);
    window.gtSalat.shell.detect().then(setInstalledShells);
  }, []);

  const detect = async () => {
    setDetecting(true);
    try {
      const loc = await window.gtSalat.prayer.autoDetect();
      if (loc) {
        const method = methods.find((m) => m.id === loc.suggestedMethodId);
        await update({
          lat: loc.lat,
          lon: loc.lon,
          city: loc.city,
          country: loc.country,
          methodId: loc.suggestedMethodId,
          methodName: method?.nameAr ?? '',
        });
      } else {
        alert('تعذّر اكتشاف الموقع تلقائياً. الرجاء إدخاله يدوياً.');
      }
    } finally {
      setDetecting(false);
    }
  };

  const doApplyShell = async () => {
    const shells = settings.terminalShells.length > 0 ? settings.terminalShells : installedShells;
    const res = await window.gtSalat.shell.apply({
      enabledShells: shells,
      showZikr: settings.terminalZikrNotify,
      showSalat: settings.terminalSalatNotify,
    });
    const ok = (res as Array<{ ok: boolean }>).every((r) => r.ok);
    setShellApplyStatus(ok ? '✓ تم تطبيق تكامل الطرفية' : '⚠ فشل بعض أنواع الصدفات');
    setTimeout(() => setShellApplyStatus(''), 4000);
  };

  const applyShellIntegration = async () => {
    const checks = await window.gtSalat.shell.check() as { shell: string; exists: boolean }[];
    const shells = settings.terminalShells.length > 0 ? settings.terminalShells : installedShells;
    const alreadyExists = checks.some((c) => shells.includes(c.shell) && c.exists);
    if (alreadyExists) {
      setShellConfirmReset(true);
    } else {
      await doApplyShell();
    }
  };

  const removeShellIntegration = async () => {
    await window.gtSalat.shell.remove();
    await update({ terminalSalatNotify: false, terminalZikrNotify: false, terminalShells: [] });
    setShellApplyStatus('✓ تمت إزالة التكامل من جميع الصدفات');
    setTimeout(() => setShellApplyStatus(''), 4000);
  };

  const toggleShell = (name: string) => {
    const current = new Set(settings.terminalShells);
    if (current.has(name)) current.delete(name);
    else current.add(name);
    update({ terminalShells: Array.from(current) });
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 900 }}>
      <SettingsPageCtx.Provider value={{ cards, page }}>
      {cards && !page && <SettingsCardsGrid categories={categories} onOpen={setPage} />}
      {cards && page && <SettingsPageHeader categories={categories} title={page} onBack={() => setPage(null)} />}
      {/* الموقع */}
      <TitledSection icon="📍" title="الموقع الجغرافي">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>المدينة</label>
            <input
              value={settings.city}
              onChange={(e) => update({ city: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>الدولة</label>
            <input
              value={settings.country}
              onChange={(e) => update({ country: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>خط العرض (Latitude)</label>
            <input
              type="number"
              step="0.0001"
              value={settings.lat ?? ''}
              onChange={(e) => update({ lat: e.target.value ? parseFloat(e.target.value) : null })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>خط الطول (Longitude)</label>
            <input
              type="number"
              step="0.0001"
              value={settings.lon ?? ''}
              onChange={(e) => update({ lon: e.target.value ? parseFloat(e.target.value) : null })}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>طريقة الحساب</label>
          <select
            value={settings.methodId}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10);
              const m = methods.find((x) => x.id === id);
              update({ methodId: id, methodName: m?.nameAr ?? '' });
            }}
            style={inputStyle}
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameAr}
              </option>
            ))}
          </select>
        </div>
        {/* آخر خمسة مواقع سابقة: زرٌّ يفتح نافذةً مصغّرة (مطابقٌ للهاتف 2.3). */}
        <PreviousLocations settings={settings} update={update} methods={methods} />

        <SettingRow
          label="تحديث الموقع تلقائياً"
          sub="يُعاد الكشف عند الإقلاع وكل ست ساعات — لمن يكثر تنقّله. يحتاج إنترنت."
        >
          <Toggle on={settings.autoUpdateLocation} onChange={(v) => update({ autoUpdateLocation: v })} />
        </SettingRow>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <Button variant="secondary" onClick={detect} disabled={detecting}>
            {detecting ? '🔎 جاري الاكتشاف…' : '🌍 اكتشف الموقع تلقائياً'}
          </Button>
          {/* بديلٌ يعمل بلا إنترنت: قاعدة مواقع مُضمَّنة مشتركة مع نسخة الهاتف */}
          <Button variant="secondary" onClick={() => setPicking(true)}>🏙️ اختر مدينتك</Button>
          <Button
            variant="primary"
            onClick={async () => {
              await update({ setupCompleted: !!(settings.lat && settings.lon) });
              await window.gtSalat.prayer.prefetch();
              alert('تم حفظ الإعدادات وتحديث المواقيت ✓');
            }}
          >
            💾 حفظ وتحديث المواقيت
          </Button>
        </div>
      </TitledSection>

      {picking && (
        <PlacePicker
          onClose={() => setPicking(false)}
          onPick={async (pl) => {
            setPicking(false);
            const methodId = await window.gtSalat.prayer.suggestMethod(pl.country);
            const m = methods.find((x) => x.id === methodId);
            await update({
              lat: pl.lat,
              lon: pl.lon,
              city: pl.city,
              country: pl.country,
              ...(methodId ? { methodId, methodName: m?.nameAr ?? '' } : {}),
              setupCompleted: true,
            });
            await window.gtSalat.prayer.prefetch();
          }}
        />
      )}

      {/* الإشعارات */}
      <TitledSection icon="🔔" title="الإشعارات">
        <SettingRow label="إشعارات الصلاة (رئيسي)" sub="تفعيل/تعطيل جميع تنبيهات الصلاة">
          <Toggle on={settings.enableSalatNotify} onChange={(v) => update({ enableSalatNotify: v })} />
        </SettingRow>
        <SettingRow label="إشعارات الأذكار (رئيسي)" sub="تفعيل/تعطيل إشعارات الأذكار الدورية">
          <Toggle on={settings.enableZikrNotify} onChange={(v) => update({ enableZikrNotify: v })} />
        </SettingRow>
        <SettingRow label="إشعارات النظام للصلاة" sub="إظهار تنبيه النظام عند دخول الوقت">
          <Toggle
            on={settings.systemSalatNotify}
            onChange={(v) => update({ systemSalatNotify: v })}
            disabled={!settings.enableSalatNotify}
          />
        </SettingRow>
        <SettingRow label="إشعارات النظام للأذكار">
          <Toggle
            on={settings.systemZikrNotify}
            onChange={(v) => update({ systemZikrNotify: v })}
            disabled={!settings.enableZikrNotify}
          />
        </SettingRow>
        <SettingRow label="وضع عدم الإزعاج" sub="تعليق جميع الإشعارات مؤقتاً">
          <Toggle on={settings.doNotDisturb} onChange={(v) => update({ doNotDisturb: v })} />
        </SettingRow>
        <SettingRow label="دعاء بعد الأذان" sub="تشغيل دعاء الأذان تلقائياً عند انتهاء الأذان">
          <Toggle
            on={settings.enableDuaAfterAdhan}
            onChange={(v) => update({ enableDuaAfterAdhan: v })}
            disabled={!settings.enableSalatNotify || !settings.systemSalatNotify}
          />
        </SettingRow>
        <SettingRow label="أذكار وأدعية بعد الصلاة" sub="تشغيل الأذكار بعد مرور فترة من وقت الصلاة">
          <Toggle
            on={settings.enablePostPrayerDhikr}
            onChange={(v) => update({ enablePostPrayerDhikr: v })}
            disabled={!settings.enableSalatNotify}
          />
        </SettingRow>
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>تنبيه قبل الصلاة بـ:</label>
          <input
            type="number"
            min={0}
            max={60}
            value={settings.preNotifyMinutes}
            onChange={(e) => update({ preNotifyMinutes: parseInt(e.target.value) || 0 })}
            style={{ ...inputStyle, width: 80 }}
          />
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>دقيقة</span>
          <div style={{ width: 20 }} />
          <label style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>أذكار بعد الصلاة بعد:</label>
          <input
            type="number"
            min={1}
            max={120}
            value={settings.postPrayerDhikrDelayMinutes}
            onChange={(e) => update({ postPrayerDhikrDelayMinutes: parseInt(e.target.value) || 20 })}
            style={{ ...inputStyle, width: 80 }}
          />
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>دقيقة</span>
          <div style={{ width: 20 }} />
          <label style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>فاصل الأذكار:</label>
          <input
            type="number"
            min={5}
            max={240}
            value={settings.zikrIntervalMinutes}
            onChange={(e) => update({ zikrIntervalMinutes: parseInt(e.target.value) || 5 })}
            style={{ ...inputStyle, width: 80 }}
          />
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>دقيقة</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>نوع الأذان الافتراضي</label>
            <select
              value={settings.adhanType}
              onChange={(e) => update({ adhanType: e.target.value as AppSettings['adhanType'] })}
              style={{ ...inputStyle, width: 200, display: 'block', opacity: settings.useCustomAdhan ? 0.4 : 1 }}
              disabled={settings.useCustomAdhan}
            >
              <option value="full">أذان كامل</option>
              <option value="short">أذان قصير</option>
              <option value="maghribi_full">أذان مغربيّ كامل</option>
              <option value="maghribi_short">أذان مغربيّ قصير</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--fg-muted)' }}>أذان مخصص (ogg / mp3)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={settings.useCustomAdhan}
                  onChange={(e) => update({ useCustomAdhan: e.target.checked })}
                  style={{ accentColor: 'var(--teal-500)' }}
                />
                <span style={{ color: settings.useCustomAdhan ? 'var(--teal-400)' : 'var(--fg-muted)' }}>
                  {settings.useCustomAdhan ? 'مفعّل' : 'تفعيل'}
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  ...inputStyle,
                  flex: 1,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: settings.customAdhanPath ? 'var(--fg-primary)' : 'var(--fg-muted)',
                  fontSize: 12,
                  padding: '6px 12px',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
                title={settings.customAdhanPath || ''}
              >
                {settings.customAdhanPath
                  ? settings.customAdhanPath.split('/').pop()
                  : 'لم يُختر ملف بعد'}
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  const p = await window.gtSalat.dialog.openAudio();
                  if (p) update({ customAdhanPath: p });
                }}
              >
                📂 اختر
              </Button>
              {settings.customAdhanPath && (
                <Button
                  size="sm"
                  onClick={() => window.gtSalat.audio.playFile(settings.customAdhanPath)}
                >
                  ▶ اختبار
                </Button>
              )}
              {settings.customAdhanPath && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => update({ customAdhanPath: '', useCustomAdhan: false })}
                >
                  ✕
                </Button>
              )}
            </div>
            {settings.useCustomAdhan && !settings.customAdhanPath && (
              <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 4 }}>
                ⚠ لم يُختر ملف — سيُستخدم الأذان الافتراضي
              </div>
            )}
          </div>
        </div>
      </TitledSection>

      {/* تكامل الطرفية */}
      <TitledSection icon="💻" title="تكامل الطرفية (اختياري)">
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
          يمكنك عرض ذكر عشوائي أو موعد الصلاة القادمة تلقائياً عند فتح أي طرفية جديدة.
          هذه الميزة مُعطّلة افتراضياً وتعمل فقط عند تفعيلها.
        </div>
        <SettingRow label="عرض ذكر عند فتح الطرفية">
          <Toggle on={settings.terminalZikrNotify} onChange={(v) => update({ terminalZikrNotify: v })} />
        </SettingRow>
        <SettingRow label="عرض تذكير الصلاة القادمة عند فتح الطرفية">
          <Toggle on={settings.terminalSalatNotify} onChange={(v) => update({ terminalSalatNotify: v })} />
        </SettingRow>
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 8 }}>
          الصدفات المستهدفة:
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['bash', 'zsh', 'fish'] as const).map((name) => {
            const available = installedShells.includes(name);
            const active = settings.terminalShells.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleShell(name)}
                disabled={!available}
                style={{
                  padding: '8px 16px',
                  borderRadius: 99,
                  border: `1px solid ${active ? 'var(--teal-500)' : 'var(--border-subtle)'}`,
                  background: active ? 'var(--accent-tint-2)' : 'transparent',
                  color: active ? 'var(--teal-400)' : 'var(--fg-secondary)',
                  fontSize: 13,
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.4,
                }}
              >
                {name} {available ? '' : '(غير مثبّتة)'}
              </button>
            );
          })}
        </div>
        {shellConfirmReset && (
          <div
            style={{
              marginTop: 12,
              padding: '12px 16px',
              background: 'rgba(255,152,0,0.1)',
              border: '1px solid rgba(255,152,0,0.4)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--fg-primary)',
            }}
          >
            <div style={{ marginBottom: 10 }}>
              ⚠ تم اكتشاف تكامل موجود مسبقاً في الطرفية. هل تريد إعادة تطبيقه؟
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => { setShellConfirmReset(false); await doApplyShell(); }}
              >
                إعادة التطبيق
              </Button>
              <Button size="sm" onClick={() => setShellConfirmReset(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          <Button variant="primary" onClick={applyShellIntegration}>
            ✓ تطبيق تكامل الطرفية
          </Button>
          <Button variant="danger" onClick={removeShellIntegration}>
            ✗ إزالة تكامل الطرفية
          </Button>
          {shellApplyStatus && (
            <span style={{ fontSize: 13, color: 'var(--color-success)' }}>{shellApplyStatus}</span>
          )}
        </div>
      </TitledSection>

      {/* النظام */}
      <TitledSection icon="⚙️" title="النظام">
        <SettingRow label="التشغيل التلقائي عند بدء النظام">
          <Toggle
            on={autoStartEnabled}
            onChange={async (v) => {
              await window.gtSalat.autostart.set(v);
              setAutoStartEnabled(v);
              update({ autoStart: v });
            }}
          />
        </SettingRow>
        <SettingRow label="التصغير إلى شريط المهام عند الإغلاق" sub="بدلاً من إنهاء التطبيق">
          <Toggle on={settings.minimizeToTray} onChange={(v) => update({ minimizeToTray: v })} />
        </SettingRow>
        <SettingRow label="البدء مصغّراً" sub="لا تظهر النافذة عند بدء التشغيل">
          <Toggle on={settings.startMinimized} onChange={(v) => update({ startMinimized: v })} />
        </SettingRow>
        <SettingRow label="التحديث التلقائي للمواقيت أسبوعياً">
          <Toggle on={settings.autoUpdateTimetables} onChange={(v) => update({ autoUpdateTimetables: v })} />
        </SettingRow>
      </TitledSection>

      {/* اختصارٌ إلى الصفحة الإضافية (ولها عنصرها في الشريط الجانبي) — كل حقولها لا تظهر هنا.
          في شكل البطاقات له بطاقته في الشبكة. */}
      {!cards && (
        <Card
          onClick={onOpenAdvanced}
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-400)', marginBottom: 4 }}>
              🎛️ الإعدادات الإضافية
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.7 }}>
              مذهب حساب العصر · مستوى صوت الأذان ومعايناته · نمط تنبيهٍ لكل صلاة · التذكيرات اليومية ·
              نظام 12/24 ساعة · إزاحة التاريخ الهجري · أسماء الأشهر · المظهر واللون · المصادر المعتمَدة
            </div>
          </div>
          <span style={{ fontSize: 20, color: 'var(--fg-muted)', flexShrink: 0 }}>←</span>
        </Card>
      )}

      {/* إجراءات خطرة */}
      <TitledSection icon="🔧" title="إجراءات">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={() => window.gtSalat.prayer.prefetch()}>🔄 تحديث الجداول الآن</Button>
          <Button
            onClick={async () => {
              const p = await window.gtSalat.app.userDataDir();
              window.gtSalat.app.openPath(p + '/timetables');
            }}
          >
            📂 فتح مجلد الجداول
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm('سيتم إعادة ضبط جميع الإعدادات. هل أنت متأكد؟')) {
                await window.gtSalat.settings.reset();
                location.reload();
              }
            }}
          >
            🗑️ إعادة ضبط الإعدادات
          </Button>
        </div>
      </TitledSection>
      </SettingsPageCtx.Provider>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--fg-primary)',
  direction: 'rtl',
  fontFamily: 'inherit',
};

/** اسم الموقع للعرض: المدينة والبلد، وإلّا الإحداثيّات. */
function placeLabel(p: PlaceEntry): string {
  return [p.city, p.country].filter(Boolean).join('، ') || `${p.lat.toFixed(3)}، ${p.lon.toFixed(3)}`;
}

/**
 * زرّ «مواقع سابقة (n)» ونافذته المصغّرة: آخر خمسة مواقع **سابقة** بلا تكرار، يُستبعَد منها
 * الحاليّ (سجلّاتٌ قبل 2.5 كانت تحفظه). النقر يعود إلى الموقع، و✕ يحذفه من السجلّ.
 * السجلّ نفسه يُكتب في `setSettings` (electron/settings.ts) عند كلّ تغييرٍ للموقع.
 */
function PreviousLocations({
  settings,
  update,
  methods,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  methods: { id: number; nameAr: string }[];
}) {
  const [open, setOpen] = useState(false);
  const here: PlaceEntry | null =
    settings.lat != null && settings.lon != null
      ? { city: settings.city, country: settings.country, lat: settings.lat, lon: settings.lon }
      : null;
  const same = (a: PlaceEntry, b: PlaceEntry) =>
    (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.012)
    || (!!a.city && a.city.toLowerCase() === (b.city ?? '').toLowerCase()
      && (a.country ?? '').toLowerCase() === (b.country ?? '').toLowerCase());
  const previous = (settings.locationHistory ?? [])
    .filter((p) => !(here && same(p, here)))
    .reduce<PlaceEntry[]>((acc, p) => (acc.some((x) => same(x, p)) ? acc : [...acc, p]), [])
    .slice(0, 5);
  if (previous.length === 0) return null;

  const restore = async (pl: PlaceEntry) => {
    setOpen(false);
    const methodId = await window.gtSalat.prayer.suggestMethod(pl.country);
    const m = methods.find((x) => x.id === methodId);
    await update({
      lat: pl.lat,
      lon: pl.lon,
      city: pl.city,
      country: pl.country,
      autoUpdateLocation: false, // اختيارٌ صريح: لا يستبدله التحديث التلقائيّ
      ...(methodId ? { methodId, methodName: m?.nameAr ?? '' } : {}),
    });
    await window.gtSalat.prayer.prefetch();
  };
  const remove = (pl: PlaceEntry) =>
    update({ locationHistory: (settings.locationHistory ?? []).filter((p) => !same(p, pl)) });

  return (
    <div style={{ marginTop: 14 }}>
      <Button size="sm" onClick={() => setOpen(true)}>🕘 مواقع سابقة ({previous.length})</Button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 92vw)' }}>
            <Card>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 6 }}>🕘 مواقع سابقة</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
                اختر موقعاً للعودة إليه. اختيارٌ يدويّ يطفئ «تحديث الموقع تلقائياً».
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {previous.map((pl) => (
                  <div key={`${pl.lat}_${pl.lon}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => restore(pl)}
                      style={{
                        flex: 1, textAlign: 'start', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--fg-primary)',
                        fontFamily: 'inherit', fontSize: 14,
                      }}
                    >
                      📍 {placeLabel(pl)}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => remove(pl)} title="حذف من السجلّ">✕</Button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <Button size="sm" onClick={() => setOpen(false)}>إغلاق</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
