import { Button, Card, ChipGroup, Slider, Toggle } from '../../components/common';
import { useVoiceCounter } from '../../hooks/useVoiceCounter';
import type { AppSettings } from '../../hooks/useSettings';

/** الأذكار المفردة — **مطابقةٌ لـ`TasbihUi.DHIKR_LIST`** في نسخة الهاتف. */
const DHIKR_LIST = [
  'سُبْحَانَ اللهِ',
  'الْحَمْدُ لِلَّهِ',
  'لَا إِلَهَ إِلَّا اللهُ',
  'اللهُ أَكْبَرُ',
  'أَسْتَغْفِرُ اللهَ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
  'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
];

/**
 * أنواع التسبيح المختلط — كلماتُ كلّ نوعٍ **تتناوب** واحدةً بعد الأخرى مع كلّ عدّة،
 * لا تُكرَّر كلمةٌ واحدة. مطابقةٌ لـ`TasbihUi.MIXED_TYPES` في نسخة الهاتف.
 */
const MIXED_TYPES: { name: string; phrases: string[] }[] = [
  {
    name: 'تسبيح',
    phrases: ['سُبْحَانَ اللهِ وَبِحَمْدِهِ', 'سُبْحَانَ اللهِ الْعَظِيمِ'],
  },
  {
    name: 'الباقيات الصالحات',
    phrases: [
      'سُبْحَانَ اللهِ',
      'الْحَمْدُ لِلَّهِ',
      'لَا إِلَهَ إِلَّا اللهُ',
      'اللهُ أَكْبَرُ',
      'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    ],
  },
];

/**
 * مِسبحةٌ إلكترونية. العدّاد والهدف والمجموع التراكمي والوضع محفوظةٌ في الإعدادات
 * (لا في localStorage) فتبقى مع النسخ الاحتياطي وتُرى من أي صفحة.
 *
 * **العدّ تصاعديٌّ لا يلفّ** (كما في الهاتف): الدورة الجارية `count % target` وعدد الدورات
 * `count / target` — ولولا ذلك لانقطع تناوبُ الكلمات في الوضع المختلط عند كلّ لفّة.
 * والهدف `0` يعني **بلا حدّ**.
 */
export function TasbihPage({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const count = settings.tasbihCount ?? 0;
  const target = settings.tasbihTarget ?? 33;
  const total = settings.tasbihTotal ?? 0;
  const mixed = settings.tasbihMixed ?? false;
  const mixedType = Math.min(Math.max(settings.tasbihMixedType ?? 0, 0), MIXED_TYPES.length - 1);
  const dhikrIndex = Math.min(Math.max(settings.tasbihDhikrIndex ?? 0, 0), DHIKR_LIST.length - 1);

  const phrases = MIXED_TYPES[mixedType].phrases;
  const inLap = target > 0 ? count % target : count;
  const laps = target > 0 ? Math.floor(count / target) : 0;
  const reached = target > 0 && count > 0 && inLap === 0;

  // في المختلط تتناوب الكلمة مع كلّ عدّة، وفي العادي ذكرٌ واحدٌ ثابت.
  const phrase = mixed ? phrases[count % phrases.length] : DHIKR_LIST[dhikrIndex];

  const tap = () => update({ tasbihCount: count + 1, tasbihTotal: total + 1 });

  // الوضع الصوتيّ: كلّ نطقةٍ تُحسَب تسبيحةً (يعمل دون إنترنت) — كما في نسخة الهاتف.
  const voice = useVoiceCounter(settings.tasbihVoiceSensitivity ?? 50, tap);

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Card style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>الهدف</span>
          <ChipGroup<number>
            value={target}
            options={[33, 99, 100, 0].map((v) => ({ value: v, label: v === 0 ? 'بلا حدّ' : String(v) }))}
            onChange={(v) => update({ tasbihTarget: v, tasbihCount: 0 })}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
            التسبيح المختلط
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginRight: 6 }}>
              كلماتٌ تتناوب مع كلّ عدّة
            </span>
          </span>
          <Toggle on={mixed} onChange={(v) => update({ tasbihMixed: v, tasbihCount: 0 })} />
        </div>

        {mixed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>النوع</span>
            <ChipGroup<number>
              value={mixedType}
              options={MIXED_TYPES.map((t, i) => ({ value: i, label: t.name }))}
              onChange={(v) => update({ tasbihMixedType: v, tasbihCount: 0 })}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>الذكر</span>
            <ChipGroup<number>
              value={dhikrIndex}
              options={DHIKR_LIST.map((d, i) => ({ value: i, label: d }))}
              onChange={(v) => update({ tasbihDhikrIndex: v, tasbihCount: 0 })}
            />
          </div>
        )}
      </Card>

      <Card style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
            🎙️ العدّ بالصوت
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginRight: 6 }}>
              كلّ نطقةٍ تُحسَب تسبيحةً — دون إنترنت
            </span>
          </span>
          <Button size="sm" variant={voice.active ? 'danger' : undefined} onClick={() => (voice.active ? voice.stop() : voice.start())}>
            {voice.active ? '⏹ إيقاف الاستماع' : '🎙️ ابدأ الاستماع'}
          </Button>
        </div>

        {voice.active && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>الحساسيّة</span>
              <Slider
                value={settings.tasbihVoiceSensitivity ?? 50}
                min={0}
                max={100}
                suffix="٪"
                onCommit={(v) => update({ tasbihVoiceSensitivity: v })}
              />
            </div>
            {/* مؤشّرُ مستوىً يطمئن أنّ الميكروفون يلتقط فعلاً — بلا شيءٍ يظنّ المستخدم العطب. */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, voice.level * 400)}%`,
                  background: 'var(--teal-500)',
                  transition: 'width 0.08s linear',
                }}
              />
            </div>
          </>
        )}

        {voice.error && <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{voice.error}</div>}
      </Card>

      {/* الذكر الجاري فوق العدّاد — هو المقصود، والرقم خادمٌ له. */}
      <div
        className="dhikr-text"
        style={{ fontSize: 26, color: 'var(--gold-500)', textAlign: 'center', minHeight: 40 }}
      >
        {phrase}
      </div>

      {/* منطقة العدّ: كامل المساحة حول الدائرة قابلةٌ للنقر، لا الدائرة وحدها —
          فالمُسبِّح لا ينشغل بإصابة هدفٍ صغير. */}
      <div
        onClick={tap}
        style={{
          width: '100%',
          maxWidth: 520,
          padding: '16px 0',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: reached ? 'rgba(76,175,80,0.1)' : 'var(--accent-tint)',
            border: `3px solid ${reached ? 'var(--color-success)' : 'var(--teal-500)'}`,
            boxShadow: 'var(--shadow-glow-teal)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          className="btn-press"
        >
          <span
            className="mono"
            style={{ fontSize: 64, fontWeight: 700, color: reached ? 'var(--color-success)' : 'var(--teal-400)', lineHeight: 1 }}
          >
            {inLap}
          </span>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {target > 0 ? `من ${target}` : 'بلا حدّ'}
          </span>
          {laps > 0 && (
            <span style={{ fontSize: 12, color: 'var(--gold-500)' }}>أتممتَ {laps} دورة</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
          المجموع التراكمي: <span className="mono" style={{ color: 'var(--gold-500)', fontWeight: 700 }}>{total}</span>
        </span>
        <Button size="sm" onClick={() => update({ tasbihCount: 0 })}>تصفير الدورة</Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            if (confirm('سيُصفَّر المجموع التراكمي كلّه. هل أنت متأكد؟')) {
              update({ tasbihCount: 0, tasbihTotal: 0 });
            }
          }}
        >
          تصفير المجموع
        </Button>
      </div>

      {mixed && (
        <Card onClick={tap} style={{ width: '100%', maxWidth: 520, userSelect: 'none' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
            كلمات «{MIXED_TYPES[mixedType].name}» — تتناوب مع كلّ نقرة:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {phrases.map((p, i) => (
              <div
                key={p}
                className="dhikr-text"
                style={{
                  fontSize: 19,
                  textAlign: 'center',
                  color: i === count % phrases.length ? 'var(--teal-400)' : 'var(--fg-muted)',
                  fontWeight: i === count % phrases.length ? 700 : 400,
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
