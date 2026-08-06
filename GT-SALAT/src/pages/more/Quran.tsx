import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ChipGroup, CopyButton, EmptyState, SearchInput, Toggle } from '../../components/common';
import type { AyahHit, DownloadTask, QuranMeta, Reciter, SurahMeta, SurahReciter, TafsirSurah, TafsirSurahInfo } from '@electron/types';
import { ayahAudioUrl, ayahAudioRel, basmalaUrl, needsBasmala, surahAudioUrl, surahAudioRel } from '@electron/quran';

import { usePlayer, type PlayerTrack } from '../../hooks/usePlayer';
import type { AppSettings } from '../../hooks/useSettings';
import { isCustomReciter, newReciterId, useReciters } from '../../hooks/useReciters';
import { ReciterDialog, toDraft, type ReciterDraft } from '../../components/ReciterDialog';

/**
 * القرآن الكريم نصّاً + التفسير الميسّر — قارئٌ واحدٌ بوضعين.
 *
 * النصّ العثماني والتفسير كلاهما في `tafsir.json` المُضمَّن، فيعمل القسم كلّه دون إنترنت.
 * تُطلَب سورةٌ واحدةٌ في كل مرّة عبر IPC (لا يمرّ الملف كاملاً على الواجهة).
 *
 * تلاوة الصوت والمصحف المصوَّر مؤجَّلان إلى نسخةٍ لاحقة (يحتاجان تنزيلاً وشبكة).
 */
interface Props {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  /** الوضع الافتراضي: قارئ القرآن، أو التفسير الميسّر. */
  withTafsir?: boolean;
}

type View = { kind: 'index' } | { kind: 'surah'; n: number; goto?: number } | { kind: 'bookmarks' };

/**
 * ما يُتلى قبل الآيات في تلاوة السورة الكاملة ولا يُعدّ منها — يدخل توزيع المدّة بطوله
 * (انظر `track` في `SurahReader`). نصّهما هنا للطول لا للعرض.
 */
const ISTIAADHA_TEXT = 'أعوذ بالله من الشيطان الرجيم';
const BASMALA_TEXT = 'بسم الله الرحمن الرحيم';

