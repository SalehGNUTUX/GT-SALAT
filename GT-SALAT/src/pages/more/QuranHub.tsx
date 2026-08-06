import { QuranPage } from './Quran';
import { QuranAudioPage } from './QuranAudio';
import { MushafPage } from './Mushaf';
import type { AppSettings } from '../../hooks/useSettings';

/**
 * القرآن الكريم — ثلاثة أقسامٍ فرعية كما في نسخة الهاتف، لكلٍّ منها غرضٌ لا يشاركه غيره:
 *
 * | القسم | ما ينفرد به |
 * |------|--------------|
 * | القرآن النصّيّ | النصّ العثماني (يعمل دون إنترنت) · تلاوةٌ آية-بآية **بتظليل** · بحثٌ في الآيات · إشارات |
 * | القرآن المسموع | تلاواتٌ كاملةٌ بعشرات القرّاء والروايات — استماعٌ متّصلٌ بلا تظليل |
 * | المصحف المصوَّر | صور صفحات المصحف بروايتَي حفص وورش — قراءةٌ بالرسم لا بالنصّ |
 *
 * **التبويب مربوطٌ بالمسار (`sub`) لا بحالةٍ داخلية**، ليصحّ التنقّل من الإشعارات ومن شريط
 * المشغّل: مقطعٌ يحمل `section: 'quran/audio'` يعيد المستخدم إلى تبويبه بعينه.
 */
export const QURAN_TABS = [
  { id: 'text', label: 'القرآن النصّيّ', icon: '📖' },
  { id: 'audio', label: 'القرآن المسموع', icon: '🎧' },
  { id: 'mushaf', label: 'المصحف المصوَّر', icon: '📜' },
] as const;

/** التبويب الافتراضي حين يُفتَح القسم بلا مسارٍ فرعي. */
export const DEFAULT_QURAN_TAB: QuranTabId = 'text';

export type QuranTabId = (typeof QURAN_TABS)[number]['id'];

export function isQuranTab(id: string | null): id is QuranTabId {
  return QURAN_TABS.some((t) => t.id === id);
}

export function quranTabOf(sub: string | null): QuranTabId {
  return isQuranTab(sub) ? sub : DEFAULT_QURAN_TAB;
}

export function QuranHub({
  tab,
  onTab,
  settings,
  update,
}: {
  tab: QuranTabId;
  onTab: (id: QuranTabId) => void;
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '14px 24px 0',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {QURAN_TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${on ? 'var(--teal-500)' : 'transparent'}`,
                color: on ? 'var(--teal-400)' : 'var(--fg-secondary)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: on ? 700 : 500,
                padding: '8px 14px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'text' && <QuranPage settings={settings} update={update} />}
        {tab === 'audio' && <QuranAudioPage settings={settings} update={update} />}
        {tab === 'mushaf' && <MushafPage settings={settings} update={update} />}
      </div>
    </div>
  );
}
