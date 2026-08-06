import { Card } from '../components/common';
import type { AppSettings } from '../hooks/useSettings';

/** أقصى ما يُثبَّت في الشريط الجانبي — أكثر من ذلك يُطيل الشريط ويُفقده معناه. */
export const MAX_FAVORITE_SECTIONS = 3;

/** أقسام «المزيد» — الترتيب حسب الأولوية، مطابقٌ لنسخة الهاتف. */
export const MORE_FEATURES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'tafsir', label: 'التفسير الميسّر', icon: '📝', desc: 'تفسير كل آية · بحثٌ في نصّ التفسير نفسه' },
  { id: 'hisn', label: 'حصن المسلم', icon: '🛡️', desc: '132 باباً · 267 ذكراً' },
  { id: 'adhkar-morning', label: 'أذكار الصباح', icon: '☀️', desc: '22 ذكراً بعدد تكرارها' },
  { id: 'adhkar-evening', label: 'أذكار المساء', icon: '🌙', desc: '21 ذكراً بعدد تكرارها' },
  { id: 'tasbih', label: 'التسبيح', icon: '📿', desc: 'عدّادٌ بهدفٍ ومجموعٍ تراكمي' },
  { id: 'duas', label: 'الأدعية المأثورة', icon: '🤲', desc: '28 دعاءً في 5 أبواب' },
  { id: 'hadith', label: 'الأربعون والأحاديث', icon: '📜', desc: 'النووية 40 · رياض الصالحين 50' },
  { id: 'asma', label: 'أسماء الله الحسنى', icon: '✨', desc: '100 اسمٍ بمعانيها وشواهدها' },
  { id: 'hikam', label: 'حِكَم ومواعظ', icon: '💬', desc: '32 حكمةً في 4 أبواب' },
  { id: 'events', label: 'أحداثٌ تاريخية', icon: '🏛️', desc: '59 حدثاً في السيرة والتاريخ' },
  { id: 'radios', label: 'الإذاعات', icon: '📻', desc: '36 إذاعةً قرآنيةً مباشرة' },
  { id: 'imsakiah', label: 'إمساكية رمضان', icon: '🌛', desc: 'الإمساك والإفطار طوال الشهر' },
];

export function MorePage({
  onOpen,
  settings,
  update,
}: {
  onOpen: (id: string) => void;
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const favorites = settings.favoriteSections ?? [];
  const full = favorites.length >= MAX_FAVORITE_SECTIONS;

  const toggleFav = (id: string) => {
    if (favorites.includes(id)) {
      update({ favoriteSections: favorites.filter((f) => f !== id) });
    } else if (!full) {
      update({ favoriteSections: [...favorites, id] });
    }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        ثبّت أقسامك الأكثر استعمالاً في الشريط الجانبي بنجمة ⭐ — إلى {MAX_FAVORITE_SECTIONS} أقسام.
        {full && ' (اكتمل العدد — أزل واحداً لتُضيف غيره.)'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {MORE_FEATURES.map((f) => {
          const fav = favorites.includes(f.id);
          return (
          <Card
            key={f.id}
            style={{
              padding: '20px 18px',
              transition: 'all 0.15s',
              position: 'relative',
              borderColor: fav ? 'var(--gold-600)' : undefined,
            }}
          >
            {/* النجمة فوق البطاقة لا داخل مساحة الفتح، فلا يختلط التثبيت بالدخول */}
            <button
              onClick={() => toggleFav(f.id)}
              title={fav ? 'إزالة من الشريط الجانبي' : full ? `اكتمل العدد (${MAX_FAVORITE_SECTIONS})` : 'تثبيت في الشريط الجانبي'}
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'transparent',
                border: 'none',
                fontSize: 15,
                cursor: fav || !full ? 'pointer' : 'not-allowed',
                opacity: fav ? 1 : full ? 0.15 : 0.35,
                zIndex: 1,
              }}
            >
              ⭐
            </button>
            <div
              onClick={() => onOpen(f.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--accent-tint)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg-primary)' }}>{f.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
