import { useEffect, useState } from 'react';
import { Card, Button, CopyButton, SectionTitle } from '../components/common';
import type { PrayerTime, DayTimetable, NextPrayerInfo } from '../hooks/usePrayer';
import type { AppSettings } from '../hooks/useSettings';
import type { DailyAyah, Hikmah, HistoryEvent } from '@electron/types';
import { formatClock, hijriParts, ramadanRange } from '../utils/format';

const PRAYER_COLORS: Record<string, string> = {
  fajr: 'var(--color-fajr)',
  sunrise: 'var(--color-sunrise)',
  dhuhr: 'var(--color-dhuhr)',
  asr: 'var(--color-asr)',
  maghrib: 'var(--color-maghrib)',
  isha: 'var(--color-isha)',
};

/** اسمُ الصوت الجاري في زرّ الإيقاف — الأذان والتنبيه والدعاء والذكر لا تُسمّى كلّها «أذاناً». */
const AUDIO_KIND_LABELS: Record<string, string> = {
  full: 'الأذان',
  short: 'الأذان',
  custom: 'الأذان',
  approaching: 'التنبيه',
  dua_after_adhan: 'دعاء الأذان',
  post_prayer_dhikr: 'الأذكار',
};

const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌇',
  isha: '🌃',
};

interface Props {
  settings: AppSettings;
  today: DayTimetable | null;
  /** تأتي من `App` — مصدرٌ واحدٌ يشترك فيه الشريط العلوي ولوحة التحكم. */
  next: NextPrayerInfo | null;
  onOpenMore: (id: string) => void;
}

/** بذرةٌ ثابتةٌ لليوم: نفس الآية/الحكمة طوال اليوم، وتتغيّر غداً. */
function daySeed(): number {
  const d = new Date();
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return d.getFullYear() * 1000 + dayOfYear;
}

/** بعد الظهر نقترح أذكار المساء بدل الصباح. */
function isEvening(): boolean {
  return new Date().getHours() >= 12;
}

