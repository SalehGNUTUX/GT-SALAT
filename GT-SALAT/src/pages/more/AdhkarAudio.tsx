import { Card, SectionTitle, Button } from '../../components/common';
import { AudioSeekBar } from '../../components/AudioSeekBar';
import { usePlayer } from '../../hooks/usePlayer';
import { resourceUrl } from '@electron/quran';

/**
 * «الأذكار الصوتية» — تسجيلاتٌ **مُضمَّنةٌ** في التطبيق (نفس مقاطع الهاتف، Opus في وعاء ogg)
 * تعمل دون إنترنت، وتُشغَّل عبر **المشغّل العالميّ** لا بعنصر صوتٍ في الصفحة: تفكيك المكوّن
 * عند التنقّل كان سيقطع الاستماع.
 *
 * فهرسُ المقاطع — **مصدرٌ واحد**: أضِف تسجيلاً هنا فيظهر في القسم تلقائياً،
 * ويستعمله قسمُ الرقية نفسه لزرّ «استمع» فلا يتفرّق تعريفُ المقطع بين موضعين.
 * مطابقٌ لـ`ADHKAR_AUDIO_TRACKS` في نسخة الهاتف — ومنه **الرقيةُ الكاملة**، فمن جاء يلتمس
 * الأذكار الصوتيّة وجدها معها ولم يُطالَب بالبحث عنها في قسمٍ آخر.
 *
 * و`section` وجهةُ النقر على شريط المشغّل — **لكلّ مقطعٍ وجهتُه** لا وجهةٌ واحدةٌ للقسم:
 * الرقية تعيدك إلى قسم الرقية، وأذكار النوم إلى بابها في حصن المسلم.
 */
export interface AdhkarAudioTrack {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  icon: string;
  section: string;
}

export const ADHKAR_AUDIO_TRACKS: AdhkarAudioTrack[] = [
  {
    id: 'adhkar-morning-audio',
    title: 'أذكار الصباح',
    subtitle: 'التسجيل الكامل · نحو 21 دقيقة — يعمل دون إنترنت',
    file: 'audio/adhkar_morning.ogg',
    icon: '☀️',
    section: 'more/adhkar-morning',
  },
  {
    id: 'adhkar-evening-audio',
    title: 'أذكار المساء',
    subtitle: 'التسجيل الكامل · نحو 21 دقيقة — يعمل دون إنترنت',
    file: 'audio/adhkar_evening.ogg',
    icon: '🌙',
    section: 'more/adhkar-evening',
  },
  {
    id: 'adhkar-sleep-audio',
    title: 'أذكار النوم',
    subtitle: 'التسجيل الكامل · نحو 11 دقيقة — يعمل دون إنترنت',
    file: 'audio/adhkar_sleep.ogg',
    icon: '🛏️',
    section: 'more/adhkar-sleep',
  },
  {
    id: 'ruqyah-ghamdi',
    title: 'الرقية الشرعية — سعد الغامدي',
    subtitle: 'التسجيل الكامل · نحو 63 دقيقة — يعمل دون إنترنت',
    file: 'audio/ruqyah_ghamdi.ogg',
    icon: '🌿',
    section: 'more/ruqyah',
  },
];

/** المقطع بمعرّفه — يستعمله قسمُ الرقية كي لا يُعرِّف مقطعاً ثانياً بنفس الملفّ. */
export function adhkarTrackById(id: string): AdhkarAudioTrack | undefined {
  return ADHKAR_AUDIO_TRACKS.find((t) => t.id === id);
}

export function AdhkarAudioPage() {
  const { track, status, toggle } = usePlayer();

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 760 }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.9 }}>
          استماعٌ للأذكار بصوتٍ مُضمَّنٍ في التطبيق — يستمرّ عبر الأقسام، والنقر على شريط المشغّل
          يعيدك إلى هنا.
        </div>
      </Card>

      {ADHKAR_AUDIO_TRACKS.map((t) => {
        // «الجاري» أوسع من «يعمل الآن»: المقطع الموقوف مؤقّتاً يبقى شريطُه ظاهراً ليُستأنَف منه.
        const isCurrent = track?.id === t.id;
        const playing = isCurrent && status === 'playing';
        return (
          <Card key={t.id} style={{ marginBottom: 12 }}>
            <SectionTitle
              action={
                <Button
                  size="sm"
                  variant={playing ? 'danger' : 'primary'}
                  onClick={() =>
                    toggle({
                      id: t.id,
                      title: t.title,
                      subtitle: t.subtitle,
                      url: resourceUrl(t.file),
                      section: t.section,
                      icon: t.icon,
                    })
                  }
                >
                  {playing ? '⏹ إيقاف' : '▶ استماع'}
                </Button>
              }
            >
              {t.icon} {t.title}
            </SectionTitle>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t.subtitle}</div>

            {/* المقطعُ الجاري وحده يحمل شريط المدّة — أربعةُ أشرطةٍ ساكنةٍ زينةٌ لا فائدة فيها.
                وهذه ملفّاتٌ محلّيّة، فالانتقال فيها فوريٌّ بلا انتظار تحميل. */}
            {isCurrent && (
              <div style={{ marginTop: 12 }}>
                <AudioSeekBar />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
