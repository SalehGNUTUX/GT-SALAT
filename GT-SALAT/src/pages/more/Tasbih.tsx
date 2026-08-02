import { Button, Card, ChipGroup } from '../../components/common';
import type { AppSettings } from '../../hooks/useSettings';

const PHRASES = ['سُبْحَانَ اللهِ', 'الْحَمْدُ لِلَّهِ', 'اللهُ أَكْبَرُ', 'لَا إِلَهَ إِلَّا اللهُ', 'أَسْتَغْفِرُ اللهَ'];

/**
 * مِسبحةٌ إلكترونية. العدّاد والهدف والمجموع التراكمي محفوظةٌ في الإعدادات
 * (لا في localStorage) فتبقى مع النسخ الاحتياطي وتُرى من أي صفحة.
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
  const reached = target > 0 && count >= target;

  const tap = () => {
    const next = count + 1;
    // عند بلوغ الهدف نلفّ العدّاد إلى الصفر ونُبقي المجموع تراكمياً.
    update({ tasbihCount: next >= target ? 0 : next, tasbihTotal: total + 1 });
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <Card style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>الهدف</span>
          <ChipGroup<number>
            value={target}
            options={[33, 99, 100, 1000].map((v) => ({ value: v, label: String(v) }))}
            onChange={(v) => update({ tasbihTarget: v, tasbihCount: 0 })}
          />
        </div>
      </Card>

      {/* منطقة العدّ: كامل المساحة حول الدائرة قابلةٌ للنقر، لا الدائرة وحدها —
          فالمُسبِّح لا ينشغل بإصابة هدفٍ صغير. */}
      <div
        onClick={tap}
        style={{
          width: '100%',
          maxWidth: 520,
          padding: '24px 0',
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
        <span className="mono" style={{ fontSize: 64, fontWeight: 700, color: reached ? 'var(--color-success)' : 'var(--teal-400)', lineHeight: 1 }}>
          {count}
        </span>
        <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>من {target}</span>
      </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

      <Card onClick={tap} style={{ width: '100%', maxWidth: 520, userSelect: 'none' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
          من الباقيات الصالحات — انقر هنا أو على العدّاد لتُحصي:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PHRASES.map((p) => (
            <div key={p} className="dhikr-text" style={{ fontSize: 20, color: 'var(--fg-primary)', textAlign: 'center' }}>
              {p}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
