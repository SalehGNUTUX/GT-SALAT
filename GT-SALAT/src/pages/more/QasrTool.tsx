import { useState } from 'react';
import { Button, Card } from '../../components/common';

/**
 * أداةُ «هل يجوز لي القصر الآن؟» — منقولةٌ عن `QasrTool.kt` في نسخة الهاتف بنفس قواعدها.
 * المنطق نقيٌّ على المذهب المالكيّ: القصر عندهم **سنّةٌ مؤكّدة** لا رخصةٌ فقط، بشروطه.
 * إرشاديّةٌ لا تُغني عن سؤال أهل العلم — وهذا مكتوبٌ في ذيلها لا في تعليقٍ فقط.
 *
 * أيّ تعديلٍ في القواعد هنا يُنقَل إلى `QasrTool.kt` وإلّا أفتت النسختان بغير ما تفتي الأخرى.
 */

/** حدّ مسافة القصر عند المالكيّة: بريدان ≈ 48 ميلاً ≈ 83 كلم تقريباً. */
const QASR_DISTANCE_KM = 83;

const SOURCE = 'المذهب المالكيّ (مختصر خليل وشروحه، وأحكام الطهارة والصلاة — نايف آل مبارك)';

interface Answers {
  longDistance: boolean | null;
  leftTown: boolean | null;
  permissible: boolean | null;
  intendsStay4: boolean | null;
}

interface Verdict {
  ok: boolean;
  title: string;
  shortened: string;
  join: string;
  reason: string;
}

function evaluate(a: Required<{ [K in keyof Answers]: boolean }>): Verdict {
  if (!a.longDistance || !a.leftTown) {
    return {
      ok: false,
      title: 'لا قصر — لستَ في حكم المسافر',
      shortened: 'تُصلّى الصلوات تامّةً كالمقيم.',
      join: 'لا جمع.',
      reason: !a.longDistance
        ? `لأنّ وجهتك دون حدّ مسافة القصر (~${QASR_DISTANCE_KM} كلم).`
        : 'لأنّك لم تفارق عمران بلدك بعد؛ يبدأ حكم السفر بمفارقة العمران.',
    };
  }
  if (!a.permissible) {
    return {
      ok: false,
      title: 'لا رخصة في سفر المعصية',
      shortened: 'تُصلّى تامّةً على المشهور.',
      join: 'لا جمع.',
      reason: 'لأنّ رخص السفر (القصر والجمع) لا تُستباح بسفر المعصية على المشهور عند المالكيّة.',
    };
  }
  if (a.intendsStay4) {
    return {
      ok: false,
      title: 'تُتمّ الصلاة (نويتَ الإقامة)',
      shortened: 'تُصلّى تامّةً؛ انقطع حكم السفر بنيّة الإقامة.',
      join: 'لا جمع لأجل السفر.',
      reason: 'لأنّ من نوى الإقامة أربعة أيّامٍ فأكثر أتمّ ولم يقصر.',
    };
  }
  return {
    ok: true,
    title: 'يُسنّ لك القصر (سنّة مؤكّدة)',
    shortened:
      'تُقصَر الرباعيّة إلى ركعتين: الظهر والعصر والعشاء. أمّا الصبح فركعتان والمغرب ثلاثٌ فلا تُقصَران.',
    join: 'ويجوز الجمع (الظهر مع العصر، والمغرب مع العشاء) بشروطه في السفر.',
    reason:
      'لتحقّق شروط السفر: بلوغ المسافة، ومفارقة العمران، وإباحة السفر، وعدم نيّة الإقامة المانعة.',
  };
}

const QUESTIONS: { key: keyof Answers; text: string; hint?: string }[] = [
  { key: 'longDistance', text: `هل تبلغ وجهتك حدّ القصر (~${QASR_DISTANCE_KM} كلم) فأكثر؟` },
  { key: 'leftTown', text: 'هل فارقتَ عمران بلدك (خرجتَ من البنيان)؟' },
  { key: 'permissible', text: 'هل سفرك مباحٌ (ليس سفر معصية)؟' },
  { key: 'intendsStay4', text: 'هل نويتَ الإقامة أربعة أيّامٍ فأكثر في وجهتك؟' },
];

export function QasrToolPage() {
  const [ans, setAns] = useState<Answers>({
    longDistance: null,
    leftTown: null,
    permissible: null,
    intendsStay4: null,
  });

  const complete = QUESTIONS.every((q) => ans[q.key] !== null);
  const verdict = complete
    ? evaluate({
        longDistance: ans.longDistance!,
        leftTown: ans.leftTown!,
        permissible: ans.permissible!,
        intendsStay4: ans.intendsStay4!,
      })
    : null;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 760 }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 6 }}>
          🧭 هل يجوز لي القصر الآن؟
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.9 }}>
          أجِب عن الأسئلة الأربعة، وتظهر النتيجة على المذهب المالكيّ بمصدرها. إرشاديّةٌ تعليميّة —
          راجِع أهل العلم لحالتك الخاصّة.
        </div>
      </Card>

      {QUESTIONS.map((q) => (
        <Card key={q.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, lineHeight: 1.8 }}>{q.text}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                size="sm"
                variant={ans[q.key] === true ? 'primary' : 'secondary'}
                onClick={() => setAns({ ...ans, [q.key]: true })}
              >
                نعم
              </Button>
              <Button
                size="sm"
                variant={ans[q.key] === false ? 'primary' : 'secondary'}
                onClick={() => setAns({ ...ans, [q.key]: false })}
              >
                لا
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {verdict && (
        <Card
          style={{
            marginTop: 8,
            borderColor: verdict.ok ? 'var(--color-success)' : 'var(--gold-600)',
            background: verdict.ok ? 'rgba(76,175,80,0.06)' : 'var(--accent-tint)',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: verdict.ok ? 'var(--color-success)' : 'var(--gold-500)' }}>
            {verdict.title}
          </div>
          <div style={{ fontSize: 14, lineHeight: 2, marginBottom: 6 }}>{verdict.shortened}</div>
          <div style={{ fontSize: 14, lineHeight: 2, marginBottom: 10 }}>{verdict.join}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.9 }}>{verdict.reason}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12, lineHeight: 1.8 }}>
            المصدر: {SOURCE}
          </div>
        </Card>
      )}

      {complete && (
        <div style={{ marginTop: 14 }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAns({ longDistance: null, leftTown: null, permissible: null, intendsStay4: null })}
          >
            ↺ ابدأ من جديد
          </Button>
        </div>
      )}
    </div>
  );
}