export function QuranPage({ settings, update, withTafsir = false }: Props) {
  const player = usePlayer();
  const [meta, setMeta] = useState<QuranMeta | null>(null);
  const [index, setIndex] = useState<TafsirSurahInfo[]>([]);
  /**
   * إن كان القسم يُفتَح والتلاوة جارية (بالنقر على شريط المشغّل مثلاً) فافتح **سورتها**
   * لا الفهرس — «العودة إلى القسم» تعني العودة إلى مصدر ما تسمعه.
   */
  const [view, setView] = useState<View>(() => {
    const m = player.track?.mark;
    return m && m.surah > 0 ? { kind: 'surah', n: m.surah, goto: m.ayah || undefined } : { kind: 'index' };
  });
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AyahHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showTafsir, setShowTafsir] = useState(withTafsir);
  /** نطاق البحث في الفهرس: أسماء السور (تصفية) أم النصّ كلّه (بحثٌ شامل). */
  const [scope, setScope] = useState<'surahs' | 'text'>('surahs');
  /** صوت الآيات المُنزَّل عند القارئ المختار: `{ رقم السورة: عدد الآيات المُنزَّلة }`. */
  const [dlAyah, setDlAyah] = useState<Record<number, number>>({});
  const [onlyDownloaded, setOnlyDownloaded] = useState(false);

  useEffect(() => {
    window.gtSalat.content.quranMeta().then(setMeta);
    window.gtSalat.content.tafsirIndex().then(setIndex);
  }, []);

  // البحث الشامل يجري في العملية الرئيسية. في وضع التفسير يبحث في **نصّ التفسير**
  // لا في الآيات — فتجد الآيات التي فُسِّرت بمعنًى تبحث عنه، وهذا ما ينفرد به هذا القسم.
  useEffect(() => {
    const q = query.trim();
    if (scope !== 'text' || q.length < 2) {
      setHits(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      setHits(
        withTafsir
          ? await window.gtSalat.content.tafsirSearch(q)
          : await window.gtSalat.content.quranSearch(q),
      );
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query, withTafsir, scope]);

  const surahMeta = useMemo(() => {
    const map = new Map<number, SurahMeta>();
    for (const s of meta?.surahs ?? []) map.set(s.n, s);
    return map;
  }, [meta]);

  // القارئ المختار للتلاوة آية-بآية — عليه يُبنى تمييز السور المُنزَّل صوتها.
  const { ayah: ayahReciters } = useReciters(meta, settings);
  const activeReciterId =
    (ayahReciters.find((r) => r.id === settings.lastReciterId) ?? ayahReciters[0])?.id ?? '';

  // تُحدَّث عند العودة إلى الفهرس أيضاً، فيظهر ما نُزِّل من داخل القارئ فوراً.
  useEffect(() => {
    if (!activeReciterId) return;
    window.gtSalat.downloads.downloaded('ayah-audio', activeReciterId).then(setDlAyah);
  }, [activeReciterId, view.kind]);

  if (view.kind === 'surah') {
    return (
      <SurahReader
        n={view.n}
        goto={view.goto}
        meta={surahMeta.get(view.n)}
        quranMeta={meta}
        withTafsir={withTafsir}
        showTafsir={showTafsir}
        setShowTafsir={setShowTafsir}
        settings={settings}
        update={update}
        onBack={() => setView({ kind: 'index' })}
        onNavigate={(n) => setView({ kind: 'surah', n })}
        total={index.length}
      />
    );
  }

  if (view.kind === 'bookmarks') {
    return (
      <BookmarksView
        settings={settings}
        update={update}
        onBack={() => setView({ kind: 'index' })}
        onOpen={(surah, ayah) => setView({ kind: 'surah', n: surah, goto: ayah })}
      />
    );
  }

  const bookmarkCount = settings.quranBookmarks?.length ?? 0;
  /** السورة «مُنزَّلة» متى نُزِّل صوت آياتها كلّها عند القارئ المختار. */
  const isDownloaded = (s: TafsirSurahInfo) => (dlAyah[s.n] ?? 0) >= (s.count ?? 1);
  const downloadedCount = index.filter(isDownloaded).length;

  const filteredIndex = index.filter((s) => {
    if (onlyDownloaded && !isDownloaded(s)) return false;
    const q = query.trim();
    if (!q || scope === 'text') return true;
    const m = surahMeta.get(s.n);
    return (
      s.name.includes(q) ||
      (m?.ar ?? '').includes(q) ||
      (m?.aliases ?? []).some((a) => a.includes(q)) ||
      String(s.n) === q
    );
  });

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={
          scope === 'surahs'
            ? 'ابحث عن سورة بالاسم أو الرقم…'
            : withTafsir
              ? 'ابحث في نصّ التفسير كلّه…'
              : 'ابحث في نصّ القرآن كلّه…'
        }
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <ChipGroup<'surahs' | 'text'>
              value={scope}
              options={[
                { value: 'surahs', label: 'السور' },
                { value: 'text', label: withTafsir ? 'التفسير' : 'النصّ' },
              ]}
              onChange={setScope}
            />
            {/* المتابعتان منفصلتان: القراءة موضعُ عينِك، والاستماع موضعُ أذنك */}
            {settings.lastReadSurah > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setView({ kind: 'surah', n: settings.lastReadSurah, goto: settings.lastReadAyah })}
                title={`سورة ${surahMeta.get(settings.lastReadSurah)?.ar ?? settings.lastReadSurah} · الآية ${settings.lastReadAyah}`}
              >
                📖 متابعة القراءة
              </Button>
            )}
            {settings.lastListenSurah > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setView({ kind: 'surah', n: settings.lastListenSurah, goto: settings.lastListenAyah })}
                title={`سورة ${surahMeta.get(settings.lastListenSurah)?.ar ?? settings.lastListenSurah} · الآية ${settings.lastListenAyah}`}
              >
                🎧 متابعة الاستماع
              </Button>
            )}
            {/* تمييز ما يعمل دون إنترنت — وقصر الفهرس عليه */}
            <Button
              size="sm"
              variant={onlyDownloaded ? 'primary' : 'ghost'}
              disabled={downloadedCount === 0 && !onlyDownloaded}
              onClick={() => setOnlyDownloaded((v) => !v)}
              title="السور التي نُزِّل صوت آياتها عند القارئ المختار — تُتلى دون إنترنت"
            >
              ⬇ المُنزَّل{downloadedCount > 0 ? ` (${downloadedCount})` : ''}{onlyDownloaded ? ' ✓' : ''}
            </Button>
            <Button size="sm" onClick={() => setView({ kind: 'bookmarks' })}>
              🔖 الإشارات {bookmarkCount > 0 ? `(${bookmarkCount})` : ''}
            </Button>
          </div>
        }
      />

      {searching && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
          … يجري البحث في {withTafsir ? 'تفسير 6236 آية' : '6236 آية'}
        </div>
      )}

      {hits ? (
        hits.length === 0 ? (
          <EmptyState text="لا آية تطابق هذا البحث" />
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
              {hits.length} نتيجة{hits.length >= 200 ? ' (عُرضت أول 200)' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hits.map((h) => (
                <Card
                  key={`${h.surah}:${h.ayah}`}
                  onClick={() => setView({ kind: 'surah', n: h.surah, goto: h.ayah })}
                  style={{ padding: '14px 18px' }}
                >
                  <div style={{ fontSize: 11.5, color: 'var(--gold-500)', marginBottom: 6 }}>
                    سورة {h.surahName} — الآية {h.ayah}
                  </div>
                  {h.ayahText && (
                    <div className="dhikr-text" style={{ fontSize: 19, color: 'var(--fg-primary)', lineHeight: 2.1, marginBottom: 8 }}>
                      {h.ayahText}
                    </div>
                  )}
                  <div
                    className={h.ayahText ? undefined : 'dhikr-text'}
                    style={{
                      fontSize: h.ayahText ? 13.5 : 19,
                      color: h.ayahText ? 'var(--fg-secondary)' : 'var(--fg-primary)',
                      lineHeight: h.ayahText ? 2 : 2.1,
                    }}
                  >
                    {h.text}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {filteredIndex.map((s) => {
            const m = surahMeta.get(s.n);
            return (
              <Card
                key={s.n}
                onClick={() => setView({ kind: 'surah', n: s.n })}
                style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--teal-400)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="dhikr-text" style={{ fontSize: 17, color: 'var(--fg-primary)' }}>
                    {m?.ar ?? s.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                    {s.type || m?.place} · {s.count} آية
                  </div>
                </div>
                {isDownloaded(s) && (
                  <span
                    title="صوت آياتها مُنزَّل — تُتلى دون إنترنت"
                    style={{
                      fontSize: 10,
                      color: 'var(--color-success)',
                      border: '1px solid var(--color-success)',
                      borderRadius: 99,
                      padding: '1px 6px',
                      flexShrink: 0,
                    }}
                  >
                    ⬇
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── قارئ السورة ───────────────────────────

function SurahReader({
  n,
  goto,
  meta,
  quranMeta,
  withTafsir,
  showTafsir,
  setShowTafsir,
  settings,
  update,
  onBack,
  onNavigate,
  total,
}: {
  n: number;
  goto?: number;
  meta?: SurahMeta;
  quranMeta: QuranMeta | null;
  /** وضع التفسير: التفسير مفتوحٌ دائماً ولا تلاوة (القسم للقراءة والفهم). */
  withTafsir: boolean;
  showTafsir: boolean;
  setShowTafsir: (v: boolean) => void;
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  onBack: () => void;
  onNavigate: (n: number) => void;
  total: number;
}) {
  const [surah, setSurah] = useState<TafsirSurah | null>(null);
  const [auto, setAuto] = useState(false);
  const [current, setCurrent] = useState(goto ?? 1);
  const [showReciters, setShowReciters] = useState(false);
  /** بحثٌ بكلماتٍ مفتاحيّة داخل السورة الحالية (نصّاً وتفسيراً). */
  const [inSurahQuery, setInSurahQuery] = useState('');
  const [editingAyah, setEditingAyah] = useState<Reciter | null>(null);
  const [editingSurah, setEditingSurah] = useState<SurahReciter | null>(null);
  const [addingAyah, setAddingAyah] = useState(false);
  /** الآية المقدَّرة أثناء تلاوة السورة كاملةً (لا تُوقّت في المصدر — انظر أدناه). */
  const [wholeAyah, setWholeAyah] = useState(0);
  const player = usePlayer();

  const { ayah: ayahReciters, surah: surahReciters } = useReciters(quranMeta, settings);
  const reciter: Reciter | undefined =
    ayahReciters.find((r) => r.id === settings.lastReciterId) ?? ayahReciters[0];
  const surahReciter: SurahReciter | undefined =
    surahReciters.find((r) => r.id === settings.lastSurahReciterId) ?? surahReciters[0];

  /**
   * الآية التي يتلوها المشغّل الآن — تُظلَّل وتُمرَّر إلى وسط الشاشة.
   * مصدرها التلاوة آية-بآية (`mark` دقيقٌ لأنّ لكلّ آيةٍ ملفّاً)، وإلّا فالتقدير الزمنيّ
   * أثناء السورة الكاملة.
   */
  const reciting = player.track?.mark?.surah === n ? player.track.mark.ayah : wholeAyah;

  useEffect(() => {
    setSurah(null);
    setAuto(false);
    setCurrent(goto ?? 1);
    window.gtSalat.content.tafsirSurah(n).then(setSurah);
  }, [n]);

  // القفز إلى آيةٍ بعينها بعد التحميل (من البحث أو من الإشارات).
  useEffect(() => {
    if (!surah || !goto) return;
    setCurrent(goto);
    document.getElementById(`ayah-${n}-${goto}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [surah, goto, n]);

  const ayahs = surah?.ayahs ?? [];
  const last = ayahs.length;

  /** تطبيعٌ عربيٌّ خفيف — «الرحمن» تطابق «ٱلرَّحْمَٰن». */
  const norm = (t: string) =>
    (t || '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه')
      .trim().toLowerCase();

  const shownAyahs = useMemo(() => {
    const q = norm(inSurahQuery);
    if (q.length < 2) return ayahs;
    return ayahs.filter((a) => norm(a.text).includes(q) || norm(a.tafsir ?? '').includes(q));
  }, [ayahs, inSurahQuery]);

  /**
   * مهلة الآية = زمنٌ يتناسب مع طولها (لا مهلةٌ ثابتة، فالآيات تتفاوت من كلمتين إلى سطور)،
   * مضروبٌ في نسبة المهلة التي يختارها القارئ. مع حدٍّ أدنى كي لا تُخطَف القصيرة.
   */
  const MS_PER_CHAR = 95;
  const MIN_MS = 2600;
  const durationFor = (text: string) =>
    Math.max(MIN_MS, text.length * MS_PER_CHAR) * ((settings.quranScrollSpeed ?? 100) / 100);

  // محرّك التمرير: يمرّر إلى الآية الجارية، ثم يجدول الانتقال إلى التالية.
  useEffect(() => {
    if (!auto || !surah) return;
    document.getElementById(`ayah-${n}-${current}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const text = ayahs.find((a) => a.n === current)?.text ?? '';
    const t = setTimeout(() => {
      if (current >= last) {
        setAuto(false);           // بلغنا آخر السورة — نتوقّف ولا ننتقل تلقائياً لغيرها
        return;
      }
      setCurrent((c) => c + 1);
    }, durationFor(text));
    return () => clearTimeout(t);
  }, [auto, current, surah, n, last, settings.quranScrollSpeed]);

  // موضع المتابعة يُحفَظ مع تقدّم التمرير، فتعود إليه في المرة القادمة.
  useEffect(() => {
    if (auto && surah) update({ lastReadSurah: n, lastReadAyah: current });
  }, [auto, current]);

  /**
   * تلاوةٌ آية-بآية: قائمةٌ من الآيات يتقدّم فيها المشغّل تلقائياً عند انتهاء كلّ مقطع.
   * البسملة مقطعٌ أولٌ بلا علامة (`mark.ayah = 0`) فلا تُظلَّل آيةٌ لم تُتلَ بعد.
   */
  const reciteFrom = async (startAyah: number) => {
    if (!reciter?.everyayah || !surah) return;
    const folder = reciter.everyayah;
    const rid = reciter.id;
    // المُنزَّل أولاً ثم البثّ — فتعمل التلاوة دون إنترنت متى نُزِّلت.
    const pick = async (rel: string, remote: string) =>
      (await window.gtSalat.downloads.localUrl(rel)) ?? remote;
    const tracks: PlayerTrack[] = [];
    if (startAyah === 1 && needsBasmala(n)) {
      tracks.push({
        id: `basmala-${n}`,
        title: `سورة ${meta?.ar ?? surah.name}`,
        subtitle: `${reciter.ar} — البسملة`,
        url: await pick(ayahAudioRel(rid, 1, 1), basmalaUrl(folder)),
        section: 'quran/text',
        icon: '📖',
        mark: { surah: n, ayah: 0 },
      });
    }
    for (const a of surah.ayahs ?? []) {
      if (a.n < startAyah) continue;
      tracks.push({
        id: `${folder}-${n}-${a.n}`,
        title: `سورة ${meta?.ar ?? surah.name}`,
        subtitle: `${reciter.ar} — الآية ${a.n}`,
        url: await pick(ayahAudioRel(rid, n, a.n), ayahAudioUrl(folder, n, a.n)),
        section: 'quran/text',
        icon: '📖',
        mark: { surah: n, ayah: a.n },
      });
    }
    setAuto(false);   // التلاوة تقود التظليل، فلا يزاحمها المؤقّت
    player.playQueue(tracks);
  };

  /** السورة كاملةً في مقطعٍ واحد (mp3quran) — يتتبّع النصّ بالتقدير الزمنيّ (أدناه). */
  const wholeId = surahReciter ? `${surahReciter.id}-${n}` : '';
  const playingWhole = !!wholeId && player.track?.id === wholeId;

  const reciteWhole = async () => {
    if (!surahReciter) return;
    const local = await window.gtSalat.downloads.localUrl(surahAudioRel(surahReciter.id, n));
    setAuto(false);   // التتبّع يقود التظليل، فلا يزاحمه المؤقّت
    player.toggle({
      id: wholeId,
      title: `سورة ${meta?.ar ?? surah?.name ?? ''}`,
      subtitle: surahReciter.ar,
      url: local ?? surahAudioUrl(surahReciter.server, n),
      section: 'quran/text',
      icon: '🎧',
    });
  };

  /**
   * **تتبّع النصّ مع السورة الكاملة.** المصدر ملفٌّ واحدٌ بلا توقيتٍ لكلّ آية (خلاف التلاوة
   * آية-بآية حيث لكلّ آيةٍ ملفّ)، فالموضع يُقدَّر بنسبة زمن التشغيل إلى المدّة، موزّعاً على
   * الآيات **بمقدار طول كلّ آية** لا بالتساوي — فالآيات تتفاوت من كلمتين إلى سطور.
   *
   * **مزلقٌ حقيقيّ:** التلاوة الكاملة تبدأ بما ليس في النصّ — **الاستعاذة** دائماً،
   * و**البسملة** في غير الفاتحة (بسملتها آيةٌ مرقَّمة) والتوبة (لا بسملة فيها). لو وُزّعت
   * المدّة على الآيات وحدها لسبق التظليلُ الصوتَ بمقدارهما طوال السورة: فيُظلَّل
   * «الحمد لله ربّ العالمين» والقارئ ما زال في البسملة.
   *
   * والعلاج ليس ثابتاً بالثواني (يختلف بسرعة القارئ)، بل **إقحامهما في التوزيع نصّاً**:
   * يأخذان حصّتهما بأطوالهما كأيّ آية، فيتقلّصان ويتّسعان مع سرعة التلاوة تلقائياً.
   * وأثناءهما لا يُظلَّل شيء (`0`) — فلا تُظلَّل آيةٌ لم تُتلَ بعد.
   *
   * ويبقى تقديراً لا تحديداً (الوقفات تزيحه قليلاً)، فالتلاوة آية-بآية هي الدقيقة.
   *
   * الاشتراك في `timeupdate` **هنا** لا في المزوّد: لو رفعنا الزمن إلى حالة المزوّد
   * لأُعيد رسم التطبيق كلّه أربع مرّاتٍ في الثانية.
   */
  const track = useMemo(() => {
    // مقدّمةٌ متلوّةٌ غير معدودة، تدخل التوزيع بأطوالها.
    const lead = [ISTIAADHA_TEXT.length];
    if (needsBasmala(n)) lead.push(BASMALA_TEXT.length);
    const lens = [...lead, ...ayahs.map((a) => Math.max(1, a.text.length))];
    const total = lens.reduce((x, y) => x + y, 0) || 1;
    let acc = 0;
    const starts = lens.map((l) => {
      const start = acc / total;
      acc += l;
      return start;
    });
    return { starts, leadCount: lead.length };
  }, [ayahs, n]);

  useEffect(() => {
    if (!playingWhole || ayahs.length === 0) {
      setWholeAyah(0);
      return;
    }
    const el = player.audioRef.current;
    if (!el) return;
    const onTime = () => {
      const d = el.duration;
      if (!d || !isFinite(d)) return;
      const p = el.currentTime / d;
      // آخر مقطعٍ بدايته ≤ الموضع الحالي.
      let i = 0;
      while (i + 1 < track.starts.length && track.starts[i + 1] <= p) i++;
      // ما زلنا في الاستعاذة/البسملة — لا تظليل.
      setWholeAyah(i < track.leadCount ? 0 : ayahs[i - track.leadCount]?.n ?? 0);
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [playingWhole, track, ayahs, player.audioRef]);

  /**
   * موضع الاستماع يُحفَظ أثناء التلاوة وحدها — **مستقلّاً عن موضع القراءة** كما في الهاتف:
   * المرء يقرأ في سورةٍ ويستمع في أخرى، فدمجهما يُضيع أحدهما. وموضع القراءة لا يُحفَظ
   * إلّا بالتحديد أو بالتمرير التلقائي (`markRead`).
   */
  useEffect(() => {
    if (reciting > 0) update({ lastListenSurah: n, lastListenAyah: reciting });
  }, [reciting, n]);

  // تمرير الآية المتلوّة إلى وسط الشاشة كي يتابع القارئ بلا يديه.
  // ويتبعها التحديد أيضاً، فإن أوقفتَ التلاوة بقي الموضع حيث انتهيت.
  useEffect(() => {
    if (reciting > 0) {
      setCurrent(reciting);
      document.getElementById(`ayah-${n}-${reciting}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [reciting, n]);

  const bookmarks = new Set(settings.quranBookmarks ?? []);

  const toggleBookmark = (ayah: number) => {
    const key = `${n}:${ayah}`;
    const next = new Set(bookmarks);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update({ quranBookmarks: Array.from(next) });
  };

  const markRead = (ayah: number) => update({ lastReadSurah: n, lastReadAyah: ayah });

  /** النقر على آيةٍ يُحدِّدها: تُظلَّل، وتصير موضع المتابعة وبدايةَ التلاوة والتمرير. */
  const selectAyah = (ayah: number) => {
    setCurrent(ayah);
    markRead(ayah);
  };

  return (
    // ترويسةٌ ثابتةٌ + متنٌ يُمرَّر وحده: في السور الطويلة يبقى التحكّم في متناول اليد
    // ولا يضطرّ القارئ إلى تمريرٍ طويلٍ للعودة إليه.
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={onBack}>← الفهرس</Button>
        <div className="dhikr-text" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold-500)' }}>
          سورة {meta?.ar ?? surah?.name ?? ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {surah?.type || meta?.place} · {surah?.ayahs?.length ?? 0} آية
        </div>
        <div style={{ flex: 1 }} />
        {!withTafsir && reciter && (
          <Button
            size="sm"
            variant={reciting > 0 ? 'primary' : 'secondary'}
            onClick={() => (reciting > 0 ? player.stop() : reciteFrom(current || 1))}
            title={`تلاوة آيةً آية بصوت ${reciter.ar} مع تظليل الآية الجارية`}
          >
            {reciting > 0 ? '⏹ إيقاف التلاوة' : '🔊 تلاوة آية-بآية'}
          </Button>
        )}
        {!withTafsir && surahReciter && (
          <Button
            size="sm"
            variant={playingWhole ? 'primary' : 'ghost'}
            onClick={reciteWhole}
            title={`السورة كاملةً بصوت ${surahReciter.ar} — يتتبّع النصّ بالتقدير`}
          >
            {playingWhole ? '⏹ إيقاف السورة' : '🎧 السورة كاملة'}
          </Button>
        )}
        {!withTafsir && reciter && (
          <AyahAudioDownload reciter={reciter} surah={n} ayahCount={last} surahName={meta?.ar ?? surah?.name ?? ''} />
        )}
        {/* اسم القارئ على الزرّ نفسه — زرٌّ بترسٍ وحده لا يُفهَم منه أنّ خلفه اختيار القرّاء */}
        {!withTafsir && (ayahReciters.length > 0 || surahReciters.length > 0) && (
          <Button
            size="sm"
            variant={showReciters ? 'primary' : 'ghost'}
            onClick={() => setShowReciters((v) => !v)}
            title="اختيار قارئ التلاوة آية-بآية وقارئ السورة الكاملة"
          >
            ⚙ القارئ{reciter ? `: ${reciter.ar}` : ''}
          </Button>
        )}
        <Button
          size="sm"
          variant={auto ? 'primary' : 'secondary'}
          onClick={() => setAuto((v) => !v)}
          title="ينتقل بين الآيات تلقائياً بمهلةٍ تناسب طول كل آية (بلا صوت)"
        >
          {auto ? '⏸ إيقاف التمرير' : '▶ تمرير تلقائي'}
        </Button>
        {/* في قسم التفسير يبقى مفتوحاً دائماً — هو موضوع القسم لا خياراً فيه */}
        {!withTafsir && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>التفسير</span>
            <Toggle on={showTafsir} onChange={setShowTafsir} />
          </div>
        )}
        {/* السابقة/التالية زوجٌ واحدٌ لا يُفرَّق: كانا يلتفّان إلى سطرين فيبتعد أحدهما عن الآخر */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Button size="sm" disabled={n <= 1} onClick={() => onNavigate(n - 1)}>⏮ السابقة</Button>
          <Button size="sm" disabled={n >= total} onClick={() => onNavigate(n + 1)}>التالية ⏭</Button>
        </div>
      </div>

      {/* اختيار القرّاء — يُحفَظ في الإعدادات فيُتذكَّر في المرّات القادمة */}
      {showReciters && (
        <Card style={{ marginBottom: 16, padding: '14px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, color: 'var(--fg-secondary)' }}>
                  قارئ التلاوة آية-بآية (مع التظليل)
                </div>
                <div style={{ flex: 1 }} />
                {reciter && (
                  <Button size="sm" onClick={() => setEditingAyah(reciter)} title="تعديل مجلّد المصدر عند تعطّله">
                    ✎ تعديل المصدر
                  </Button>
                )}
                <Button size="sm" onClick={() => setAddingAyah(true)}>➕ إضافة قارئ</Button>
              </div>
              <ChipGroup<string>
                value={reciter?.id ?? ''}
                options={ayahReciters.map((r) => ({ value: r.id, label: r.style ? `${r.ar} · ${r.style}` : r.ar }))}
                onChange={(v) => update({ lastReciterId: v })}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, color: 'var(--fg-secondary)' }}>قارئ السورة الكاملة</div>
                <div style={{ flex: 1 }} />
                {surahReciter && (
                  <Button size="sm" onClick={() => setEditingSurah(surahReciter)} title="تعديل رابط الخادم عند تعطّله">
                    ✎ تعديل المصدر
                  </Button>
                )}
              </div>
              <ChipGroup<string>
                value={surahReciter?.id ?? ''}
                options={surahReciters.map((r) => ({ value: r.id, label: r.ar }))}
                onChange={(v) => update({ lastSurahReciterId: v })}
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.8 }}>
              التلاوة تُبَثّ من الإنترنت (everyayah و mp3quran)، وتستمرّ عند التنقّل بين الأقسام
              فيعيدك شريط المشغّل إلى هنا بنقرة. وإن تعطّل مصدرٌ فعدّله من «تعديل المصدر» —
              تعديلك يبقى ولا يُمسّ المحتوى الأصلي.
            </div>
          </div>
        </Card>
      )}

      {/* بحثٌ بكلماتٍ مفتاحيّة داخل هذه السورة وحدها */}
      <SearchInput
        value={inSurahQuery}
        onChange={setInSurahQuery}
        placeholder={`ابحث بكلمةٍ داخل سورة ${meta?.ar ?? surah?.name ?? ''}…`}
        extra={
          inSurahQuery.trim().length >= 2 ? (
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
              {shownAyahs.length} آية
            </div>
          ) : undefined
        }
      />

      {/* ضوابط التمرير — تظهر عند تفعيله فقط كي لا تزدحم الترويسة */}
      {auto && (
        <Card style={{ marginBottom: 16, padding: '12px 18px', borderColor: 'var(--teal-500)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--fg-primary)', fontWeight: 600 }}>
              الآية {current} من {last}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" disabled={current <= 1} onClick={() => setCurrent((c) => Math.max(1, c - 1))}>
                ⏮ السابقة
              </Button>
              <Button size="sm" disabled={current >= last} onClick={() => setCurrent((c) => Math.min(last, c + 1))}>
                التالية ⏭
              </Button>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>مهلة القراءة</span>
            <ChipGroup<number>
              value={settings.quranScrollSpeed ?? 100}
              options={[
                { value: 70, label: 'أسرع' },
                { value: 100, label: 'معتاد' },
                { value: 150, label: 'أمهل' },
                { value: 220, label: 'تدبُّر' },
              ]}
              onChange={(v) => update({ quranScrollSpeed: v })}
            />
          </div>
        </Card>
      )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', minHeight: 0 }}>
      {!surah ? (
        <EmptyState icon="📖" text="… يجري فتح السورة" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
          {shownAyahs.map((a) => {
            const marked = bookmarks.has(`${n}:${a.n}`);
            const reciting_ = reciting === a.n;
            const scrolling = auto && a.n === current;
            // المحدَّدة بالنقر — تُظلَّل ولا تُشغَّل، وهي مبدأ التلاوة إن ضُغط زرّ التشغيل.
            const selected = a.n === current;
            const lit = reciting_ || scrolling || selected;
            return (
              <Card
                key={a.n}
                id={`ayah-${n}-${a.n}`}
                onClick={() => selectAyah(a.n)}
                style={{
                  padding: '16px 20px',
                  borderColor: reciting_ || scrolling
                    ? 'var(--teal-500)'
                    : selected
                      ? 'var(--teal-600)'
                      : marked
                        ? 'var(--gold-500)'
                        : undefined,
                  background: lit
                    ? 'var(--accent-tint)'
                    : marked
                      ? 'rgba(245,197,24,0.05)'
                      : undefined,
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); selectAyah(a.n); }}
                    title="تحديد الآية — تصير موضع المتابعة وبدايةَ التلاوة والتمرير"
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--teal-400)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {a.n}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dhikr-text" style={{ fontSize: 22, color: 'var(--fg-primary)', lineHeight: 2.3 }}>
                      {a.text}
                    </div>
                    {(withTafsir || showTafsir) && a.tafsir && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid var(--bg-elevated)',
                          fontSize: 13.5,
                          color: 'var(--fg-secondary)',
                          lineHeight: 2.1,
                        }}
                      >
                        {a.tafsir}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {/* التشغيل بزرٍّ مستقلّ — النقر على البطاقة يُحدِّد ولا يُشغّل */}
                    {!withTafsir && reciter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reciting_ ? player.stop() : reciteFrom(a.n);
                        }}
                        title={reciting_ ? 'إيقاف التلاوة' : 'تلاوة من هذه الآية'}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          border: `1px solid ${reciting_ ? 'var(--teal-500)' : 'var(--border-subtle)'}`,
                          background: reciting_ ? 'var(--accent-tint-2)' : 'transparent',
                          color: 'var(--teal-400)',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {reciting_ ? '⏹' : '▶'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(a.n); }}
                      title={marked ? 'إزالة الإشارة' : 'إشارة مرجعية'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        cursor: 'pointer',
                        opacity: marked ? 1 : 0.3,
                      }}
                    >
                      🔖
                    </button>
                    <CopyButton
                      text={(withTafsir || showTafsir) && a.tafsir ? `${a.text}\n\n${a.tafsir}` : a.text}
                      source={`سورة ${meta?.ar ?? surah?.name ?? ''} — الآية ${a.n}`}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {/* تعديل مصادر التلاوة — تُحفَظ في الإعدادات ولا تمسّ `quran_meta.json` */}
      {editingAyah && (
        <ReciterDialog
          title={`تعديل مصدر: ${editingAyah.ar}`}
          kind="ayah"
          initial={toDraft(editingAyah, 'ayah')}
          onCancel={() => setEditingAyah(null)}
          onSave={(v: ReciterDraft) => {
            const next: Reciter = {
              id: editingAyah.id,
              ar: v.ar,
              riwaya: v.riwaya,
              style: v.style,
              everyayah: v.source,
            };
            if (isCustomReciter(editingAyah.id)) {
              update({
                customReciters: (settings.customReciters ?? []).map((c) => (c.id === next.id ? next : c)),
              });
            } else {
              update({ reciterEdits: { ...(settings.reciterEdits ?? {}), [next.id]: next } });
            }
            setEditingAyah(null);
          }}
          onReset={
            (settings.reciterEdits ?? {})[editingAyah.id]
              ? () => {
                  const { [editingAyah.id]: _drop, ...rest } = settings.reciterEdits ?? {};
                  update({ reciterEdits: rest });
                  setEditingAyah(null);
                }
              : undefined
          }
          onDelete={
            isCustomReciter(editingAyah.id)
              ? () => {
                  update({
                    customReciters: (settings.customReciters ?? []).filter((c) => c.id !== editingAyah.id),
                  });
                  setEditingAyah(null);
                }
              : undefined
          }
        />
      )}

      {addingAyah && (
        <ReciterDialog
          title="إضافة قارئ للتلاوة آية-بآية"
          kind="ayah"
          initial={{ ar: '', riwaya: 'hafs', source: '', style: '' }}
          onCancel={() => setAddingAyah(false)}
          onSave={(v: ReciterDraft) => {
            const id = newReciterId();
            update({
              customReciters: [
                ...(settings.customReciters ?? []),
                { id, ar: v.ar, riwaya: v.riwaya, style: v.style, everyayah: v.source },
              ],
              lastReciterId: id,
            });
            setAddingAyah(false);
          }}
        />
      )}

      {editingSurah && (
        <ReciterDialog
          title={`تعديل مصدر: ${editingSurah.ar}`}
          kind="surah"
          initial={toDraft(editingSurah, 'surah')}
          onCancel={() => setEditingSurah(null)}
          onSave={(v: ReciterDraft) => {
            const next: SurahReciter = {
              id: editingSurah.id,
              ar: v.ar,
              riwaya: v.riwaya,
              server: v.source,
            };
            if (isCustomReciter(next.id)) {
              update({
                customSurahReciters: (settings.customSurahReciters ?? []).map((c) => (c.id === next.id ? next : c)),
              });
            } else {
              update({ surahReciterEdits: { ...(settings.surahReciterEdits ?? {}), [next.id]: next } });
            }
            setEditingSurah(null);
          }}
          onReset={
            (settings.surahReciterEdits ?? {})[editingSurah.id]
              ? () => {
                  const { [editingSurah.id]: _drop, ...rest } = settings.surahReciterEdits ?? {};
                  update({ surahReciterEdits: rest });
                  setEditingSurah(null);
                }
              : undefined
          }
          onDelete={
            isCustomReciter(editingSurah.id)
              ? () => {
                  update({
                    customSurahReciters: (settings.customSurahReciters ?? []).filter((c) => c.id !== editingSurah.id),
                  });
                  setEditingSurah(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ───────────────────── تنزيل صوت آيات السورة الجارية ─────────────────────

/** مهلة التراجع قبل الحذف الفعلي — نفس مبدأ بقيّة التنزيلات. */
const AYAH_UNDO_MS = 7000;

/**
 * صوت الآيات يُنزَّل **سورةً سورة** لا 6236 ملفّاً دفعةً واحدة (كما في نسخة الهاتف):
 * القارئ يقرأ سورةً بعينها، فالدفعة التي تنفعه دفعتُها. وموضع الزرّ هنا لا في «القرآن
 * المسموع» لأنّ هذا الصوت لا يُستعمل إلّا مقروناً بالتظليل في هذا القارئ.
 */
function AyahAudioDownload({
  reciter,
  surah,
  ayahCount,
  surahName,
}: {
  reciter: Reciter;
  surah: number;
  ayahCount: number;
  surahName: string;
}) {
  const [stat, setStat] = useState<{ files: number } | null>(null);
  const [task, setTask] = useState<DownloadTask | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const refresh = () =>
    window.gtSalat.downloads.stat('ayah-audio', reciter.id, ayahCount, surah).then(setStat);

  useEffect(() => {
    refresh();
    window.gtSalat.downloads.current().then(setTask);
    const unsub = window.gtSalat.downloads.onProgress(setTask);
    return () => { unsub(); };
  }, [reciter.id, surah, ayahCount]);

  const mine = task?.kind === 'ayah-audio' && task.key === reciter.id && task.surah === surah;
  const running = !!mine && task!.running;
  useEffect(() => { if (mine && !task!.running) refresh(); }, [task?.running, task?.done]);

  useEffect(() => {
    if (!pendingDelete) return;
    const t = setTimeout(async () => {
      await window.gtSalat.downloads.remove('ayah-audio', reciter.id, surah);
      setPendingDelete(false);
      refresh();
    }, AYAH_UNDO_MS);
    return () => clearTimeout(t);
  }, [pendingDelete, reciter.id, surah]);

  const files = pendingDelete ? 0 : stat?.files ?? 0;
  const complete = ayahCount > 0 && files >= ayahCount;
  const percent = running ? Math.round((task!.done / Math.max(1, task!.total)) * 100) : 0;

  const start = () => {
    // عدّ آيات السورة وحدها يكفي المحرّك لبناء الدفعة (`surah` يقصرها عليها).
    const counts = Array.from({ length: surah }, (_, i) => (i === surah - 1 ? ayahCount : 0));
    window.gtSalat.downloads.start('ayah-audio', reciter.id, {
      folder: reciter.everyayah,
      surahAyahCounts: counts,
      surah,
    });
  };

  if (running) {
    return (
      <Button size="sm" variant="danger" onClick={() => window.gtSalat.downloads.cancel()}>
        {percent}٪ — إلغاء
      </Button>
    );
  }
  if (pendingDelete) {
    return <Button size="sm" variant="secondary" onClick={() => setPendingDelete(false)}>↺ تراجع</Button>;
  }
  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>حذف صوت سورة {surahName}؟</span>
        <Button size="sm" variant="danger" onClick={() => { setConfirming(false); setPendingDelete(true); }}>نعم</Button>
        <Button size="sm" onClick={() => setConfirming(false)}>إلغاء</Button>
      </span>
    );
  }
  if (complete) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setConfirming(true)}
        title={`صوت آيات سورة ${surahName} مُنزَّل — يعمل دون إنترنت`}
      >
        ✓ مُنزَّل · حذف
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      disabled={!!task?.running}
      onClick={start}
      title={`تنزيل صوت آيات سورة ${surahName} بصوت ${reciter.ar} للعمل دون إنترنت`}
    >
      ⬇ تنزيل صوت السورة
    </Button>
  );
}

// ─────────────────────────── الإشارات المرجعية ───────────────────────────

function BookmarksView({
  settings,
  update,
  onBack,
  onOpen,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  onBack: () => void;
  onOpen: (surah: number, ayah: number) => void;
}) {
  const [items, setItems] = useState<AyahHit[]>([]);
  const keys = settings.quranBookmarks ?? [];

  useEffect(() => {
    const parsed = keys
      .map((k) => k.split(':').map(Number))
      .filter(([s, a]) => s > 0 && a > 0)
      .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    Promise.all(parsed.map(([s, a]) => window.gtSalat.content.ayah(s, a))).then((res) =>
      setItems(res.filter((x): x is AyahHit => !!x)),
    );
  }, [keys.join(',')]);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Button size="sm" onClick={onBack}>← الفهرس</Button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-500)' }}>🔖 الإشارات المرجعية</div>
        <div style={{ flex: 1 }} />
        {items.length > 0 && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (confirm('سيتم حذف جميع الإشارات المرجعية. هل أنت متأكد؟')) update({ quranBookmarks: [] });
            }}
          >
            حذف الكل
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon="🔖" text="لا إشارات بعد — انقر أيقونة الإشارة بجانب أي آية لحفظها" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
          {items.map((h) => (
            <Card key={`${h.surah}:${h.ayah}`} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  onClick={() => onOpen(h.surah, h.ayah)}
                  style={{ fontSize: 11.5, color: 'var(--gold-500)', cursor: 'pointer' }}
                >
                  سورة {h.surahName} — الآية {h.ayah} ←
                </span>
                <button
                  onClick={() => update({ quranBookmarks: keys.filter((k) => k !== `${h.surah}:${h.ayah}`) })}
                  title="إزالة الإشارة"
                  style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
              <div className="dhikr-text" style={{ fontSize: 20, color: 'var(--fg-primary)', lineHeight: 2.2 }}>
                {h.text}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
