import { useState } from 'react';
import { Button, Card } from '../../components/common';

/**
 * أداةُ «طهرتُ الآن، ماذا أصلّي؟» — منقولةٌ عن `TaharaTool.kt` في نسخة الهاتف بنصّه.
 * هي **النسخة الإرشاديّة**: تعليميّةٌ تعرض القاعدة المالكيّة العامّة ولا تُصدر حكماً قاطعاً،
 * وتُحيل المسائل الخاصّة إلى أهل العلم — وهذا مكتوبٌ في متن الصفحة لا في تعليقٍ فقط.
 */

type Purity = 'confirmed' | 'not_yet' | 'unsure';

interface Guidance {
  title: string;
  ghusl?: string;
  currentPrayer?: string;
  previousPrayer?: string;
  missed?: string;
  reason?: string;
}

const SOURCE = 'الرسالة لابن أبي زيد، ومختصر خليل — باب الحيض';
const CONSULT = 'لضبط أوقات الاختيار والضرورة وحالتكِ الخاصّة، راجِعي أهل العلم.';

const GUIDANCE: Record<Purity, Guidance> = {
  confirmed: {
    title: 'تحقّق الطهر — هذا الإرشاد العامّ',
    ghusl: 'يجب الغسل (غسل الحيض/النفاس) فوراً، ثمّ تُصلّين.',
    currentPrayer: 'تلزمكِ الصلاة الحاضرة إن أدركتِ من وقتها قدرَ ركعةٍ فأكثر قبل خروجه.',
    previousPrayer:
      'وقد تلزم الصلاة التي قبلها إن كانت تُجمع مع الحاضرة (الظهر مع العصر، والمغرب مع العشاء) في أوقات الضرورة، على تفصيلٍ في المذهب المالكيّ.',
    missed: 'لا تُقضى الصلوات التي مرّت أثناء الحيض (بخلاف صيام رمضان فيُقضى).',
    reason: 'لأنّ الطهر يرفع مانع الحيض، فتلزم الصلاة بإدراك وقتها.',
  },
  not_yet: {
    title: 'لم يتحقّق الطهر بعد',
    ghusl: 'لا تغتسلي للحيض ولا تصلّي حتى تتيقّني الطهر بعلامته.',
    missed: 'الحائض لا تصلّي، ولا تقضي صلاة أيّام الحيض.',
    reason: 'لأنّ علامة الطهر (القصّة البيضاء أو الجفوف) لم تظهر بعد.',
  },
  unsure: {
    title: 'عند الشكّ: الأصل بقاء الحيض',
    ghusl: 'لا تعجَلي؛ الأصل بقاء الحيض حتى يتيقّن الطهر بعلامته.',
    reason: 'لأنّ اليقين لا يزول بالشكّ.',
  },
};

const CHOICES: { value: Purity; label: string }[] = [
  { value: 'confirmed', label: 'نعم، تحقّق الطهر بعلامته' },
  { value: 'not_yet', label: 'لا، لم يتحقّق بعد' },
  { value: 'unsure', label: 'لستُ متأكّدة' },
];

/** الحقول الفارغة لا تُعرَض — كما في الهاتف. */
const ROWS: { key: keyof Guidance; label: string }[] = [
  { key: 'ghusl', label: 'الغسل' },
  { key: 'currentPrayer', label: 'الصلاة الحاضرة' },
  { key: 'previousPrayer', label: 'الصلاة التي قبلها' },
  { key: 'missed', label: 'ما فات' },
  { key: 'reason', label: 'السبب' },
];

export function TaharaToolPage() {
  const [purity, setPurity] = useState<Purity | null>(null);
  const g = purity ? GUIDANCE[purity] : null;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 760 }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 6 }}>
          🌸 طهرتُ الآن، ماذا أصلّي؟
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.9 }}>
          إرشادٌ تعليميٌّ عامٌّ على المذهب المالكيّ — لا يُصدر حكماً قاطعاً في حالةٍ بعينها.
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 12 }}>هل تحقّق الطهر بعلامته؟</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHOICES.map((c) => (
            <Button
              key={c.value}
              size="sm"
              variant={purity === c.value ? 'primary' : 'secondary'}
              onClick={() => setPurity(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </Card>

      {g && (
        <Card style={{ borderColor: 'var(--gold-600)', background: 'var(--accent-tint)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 12 }}>{g.title}</div>
          {ROWS.filter((r) => g[r.key]).map((r) => (
            <div key={r.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 14, lineHeight: 2 }}>{g[r.key]}</div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 12, lineHeight: 1.9 }}>{CONSULT}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>المصدر: {SOURCE}</div>
        </Card>
      )}
    </div>
  );
}