export function DashboardPage({ settings, today, next, onOpenMore }: Props) {
  const city = settings.city;
  const [dhikr, setDhikr] = useState<{ id: number; text: string } | null>(null);
  const [audioKind, setAudioKind] = useState<string | null>(null);
  const [ayah, setAyah] = useState<DailyAyah | null>(null);
  const [hikmah, setHikmah] = useState<Hikmah | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [seed, setSeed] = useState(daySeed());
  // رسالةٌ ذكيّةٌ عند إعادة الكشف (جارٍ… / ✓ حُدّث / تعذّر) — كما في نسخة الهاتف.
  const [locMsg, setLocMsg] = useState('');

  useEffect(() => {
    window.gtSalat.dhikr.random().then(setDhikr);
  }, []);

  useEffect(() => {
    if (settings.enableDailyAyah) window.gtSalat.content.dailyAyah(seed).then(setAyah);
    if (settings.enableDailyHikmah) window.gtSalat.content.hikmah(seed).then(setHikmah);
  }, [seed, settings.enableDailyAyah, settings.enableDailyHikmah]);

  // حدث اليوم يُطابَق باليوم الهجري (مع إزاحة المستخدم).
  useEffect(() => {
    if (!settings.enableTodayEvent) {
      setEvents([]);
      return;
    }
    const h = hijriParts(new Date(), settings.hijriOffset ?? 0);
    if (!h) return;
    window.gtSalat.content.eventsToday(h.month, h.day).then(setEvents);
  }, [settings.enableTodayEvent, settings.hijriOffset]);

  // الصوت يخرج من مشغّل النظام لا من عنصر `<audio>`، فالحالة تصل بالبثّ لا بالاستطلاع:
  // تظهر فوراً وتحمل **نوع** الصوت، فيُسمّيه الزرّ (كما في نسخة الهاتف) بدل «الأذان» دائماً.
  useEffect(() => {
    window.gtSalat.audio.playingKind().then(setAudioKind);
    return window.gtSalat.audio.onState(setAudioKind);
  }, []);

  const newDhikr = () => window.gtSalat.dhikr.random().then(setDhikr);

  /** إعادةُ كشف الموقع من لوحة التحكّم — لمن ينتقل فيجد المواقيت على مدينةٍ أخرى. */
  const refreshLocation = async () => {
    setLocMsg('… يحدّد');
    const loc = await window.gtSalat.prayer.autoDetect();
    if (!loc) {
      setLocMsg('تعذّر التحديد — لا إنترنت. اختر مدينتك من الإعدادات.');
      setTimeout(() => setLocMsg(''), 6000);
      return;
    }
    const methods = await window.gtSalat.prayer.methods();
    const m = methods.find((x) => x.id === loc.suggestedMethodId);
    await window.gtSalat.settings.set({
      lat: loc.lat,
      lon: loc.lon,
      city: loc.city,
      country: loc.country,
      methodId: loc.suggestedMethodId,
      methodName: m?.nameAr ?? '',
    });
    await window.gtSalat.prayer.prefetch();
    setLocMsg(`✓ حُدّث إلى ${loc.city}`);
    setTimeout(() => setLocMsg(''), 5000);
  };

  const nowMs = Date.now();
  const isPast = (p: PrayerTime) => p.timestamp < nowMs;
  const isNext = (p: PrayerTime) => next?.prayer.id === p.id;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowY: 'auto' }}>
      {settings.enableRamadanCard && <RamadanCard settings={settings} onOpen={() => onOpenMore('imsakiah')} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Next prayer */}
        <Card style={{ position: 'relative', overflow: 'hidden', padding: '22px 26px' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at top right, rgba(245,197,24,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>
            الصلاة القادمة
          </div>
          {next ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: 'var(--gold-500)' }}>{next.prayer.name}</span>
                <span className="mono" style={{ fontSize: 24, color: 'var(--fg-primary)' }}>
                  {formatClock(next.prayer.time, settings.clock24h)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>⏳</span>
                  <span className="mono" style={{ fontSize: 17, color: 'var(--teal-400)', fontWeight: 700 }}>
                    {next.remainingText}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>متبقية</span>
                </div>
                {audioKind && (
                  <Button size="sm" variant="danger" onClick={() => window.gtSalat.audio.stop()}>
                    ⏹ إيقاف {AUDIO_KIND_LABELS[audioKind] ?? 'الصوت'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, color: 'var(--fg-muted)', padding: '18px 0' }}>
              أكمل الإعدادات أولاً لعرض مواقيت الصلاة.
            </div>
          )}
        </Card>

        {/* Today dhikr */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {dhikr && <CopyButton text={dhikr.text} source="ذكر اليوم" />}
                <Button size="sm" onClick={newDhikr}>ذكر جديد</Button>
              </div>
            }
          >
            ذكر اليوم
          </SectionTitle>
          <div
            className="dhikr-text fade-in"
            key={dhikr?.id}
            style={{ fontSize: 19, color: 'var(--fg-primary)', flex: 1, marginBottom: 10 }}
          >
            {dhikr?.text ?? '…'}
          </div>
        </Card>
      </div>

      {/* آية اليوم + حكمة اليوم */}
      {(settings.enableDailyAyah || settings.enableDailyHikmah) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: settings.enableDailyAyah && settings.enableDailyHikmah ? '1.4fr 1fr' : '1fr',
            gap: 16,
          }}
        >
          {settings.enableDailyAyah && (
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionTitle
                action={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {ayah && <CopyButton text={ayah.text} source={`سورة ${ayah.surah} — الآية ${ayah.n}`} />}
                    <Button size="sm" onClick={() => setSeed((s) => s + 1)}>آية أخرى</Button>
                    <Button size="sm" variant="secondary" onClick={() => onOpenMore('quran')}>القرآن ←</Button>
                  </div>
                }
              >
                آية اليوم
              </SectionTitle>
              <div
                className="dhikr-text fade-in"
                key={`${ayah?.surah}-${ayah?.n}`}
                style={{ fontSize: 20, color: 'var(--fg-primary)', lineHeight: 2.3, flex: 1 }}
              >
                {ayah?.text ?? '…'}
              </div>
              {ayah && (
                <div style={{ fontSize: 12, color: 'var(--gold-500)', marginTop: 10 }}>
                  سورة {ayah.surah} — الآية {ayah.n}
                </div>
              )}
            </Card>
          )}

          {settings.enableDailyHikmah && (
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionTitle
                action={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {hikmah && <CopyButton text={hikmah.text} source={hikmah.sayer || 'حكمة اليوم'} />}
                    <Button size="sm" onClick={() => setSeed((s) => s + 1)}>حكمة أخرى</Button>
                  </div>
                }
              >
                حكمة اليوم
              </SectionTitle>
              <div
                className="fade-in"
                key={hikmah?.n}
                style={{ fontSize: 15, color: 'var(--fg-primary)', lineHeight: 2.1, flex: 1 }}
              >
                «{hikmah?.text ?? '…'}»
              </div>
              {hikmah?.sayer && (
                <div style={{ fontSize: 12, color: 'var(--gold-500)', marginTop: 10 }}>— {hikmah.sayer}</div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* حدث اليوم — يظهر فقط إن صادف اليومَ الهجريَّ حدث */}
      {events.length > 0 && (
        <Card onClick={() => onOpenMore('events')} style={{ borderColor: 'var(--gold-600)' }}>
          <SectionTitle>🏛️ في مثل هذا اليوم</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((e, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg-primary)' }}>{e.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--gold-500)' }}>{e.year}</span>
                </div>
                {e.text && (
                  <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.9, marginTop: 4 }}>{e.text}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today timetable */}
      <Card>
        <SectionTitle
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {locMsg && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{locMsg}</span>}
              <Button size="sm" variant="secondary" onClick={refreshLocation} title="إعادة تحديد الموقع">
                🔄 تحديث الموقع
              </Button>
            </div>
          }
        >
          {/* الاسم الطويل يُختصَر بنقاطٍ فلا يزحم الترويسة (كما أُصلح في الهاتف v1.17.1). */}
          <span style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
            مواقيت اليوم{city ? ` — ${city}` : ''}
          </span>
        </SectionTitle>
        {today ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {today.prayers.map((p) => {
              const isNextPrayer = isNext(p);
              const past = !isNextPrayer && isPast(p);
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isNextPrayer ? 'rgba(245,197,24,0.08)' : 'transparent',
                    borderRight: isNextPrayer ? '3px solid var(--gold-500)' : '3px solid transparent',
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{PRAYER_ICONS[p.id]}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isNextPrayer ? 700 : 500,
                        color: isNextPrayer ? PRAYER_COLORS[p.id] : 'var(--fg-primary)',
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 14,
                      color: isNextPrayer ? 'var(--gold-500)' : 'var(--fg-secondary)',
                      fontWeight: isNextPrayer ? 700 : 400,
                    }}
                  >
                    {formatClock(p.time, settings.clock24h)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>جاري تحميل المواقيت…</div>
        )}
      </Card>

      {/* وصولٌ سريع */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => onOpenMore('quran')}>📖 القرآن</Button>
        <Button variant="secondary" onClick={() => onOpenMore('hisn')}>🛡️ حصن المسلم</Button>
        <Button variant="secondary" onClick={() => onOpenMore(isEvening() ? 'adhkar-evening' : 'adhkar-morning')}>
          {isEvening() ? '🌙 أذكار المساء' : '☀️ أذكار الصباح'}
        </Button>
        <Button variant="secondary" onClick={() => onOpenMore('tasbih')}>📿 التسبيح</Button>
        <div style={{ flex: 1 }} />
        <Button onClick={() => window.gtSalat.prayer.prefetch()}>🔄 تحديث المواقيت</Button>
        <Button onClick={() => window.gtSalat.notify.test()}>🔔 اختبار إشعار</Button>
      </div>
    </div>
  );
}

/** بطاقة رمضان: عدّادٌ قبل الشهر، ورقم اليوم أثناءه. */
function RamadanCard({ settings, onOpen }: { settings: AppSettings; onOpen: () => void }) {
  const h = hijriParts(new Date(), settings.hijriOffset ?? 0);
  const range = ramadanRange(new Date(), settings.hijriOffset ?? 0);
  if (!h || !range) return null;

  const inRamadan = h.month === 9;
  const daysLeft = Math.ceil((range.start.getTime() - Date.now()) / 86_400_000);

  // لا تظهر البطاقة إلا في رمضان أو قبله بشهرٍ على الأكثر، كي لا تزاحم لوحة التحكم طوال السنة.
  if (!inRamadan && daysLeft > 30) return null;

  return (
    <Card
      onClick={onOpen}
      style={{
        borderColor: 'var(--gold-600)',
        background: 'linear-gradient(90deg, rgba(245,197,24,0.07) 0%, transparent 70%)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 28 }}>🌛</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-500)' }}>
          {inRamadan ? `رمضان — اليوم ${h.day}` : `بقي على رمضان ${Math.max(0, daysLeft)} يوماً`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
          انقر لفتح إمساكية الشهر
        </div>
      </div>
      <span style={{ fontSize: 18, color: 'var(--fg-muted)' }}>←</span>
    </Card>
  );
}
