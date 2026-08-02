import { useEffect, useState } from 'react';
import {
  Button,
  ChipGroup,
  Collapsible,
  LinkRow,
  PreviewButton,
  SettingRow,
  Slider,
  Toggle,
} from '../components/common';
import type { AppSettings } from '../hooks/useSettings';
import type { AlertMode, AsrMadhab, BackupContents, CalendarKind, CreditSource, MonthScheme } from '@electron/types';
import { formatGregorian, formatHijri, formatHour, gregorianMonthName } from '../utils/format';

interface Props {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  version: string;
}

const PRAYER_LABELS = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];

const ALERT_OPTIONS: { value: AlertMode; label: string }[] = [
  { value: 'adhan', label: 'أذان' },
  { value: 'tone', label: 'رنّة' },
  { value: 'silent', label: 'صامت' },
];

/** سواتر اللون المميّز — الأول هو الافتراضي (فيروزي الهوية). */
const ACCENT_PRESETS: { value: string; label: string; swatch: string }[] = [
  { value: '', label: 'الافتراضي', swatch: '#00bcd4' },
  { value: '#1b6b4c', label: 'أخضر', swatch: '#1b6b4c' },
  { value: '#00796b', label: 'زمرّدي', swatch: '#00796b' },
  { value: '#1565c0', label: 'أزرق', swatch: '#1565c0' },
  { value: '#6a1b9a', label: 'بنفسجي', swatch: '#6a1b9a' },
  { value: '#c9a227', label: 'ذهبي', swatch: '#c9a227' },
  { value: '#b5651d', label: 'نحاسي', swatch: '#b5651d' },
  { value: '#ad1457', label: 'توتي', swatch: '#ad1457' },
];

