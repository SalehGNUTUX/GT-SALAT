import { useEffect, useState } from 'react';
import { Button, Card, CopyButton, EmptyState, SectionTitle } from '../../components/common';
import { AudioSeekBar } from '../../components/AudioSeekBar';
import { usePlayer } from '../../hooks/usePlayer';
import { adhkarTrackById } from './AdhkarAudio';
import { resourceUrl } from '@electron/quran';
import type { RuqyahFile, RuqyahSection, RuqyahSegment, TafsirSurah } from '@electron/types';

/**
 * «الرقية الشرعية» — البنية من `ruqyah.json` (نفس ملفّ نسخة الهاتف)، و**نصّ الآيات لا يأتي
 * معه**: المقطع يحمل السورة ومدى الآيات فقط، والنصّ يُجلب من `tafsirSurah` — فلا يتكرّر
 * القرآن في ملفّين ولا يمرّ نصٌّ زائدٌ عبر IPC.
 *
 * والاستماع بتسجيل الشيخ سعد الغامدي المُضمَّن، عبر **المشغّل العالميّ** لا عنصرِ صوتٍ في
 * الصفحة — فالتنقّل بين الأقسام لا يقطع الرقية.
 */
const RUQYAH_AUDIO_ID = 'ruqyah-ghamdi';

export function RuqyahPage() {
  const [file, setFile] = useState<RuqyahFile | null>(null);
  const [openId, setOpenId] = useState('');
  const { track, status, toggle } = usePlayer();

  useEffect(() => {
    window.gtSalat.content.ruqyah().then(setFile);
  }, []);

  if (!file) return <EmptyState icon="⏳" text="يُحمّل المحتوى…" />;

  const open = file.sections.find((s) => s.id === openId) ?? null;
  const isCurrent = track?.id === RUQYAH_AUDIO_ID;
  const playing = isCurrent && status === 'playing';

  // نفس المقطع المُعرَّف في «الأذكار الصوتية» بمعرّفه وملفّه — فالتشغيل من هنا أو من هناك
  // مقطعٌ واحدٌ لا مقطعان بنفس الصوت، والشريط يعرف حالته في الموضعين.
  const listen = () => {
    const t = adhkarTrackById(RUQYAH_AUDIO_ID);
    if (!t) return;
    toggle({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      url: resourceUrl(t.file),
      section: t.section,
      icon: t.icon,
    });
  };

  if (open) {
    return <RuqyahSectionView section={open} disclaimer={file.disclaimer} onBack={() => setOpenId('')} />;
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {file.disclaimer && (
        <Card style={{ marginBottom: 16, borderColor: 'var(--gold-600)', background: 'var(--accent-tint)' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.9 }}>ℹ️ {file.disclaimer}</div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🎧 أستمع</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              رقيةٌ بصوت الشيخ سعد الغامدي — مُضمَّنةٌ في التطبيق، تعمل دون إنترنت وتستمرّ عبر الأقسام.
            </div>
          </div>
          <Button variant={playing ? 'danger' : 'primary'} onClick={listen}>
            {playing ? '⏹ إيقاف' : '▶ استمع'}
          </Button>
        </div>

        {/* تسجيلٌ من 63 دقيقة — بلا شريط مدّةٍ لا يُستأنَف من موضعٍ ولا يُتنقَّل فيه. */}
        {isCurrent && (
          <div style={{ marginTop: 12 }}>
            <AudioSeekBar />
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
        {file.sections.map((s) => (
          <Card key={s.id} onClick={() => setOpenId(s.id)} style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
            {s.note && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.8 }}>{s.note}</div>
            )}
            {(s.segments ?? []).length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 8 }}>
                📖 {s.segments!.length} مقطعاً
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function RuqyahSectionView({
  section,
  disclaimer,
  onBack,
}: {
  section: RuqyahSection;
  disclaimer?: string;
  onBack: () => void;
}) {
  // السور المطلوبة تُجلب مرّةً وتُخزَّن — قسمُ الرقية الواحد قد يقرأ من عشر سور.
  const [surahs, setSurahs] = useState<Record<number, TafsirSurah>>({});

  useEffect(() => {
    const needed = Array.from(
      new Set((section.segments ?? []).filter((g) => g.kind !== 'dua' && g.surah).map((g) => g.surah!)),
    );
    let alive = true;
    Promise.all(needed.map((n) => window.gtSalat.content.tafsirSurah(n))).then((list) => {
      if (!alive) return;
      const map: Record<number, TafsirSurah> = {};
      list.forEach((s) => {
        if (s) map[s.n] = s;
      });
      setSurahs(map);
    });
    return () => {
      alive = false;
    };
  }, [section]);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', maxWidth: 900 }}>
      <div style={{ marginBottom: 14 }}>
        <Button size="sm" variant="secondary" onClick={onBack}>← كلّ الأقسام</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--gold-500)', marginBottom: 6 }}>{section.title}</div>
        {section.note && <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 2 }}>{section.note}</div>}
      </Card>

      {(section.segments ?? []).map((seg, i) => (
        <SegmentCard key={i} seg={seg} surah={seg.surah ? surahs[seg.surah] : undefined} sectionTitle={section.title} />
      ))}

      {disclaimer && (
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.9, marginTop: 8 }}>ℹ️ {disclaimer}</div>
      )}
    </div>
  );
}

function SegmentCard({
  seg,
  surah,
  sectionTitle,
}: {
  seg: RuqyahSegment;
  surah?: TafsirSurah;
  sectionTitle: string;
}) {
  const isQuran = seg.kind !== 'dua' && seg.kind !== 'dhikr' && !!seg.surah;
  const ayahs = isQuran && surah
    ? (surah.ayahs ?? []).filter((a) => a.n >= (seg.ayahFrom || 1) && a.n <= (seg.ayahTo || 9999))
    : [];
  const body = isQuran ? ayahs.map((a) => `${a.text} ﴿${a.n}﴾`).join(' ') : seg.text ?? '';

  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(seg.repeat ?? 0) > 0 && (
              <span style={{ fontSize: 11, color: 'var(--gold-500)', whiteSpace: 'nowrap' }}>
                × {seg.repeat}
              </span>
            )}
            <CopyButton text={body} source={`${sectionTitle} — ${seg.label ?? ''}`} />
          </div>
        }
      >
        {seg.label}
      </SectionTitle>

      {isQuran && !surah ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>… يُحمّل النصّ</div>
      ) : (
        <div className="quran-text" style={{ fontSize: 20, lineHeight: 2.3, textAlign: 'justify' }}>
          {body}
        </div>
      )}

      {seg.note && (
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 10, lineHeight: 1.9 }}>{seg.note}</div>
      )}
      {seg.source && (seg.source.title || seg.source.ref) && (
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
          📚 {[seg.source.title, seg.source.ref].filter(Boolean).join(' — ')}
        </div>
      )}
    </Card>
  );
}