export function AdvancedSettingsPage({ settings, update, version }: Props) {
  const [cachedMonths, setCachedMonths] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ sources: CreditSource[]; developer: string; github: string; repo: string; phoneRepo: string; projects: string } | null>(null);
  const [pruneMsg, setPruneMsg] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [backupPrayers, setBackupPrayers] = useState(0);
  const [backupMsg, setBackupMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ path: string; contents: BackupContents } | null>(null);
  const [pick, setPick] = useState({ settings: true, prayers: true });

  useEffect(() => {
    window.gtSalat.prayer.cachedMonths().then(setCachedMonths);
    window.gtSalat.content.credits().then(setCredits);
    window.gtSalat.backup.sizes().then((b) => setBackupPrayers(b.prayersCount));
  }, []);

  // متابعة الصوت الجاري كي تتبدّل أزرار المعاينة بين تشغيل وإيقاف.
  useEffect(() => {
    const t = setInterval(() => {
      window.gtSalat.audio.playingKind().then(setPlaying);
    }, 700);
    return () => clearInterval(t);
  }, []);

  const preview = async (kind: 'full' | 'short' | 'approaching' | 'dua_after_adhan' | 'post_prayer_dhikr' | 'custom') => {
    const now = await window.gtSalat.audio.preview(kind, settings.customAdhanPath || undefined);
    setPlaying(now);
  };

  const open = settings.advancedOpenSection;
  const toggle = (title: string) => update({ advancedOpenSection: open === title ? '' : title });

  const now = new Date();

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 900 }}>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.8 }}>
        إعداداتٌ لا تلزم الاستعمال اليومي. الموقع والإشعارات وتكامل الطرفية والنظام تبقى في
        «الإعدادات الأساسية»، ولا يتكرّر أيّ خيارٍ بين الصفحتين.
      </div>

      {/* ── حساب المواقيت ───────────────────────────────── */}
      <Collapsible title="حساب المواقيت" icon="🧮" expanded={open === 'حساب المواقيت'} onToggle={() => toggle('حساب المواقيت')}>
        <SettingRow
          label="مذهب حساب العصر"
          sub="الجمهور: ظلّ الشيء مثله. الحنفي: ظلّ الشيء مثليه (العصر أمتنُ تأخيراً)"
        >
          <ChipGroup<AsrMadhab>
            value={settings.madhab}
            options={[{ value: 'shafi', label: 'الجمهور' }, { value: 'hanafi', label: 'الحنفي' }]}
            onChange={async (v) => {
              await update({ madhab: v });
              await window.gtSalat.prayer.prefetch();
            }}
          />
        </SettingRow>

        <SettingRow
          label="تحديث المواقيت عبر الإنترنت"
          sub="عند التعطيل تُحسب المواقيت محلياً بالكامل (مكتبة adhan) بلا أي اتصال"
        >
          <Toggle on={settings.useApiTimetables} onChange={(v) => update({ useApiTimetables: v })} />
        </SettingRow>

        <SettingRow label="الجداول المخزَّنة محلياً" sub={`${cachedMonths} شهراً محفوظاً للعمل دون إنترنت`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pruneMsg && <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{pruneMsg}</span>}
            <Button
              size="sm"
              onClick={async () => {
                const removed = await window.gtSalat.prayer.pruneCache();
                setCachedMonths(await window.gtSalat.prayer.cachedMonths());
                setPruneMsg(removed > 0 ? `✓ حُذف ${removed}` : '✓ لا شيء للحذف');
                setTimeout(() => setPruneMsg(''), 3000);
              }}
            >
              🧹 حذف المنصرم والقديم
            </Button>
          </div>
        </SettingRow>
      </Collapsible>

      {/* ── الأذان والتنبيهات ───────────────────────────── */}
      <Collapsible title="الأذان والتنبيهات" icon="🔊" expanded={open === 'الأذان والتنبيهات'} onToggle={() => toggle('الأذان والتنبيهات')}>
        <SettingRow label="مستوى صوت الأذان" sub="يُطبَّق على كل الأصوات التي يشغّلها التطبيق">
          <Slider
            value={settings.adhanVolume}
            min={0}
            max={100}
            suffix="٪"
            onCommit={(v) => update({ adhanVolume: v })}
          />
        </SettingRow>

        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--bg-elevated)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)', marginBottom: 4 }}>
            تجربة الأصوات
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
            اسمع كل صوتٍ بمستوى الصوت المضبوط أعلاه قبل أن يفاجئك في وقته.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              ['full', 'الأذان الكامل'],
              ['short', 'الأذان القصير'],
              ['approaching', 'رنّة تنبيه الاقتراب'],
              ['dua_after_adhan', 'دعاء بعد الأذان'],
              ['post_prayer_dhikr', 'أذكار بعد الصلاة'],
            ] as const).map(([kind, label]) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{label}</span>
                <PreviewButton playing={playing === kind} onClick={() => preview(kind)} />
              </div>
            ))}
            {settings.customAdhanPath && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
                  الأذان المخصص — {settings.customAdhanPath.split('/').pop()}
                </span>
                <PreviewButton playing={playing === 'custom'} onClick={() => preview('custom')} />
              </div>
            )}
          </div>
        </div>

        <SettingRow
          label="صوت تنبيه الاقتراب"
          sub="إشعار الاقتراب يبقى ظاهراً حتى لو أُطفئ صوته (مدّته في الصفحة الأساسية)"
        >
          <Toggle on={settings.enablePreNotifySound} onChange={(v) => update({ enablePreNotifySound: v })} />
        </SettingRow>

        <SettingRow
          label="نمط تنبيهٍ مخصّصٍ لكل صلاة"
          sub={
            settings.systemSalatNotify
              ? 'اختر لكل صلاة: أذانٌ كامل، أم رنّةٌ قصيرة، أم إشعارٌ صامت'
              : '⚠ معطَّل لأن «إشعارات النظام للصلاة» مُطفأة في الصفحة الأساسية'
          }
        >
          <Toggle
            on={settings.perPrayerAlerts}
            onChange={(v) => update({ perPrayerAlerts: v })}
            disabled={!settings.systemSalatNotify}
          />
        </SettingRow>

        {settings.perPrayerAlerts && settings.systemSalatNotify && (
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRAYER_LABELS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13.5, color: 'var(--fg-primary)', minWidth: 60 }}>{label}</span>
                <ChipGroup<AlertMode>
                  value={settings.prayerAlerts?.[i] ?? 'adhan'}
                  options={ALERT_OPTIONS}
                  onChange={(v) => {
                    const next = [...(settings.prayerAlerts ?? [])];
                    while (next.length < 5) next.push('adhan');
                    next[i] = v;
                    update({ prayerAlerts: next });
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {/* ── بطاقات لوحة التحكم ──────────────────────────── */}
      <Collapsible title="بطاقات لوحة التحكم" icon="🗂️" expanded={open === 'بطاقات لوحة التحكم'} onToggle={() => toggle('بطاقات لوحة التحكم')}>
        <SettingRow label="بطاقة آية اليوم" sub="آيةٌ منتقاة تتغيّر يومياً، مع زرّ تجديد">
          <Toggle on={settings.enableDailyAyah} onChange={(v) => update({ enableDailyAyah: v })} />
        </SettingRow>
        <SettingRow label="بطاقة حكمة اليوم" sub="من حِكَم الصحابة والسلف والعلماء">
          <Toggle on={settings.enableDailyHikmah} onChange={(v) => update({ enableDailyHikmah: v })} />
        </SettingRow>
        <SettingRow label="بطاقة حدث اليوم" sub="تظهر فقط إن صادف اليومَ الهجريَّ حدثٌ تاريخي">
          <Toggle on={settings.enableTodayEvent} onChange={(v) => update({ enableTodayEvent: v })} />
        </SettingRow>
        <SettingRow label="بطاقة رمضان" sub="عدّاد الأيام قبل رمضان، ورقم اليوم أثناءه">
          <Toggle on={settings.enableRamadanCard} onChange={(v) => update({ enableRamadanCard: v })} />
        </SettingRow>
      </Collapsible>

      {/* ── التذكيرات اليومية ───────────────────────────── */}
      <Collapsible title="التذكيرات اليومية" icon="🔔" expanded={open === 'التذكيرات اليومية'} onToggle={() => toggle('التذكيرات اليومية')}>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10, lineHeight: 1.8 }}>
          تصل هذه التذكيرات في ساعتها، وإن كان الحاسوب مطفأً وقتَها وصلت عند أول تشغيلٍ خلال الساعة
          التالية — ولا تصل متأخرةً بعد ذلك فتفقد معناها.
        </div>

        <SettingRow label="تذكير أذكار الصباح" sub={settings.enableMorningAdhkarReminder ? `يومياً عند ${formatHour(settings.morningAdhkarHour, settings.clock24h)}` : undefined}>
          <Toggle on={settings.enableMorningAdhkarReminder} onChange={(v) => update({ enableMorningAdhkarReminder: v })} />
        </SettingRow>
        {settings.enableMorningAdhkarReminder && (
          <SettingRow label="ساعة تذكير الصباح">
            <Slider value={settings.morningAdhkarHour} min={0} max={23} suffix=":00" onCommit={(v) => update({ morningAdhkarHour: v })} />
          </SettingRow>
        )}

        <SettingRow label="تذكير أذكار المساء" sub={settings.enableEveningAdhkarReminder ? `يومياً عند ${formatHour(settings.eveningAdhkarHour, settings.clock24h)}` : undefined}>
          <Toggle on={settings.enableEveningAdhkarReminder} onChange={(v) => update({ enableEveningAdhkarReminder: v })} />
        </SettingRow>
        {settings.enableEveningAdhkarReminder && (
          <SettingRow label="ساعة تذكير المساء">
            <Slider value={settings.eveningAdhkarHour} min={0} max={23} suffix=":00" onCommit={(v) => update({ eveningAdhkarHour: v })} />
          </SettingRow>
        )}

        <SettingRow
          label="تذكير الأيام البيض"
          sub="13 و14 و15 من كل شهرٍ هجري — يصل في ساعة تذكير الصباح"
        >
          <Toggle on={settings.enableWhiteDaysReminder} onChange={(v) => update({ enableWhiteDaysReminder: v })} />
        </SettingRow>
      </Collapsible>

      {/* ── التقويم والتواريخ ───────────────────────────── */}
      <Collapsible title="التقويم والتواريخ" icon="📅" expanded={open === 'التقويم والتواريخ'} onToggle={() => toggle('التقويم والتواريخ')}>
        <SettingRow label="نظام عرض الوقت">
          <ChipGroup<string>
            value={settings.clock24h ? '24' : '12'}
            options={[{ value: '24', label: '24 ساعة' }, { value: '12', label: '12 ساعة (ص/م)' }]}
            onChange={(v) => update({ clock24h: v === '24' })}
          />
        </SettingRow>

        <SettingRow label="تقويم ترويسة جدول المواقيت">
          <ChipGroup<CalendarKind>
            value={settings.timetableCalendar}
            options={[{ value: 'hijri', label: 'هجري' }, { value: 'gregorian', label: 'ميلادي' }]}
            onChange={(v) => update({ timetableCalendar: v })}
          />
        </SettingRow>

        <SettingRow
          label="تعديل التاريخ الهجري"
          sub={`الآن: ${formatHijri(now, settings.hijriOffset)}${settings.hijriOffset !== 0 ? ' — محسوبٌ محلياً بأمّ القرى' : ' — من الإنترنت إن توفّر'}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button size="sm" disabled={settings.hijriOffset <= -3} onClick={() => update({ hijriOffset: settings.hijriOffset - 1 })}>
              −
            </Button>
            <span className="mono" style={{ fontSize: 13, color: 'var(--teal-400)', minWidth: 62, textAlign: 'center' }}>
              {settings.hijriOffset === 0 ? 'بدون' : settings.hijriOffset > 0 ? `+${settings.hijriOffset} يوم` : `${settings.hijriOffset} يوم`}
            </span>
            <Button size="sm" disabled={settings.hijriOffset >= 3} onClick={() => update({ hijriOffset: settings.hijriOffset + 1 })}>
              +
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          label="أسماء الأشهر الميلادية"
          sub={`الشهر الحالي يُكتب: ${gregorianMonthName(now.getMonth() + 1, settings.monthScheme, settings.country)}`}
        >
          <ChipGroup<MonthScheme>
            value={settings.monthScheme}
            options={[
              { value: 'auto', label: 'تلقائي' },
              { value: 'standard', label: 'قياسي' },
              { value: 'maghreb', label: 'مغاربي' },
              { value: 'levant', label: 'شامي' },
            ]}
            onChange={(v) => update({ monthScheme: v })}
          />
        </SettingRow>

        <div style={{ paddingTop: 12, fontSize: 12, color: 'var(--fg-muted)' }}>
          معاينة: {formatGregorian(now, settings.monthScheme, settings.country)} · {formatHijri(now, settings.hijriOffset)}
        </div>
      </Collapsible>

      {/* ── المظهر ──────────────────────────────────────── */}
      <Collapsible title="المظهر" icon="🎨" expanded={open === 'المظهر'} onToggle={() => toggle('المظهر')}>
        <SettingRow label="السِمة">
          <ChipGroup<'dark' | 'light'>
            value={settings.theme}
            options={[{ value: 'dark', label: 'داكن' }, { value: 'light', label: 'فاتح' }]}
            onChange={(v) => update({ theme: v })}
          />
        </SettingRow>

        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)', marginBottom: 4 }}>
            اللون المميّز
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
            يُطبَّق على العناصر النشطة والأزرار والمؤشّرات في كل الصفحات.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map((p) => {
              const active = settings.accentColor === p.value;
              return (
                <button
                  key={p.value || 'default'}
                  onClick={() => update({ accentColor: p.value })}
                  title={p.label}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: p.swatch,
                    border: active ? '3px solid var(--fg-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {active ? '✓' : ''}
                </button>
              );
            })}
            <label
              title="لون مخصّص"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                color: 'var(--fg-muted)',
              }}
            >
              🎨
              <input
                type="color"
                value={settings.accentColor || '#00bcd4'}
                onChange={(e) => update({ accentColor: e.target.value })}
                style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
              />
            </label>
          </div>
        </div>
      </Collapsible>

      {/* ── النسخ الاحتياطي ─────────────────────────────── */}
      <Collapsible title="النسخ الاحتياطي" icon="💾" expanded={open === 'النسخ الاحتياطي'} onToggle={() => toggle('النسخ الاحتياطي')}>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 14, lineHeight: 1.9 }}>
          حزمةٌ واحدةٌ (<span className="mono">zip</span>) فيها إعداداتك ومواقيتك المخزَّنة.
          <strong style={{ color: 'var(--teal-400)' }}> الحزمة نفسها تعمل في نسخة الهاتف</strong> —
          صدّر من هنا واستورد هناك أو العكس. ما يخصّ سطح المكتب (تكامل الطرفية، الإذاعات المخصّصة،
          الأقسام المثبّتة) يُحفَظ في الحزمة ويتجاهله الهاتف ويعيده سليماً.
        </div>

        <SettingRow label="ما سيُصدَّر" sub={`الإعدادات · ${backupPrayers} يوماً من المواقيت المخزَّنة`}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {backupMsg && <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{backupMsg}</span>}
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setBackupMsg('');
                const res = await window.gtSalat.backup.export({ settings: true, prayers: true });
                setBusy(false);
                if (!res) return;                        // ألغى المستخدم حوار الحفظ
                setBackupMsg(res.ok ? `✓ صُدِّرت (${res.prayers} يوماً)` : '⚠ تعذّر التصدير');
                setTimeout(() => setBackupMsg(''), 4000);
              }}
            >
              💾 تصدير
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const picked = await window.gtSalat.backup.pick();
                setBusy(false);
                if (!picked) return;
                if (!picked.contents.hasSettings && picked.contents.prayersCount === 0) {
                  setBackupMsg('⚠ الحزمة فارغة أو غير صالحة');
                  setTimeout(() => setBackupMsg(''), 4000);
                  return;
                }
                setPick({ settings: picked.contents.hasSettings, prayers: picked.contents.prayersCount > 0 });
                setPending(picked);
              }}
            >
              📥 استيراد
            </Button>
          </div>
        </SettingRow>

        {/* اختيار ما يُستعاد — يُعرَض المتاح في الحزمة فقط */}
        {pending && (
          <div style={{ marginTop: 14, padding: '14px 16px', border: '1px solid var(--teal-500)', borderRadius: 'var(--radius-sm)', background: 'var(--accent-tint)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 4 }}>
              ماذا تستعيد من هذه الحزمة؟
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 12 }}>
              {pending.contents.fromPhone
                ? `حزمةٌ من نسخة الهاتف — فيها ${pending.contents.phoneFiles} ملفّ صوتٍ/مصحف تخصّ الهاتف، تُترَك كما هي.`
                : 'حزمةٌ من نسخة سطح المكتب.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: pending.contents.hasSettings ? 'pointer' : 'not-allowed', opacity: pending.contents.hasSettings ? 1 : 0.45 }}>
                <input
                  type="checkbox"
                  checked={pick.settings && pending.contents.hasSettings}
                  disabled={!pending.contents.hasSettings}
                  onChange={(e) => setPick((v) => ({ ...v, settings: e.target.checked }))}
                  style={{ accentColor: 'var(--teal-500)' }}
                />
                الإعدادات {pending.contents.hasSettings ? '' : '(غير متوفّرة)'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: pending.contents.prayersCount ? 'pointer' : 'not-allowed', opacity: pending.contents.prayersCount ? 1 : 0.45 }}>
                <input
                  type="checkbox"
                  checked={pick.prayers && pending.contents.prayersCount > 0}
                  disabled={!pending.contents.prayersCount}
                  onChange={(e) => setPick((v) => ({ ...v, prayers: e.target.checked }))}
                  style={{ accentColor: 'var(--teal-500)' }}
                />
                المواقيت المخزَّنة {pending.contents.prayersCount ? `(${pending.contents.prayersCount} يوماً)` : '(غير متوفّرة)'}
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || (!pick.settings && !pick.prayers)}
                onClick={async () => {
                  setBusy(true);
                  const res = await window.gtSalat.backup.import(pending.path, pick);
                  setBusy(false);
                  setPending(null);
                  setBackupMsg(res.ok ? `✓ استُعيد (${res.prayers} يوماً)` : '⚠ تعذّر الاستيراد');
                  setCachedMonths(await window.gtSalat.prayer.cachedMonths());
                  setBackupPrayers((await window.gtSalat.backup.sizes()).prayersCount);
                  setTimeout(() => setBackupMsg(''), 5000);
                }}
              >
                استعادة
              </Button>
              <Button size="sm" onClick={() => setPending(null)}>إلغاء</Button>
            </div>
          </div>
        )}
      </Collapsible>

      {/* ── المصادر المعتمَدة ───────────────────────────── */}
      <Collapsible title="المصادر المعتمَدة" icon="📚" expanded={open === 'المصادر المعتمَدة'} onToggle={() => toggle('المصادر المعتمَدة')}>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.8 }}>
          أُثري التطبيق بمحتوىً وبياناتٍ من مشاريعَ حرّةٍ ومفتوحةِ المصدر، بالشكر والتقدير:
        </div>
        {credits?.sources.map((s) => (
          <LinkRow key={s.name} title={s.name} sub={s.note} url={s.url} />
        ))}
      </Collapsible>

      {/* ── حول ─────────────────────────────────────────── */}
      <Collapsible title="حول GT-SALAT" icon="ℹ️" expanded={open === 'حول GT-SALAT'} onToggle={() => toggle('حول GT-SALAT')}>
        <SettingRow label="النسخة">
          <span className="mono" style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>GT-SALAT {version}</span>
        </SettingRow>
        <SettingRow label="التنبيه عند توفّر نسخةٍ جديدة" sub="فحصٌ خفيفٌ لصفحة إصدارات GitHub عند بدء التشغيل">
          <Toggle on={settings.checkUpdates} onChange={(v) => update({ checkUpdates: v })} />
        </SettingRow>
        <SettingRow label="فحص التحديثات الآن" sub={updateMsg || undefined}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              size="sm"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                setUpdateMsg('');
                const info = await window.gtSalat.update.check();
                setChecking(false);
                if (!info.checked) setUpdateMsg('⚠ تعذّر الاتصال — تحقّق من الإنترنت');
                else if (info.available) {
                  setUpdateMsg(`⬆️ توفّرت النسخة ${info.latest}`);
                  // إظهار الشريط ثانيةً حتى لو سبق إخفاؤه، ما دام المستخدم طلب الفحص بنفسه.
                  if (settings.dismissedUpdateVersion === info.latest) update({ dismissedUpdateVersion: '' });
                } else setUpdateMsg('✓ أنت على أحدث نسخة');
              }}
            >
              {checking ? '… يفحص' : '🔄 فحص'}
            </Button>
            <Button size="sm" onClick={() => window.gtSalat.update.openPage()}>صفحة الإصدارات ↗</Button>
          </div>
        </SettingRow>
        {credits && (
          <>
            <LinkRow title="المطوّر" sub={credits.developer} url={credits.github} />
            <LinkRow title="المستودع (GitHub)" sub="الشيفرة المصدرية — رخصة GPLv3" url={credits.repo} />
            <LinkRow title="📱 نسخة الهاتف (أندرويد)" sub="GT-SALAT-PHONE — نفس المحتوى، بنكهةٍ حرّةٍ بلا خدمات Google" url={credits.phoneRepo} />
            <LinkRow title="مشاريع GNUTUX" sub="بقيّة مشاريع المطوّر" url={credits.projects} />
          </>
        )}
      </Collapsible>
    </div>
  );
}
