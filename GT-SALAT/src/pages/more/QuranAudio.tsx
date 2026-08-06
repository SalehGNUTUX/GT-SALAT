import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ChipGroup, EmptyState, SearchInput } from '../../components/common';
import type { DownloadTask, QuranMeta, SurahMeta, SurahReciter, TafsirSurahInfo } from '@electron/types';

import { surahAudioRel, surahAudioUrl } from '@electron/quran';
import { usePlayer, type PlayerTrack } from '../../hooks/usePlayer';
import type { AppSettings } from '../../hooks/useSettings';
import { isCustomReciter, newReciterId, riwayaLabel, useReciters } from '../../hooks/useReciters';
import { ReciterDialog, toDraft, type ReciterDraft } from '../../components/ReciterDialog';

export const QURAN_AUDIO_SECTION = 'quran/audio';

/**
 * القرآن المسموع — **للاستماع وحده** (تلاواتٌ كاملة، سورةٌ في ملفّ). مستويان كما في الهاتف:
 *
 * 1. **قائمة القرّاء**: بحثٌ باسم القارئ وتصفيةٌ بالرواية. النقر على البطاقة يفتح سوره.
 * 2. **سور القارئ**: 114 سورةً ببحثٍ خاصٍّ فيها، والنقر على السورة **يشغّلها فوراً**.
 *
 * **قاعدة:** التنزيل اختياريٌّ لا شرط — كلّ قارئٍ يعمل بالبثّ، والتنزيل يُغني عن الإنترنت
 * لاحقاً. والمُنزَّل يُقدَّم على البثّ (`localUrls` تحلّ 114 مساراً في جولةِ IPC واحدة).
 *
 * صوت الآيات مفرّقةً (everyayah) **ليس هنا** — موضعه قارئ «القرآن النصّيّ» لأنّه لا يُستعمل
 * إلّا مقروناً بتظليل الآية الجارية، وهناك يُنزَّل سورةً سورة كما في الهاتف.
 *
 * ومصادر التلاوة **قابلةٌ للتعديل**: خادمٌ يتعطّل يُصلحه المستخدم بنفسه، ويضيف قرّاءً جدداً —
 * تعديلاته طبقةٌ في الإعدادات لا تمسّ `quran_meta.json` (انظر `useReciters`).
 */
export function QuranAudioPage({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}) {
  const [meta, setMeta] = useState<QuranMeta | null>(null);
  const [index, setIndex] = useState<TafsirSurahInfo[]>([]);
  const [task, setTask] = useState<DownloadTask | null>(null);
  const [query, setQuery] = useState('');
  const [riwaya, setRiwaya] = useState<'all' | 'hafs' | 'warsh'>('all');
  const player = usePlayer();
  /**
   * إن فُتح القسم والتلاوة جارية (من شريط المشغّل) فافتح **قارئها** لا قائمة القرّاء.
   * معرّف المقطع `{معرّف القارئ}-{رقم السورة}`، فيُقتطَع الرقم منه.
   */
  const [openId, setOpenId] = useState<string | null>(() =>
    player.track?.section === QURAN_AUDIO_SECTION ? player.track.id.replace(/-\d+$/, '') : null,
  );
  const [editing, setEditing] = useState<SurahReciter | null>(null);
  const [adding, setAdding] = useState(false);
  /** عرض ما نُزِّل عند القرّاء جميعاً بدل قائمة القرّاء. */
  const [onlyDownloaded, setOnlyDownloaded] = useState(false);
  const [downloaded, setDownloaded] = useState<Record<string, number[]>>({});

  useEffect(() => {
    window.gtSalat.content.quranMeta().then(setMeta);
    window.gtSalat.content.tafsirIndex().then(setIndex);
    window.gtSalat.downloads.current().then(setTask);
    const unsub = window.gtSalat.downloads.onProgress(setTask);
    return () => { unsub(); };
  }, []);

  // تُحدَّث بعد كلّ تنزيلٍ ينتهي، فتظهر السور الجديدة بلا إعادة فتح القسم.
  const busy = !!task?.running;
  useEffect(() => {
    window.gtSalat.downloads.downloadedAll().then(setDownloaded);
  }, [busy]);

  const surahMeta = useMemo(() => {
    const m = new Map<number, SurahMeta>();
    for (const s of meta?.surahs ?? []) m.set(s.n, s);
    return m;
  }, [meta]);

  const { surah: reciters, surahOriginal } = useReciters(meta, settings);
  const opened = reciters.find((r) => r.id === openId) ?? null;

  const edits = settings.surahReciterEdits ?? {};
  const customs = settings.customSurahReciters ?? [];

  /**
   * «متابعة الاستماع» موضعٌ واحدٌ يشترك فيه القسمان — من استمع هنا وجد موضعه في
   * «القرآن النصّيّ». والسورة الكاملة بلا آيةٍ محدَّدة فتُحفَظ من أوّلها.
   */
  const markListen = (n: number) => update({ lastListenSurah: n, lastListenAyah: 1 });

  const saveEdit = (r: SurahReciter, v: ReciterDraft) => {
    const next: SurahReciter = { id: r.id, ar: v.ar, riwaya: v.riwaya, server: v.source };
    if (isCustomReciter(r.id)) update({ customSurahReciters: customs.map((c) => (c.id === r.id ? next : c)) });
    else update({ surahReciterEdits: { ...edits, [r.id]: next } });
    setEditing(null);
  };
  const resetEdit = (r: SurahReciter) => {
    const { [r.id]: _drop, ...rest } = edits;
    update({ surahReciterEdits: rest });
    setEditing(null);
  };
  const removeCustom = (r: SurahReciter) => {
    update({ customSurahReciters: customs.filter((c) => c.id !== r.id) });
    setEditing(null);
  };

  if (opened) {
    return (
      <ReciterSurahs
        reciter={opened}
        index={index}
        surahMeta={surahMeta}
        task={task}
        onBack={() => setOpenId(null)}
        onListen={markListen}
      />
    );
  }

  const downloadedTotal = Object.values(downloaded).reduce((a, b) => a + b.length, 0);

  if (onlyDownloaded) {
    return (
      <DownloadedSurahs
        downloaded={downloaded}
        reciters={reciters}
        surahMeta={surahMeta}
        onBack={() => setOnlyDownloaded(false)}
        onOpenReciter={(id) => { setOnlyDownloaded(false); setOpenId(id); }}
        onListen={markListen}
      />
    );
  }

  const q = query.trim();
  const shown = reciters.filter(
    (r) => (!q || r.ar.includes(q)) && (riwaya === 'all' || (r.riwaya ?? 'hafs') === riwaya),
  );

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث عن قارئ بالاسم…"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{shown.length} قارئاً</span>
            {/* في قائمة القرّاء دور الزرّ: جمع كلّ ما نُزِّل عند القرّاء جميعاً في عرضٍ واحد */}
            <Button
              size="sm"
              variant={downloadedTotal > 0 ? 'secondary' : 'ghost'}
              disabled={downloadedTotal === 0}
              onClick={() => setOnlyDownloaded(true)}
              title="اعرض كلّ السور المُنزَّلة عند القرّاء جميعاً — تعمل دون إنترنت"
            >
              ⬇ المُنزَّل{downloadedTotal > 0 ? ` (${downloadedTotal})` : ''}
            </Button>
            <Button size="sm" onClick={() => setAdding(true)} title="أضف قارئاً بخادمه الخاصّ">
              ➕ إضافة قارئ
            </Button>
          </div>
        }
      />
      <div style={{ marginBottom: 18 }}>
        <ChipGroup
          value={riwaya}
          onChange={setRiwaya}
          options={[
            { value: 'all', label: 'الكلّ' },
            { value: 'hafs', label: 'رواية حفص' },
            { value: 'warsh', label: 'رواية ورش' },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="🎧" text="لا قارئ بهذا الاسم" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {shown.map((r: SurahReciter) => (
            <ReciterCard
              key={r.id}
              reciter={r}
              task={task}
              onOpen={() => setOpenId(r.id)}
              onEdit={() => setEditing(r)}
              edited={!!edits[r.id] || isCustomReciter(r.id)}
              downloadedCount={(downloaded[r.id] ?? []).length}
            />
          ))}
        </div>
      )}

      {editing && (
        <ReciterDialog
          title={`تعديل مصدر: ${editing.ar}`}
          kind="surah"
          initial={toDraft(editing, 'surah')}
          onCancel={() => setEditing(null)}
          onSave={(v) => saveEdit(editing, v)}
          onReset={edits[editing.id] ? () => resetEdit(editing) : undefined}
          onDelete={isCustomReciter(editing.id) ? () => removeCustom(editing) : undefined}
        />
      )}

      {adding && (
        <ReciterDialog
          title="إضافة قارئ للسور الكاملة"
          kind="surah"
          initial={{ ar: '', riwaya: 'hafs', source: '' }}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            update({
              customSurahReciters: [...customs, { id: newReciterId(), ar: v.ar, riwaya: v.riwaya, server: v.source }],
            });
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * ما نُزِّل عند القرّاء **جميعاً** في عرضٍ واحد، مجموعاً بالقارئ — كـ`DownloadedSurahsScreen`
 * في الهاتف. هذا ما يجده المستخدم حين يكون بلا إنترنت: كلّ ما يعمل عنده في مكانٍ واحد.
 */
function DownloadedSurahs({
  downloaded,
  reciters,
  surahMeta,
  onBack,
  onOpenReciter,
  onListen,
}: {
  downloaded: Record<string, number[]>;
  reciters: SurahReciter[];
  surahMeta: Map<number, SurahMeta>;
  onBack: () => void;
  onOpenReciter: (id: string) => void;
  onListen: (surah: number) => void;
}) {
  const player = usePlayer();
  const groups = Object.entries(downloaded).filter(([, nums]) => nums.length > 0);
  const total = groups.reduce((a, [, nums]) => a + nums.length, 0);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={onBack}>← كلّ القرّاء</Button>
        <div className="dhikr-text" style={{ fontSize: 21, fontWeight: 700, color: 'var(--gold-500)' }}>
          السور المُنزَّلة
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{total} سورةً · تعمل دون إنترنت</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 18, lineHeight: 1.9 }}>
        هذه وحدها لا تحتاج اتصالاً. ولتنزيل غيرها افتح القارئ من «كلّ القرّاء».
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="⬇" text="لا سورَ منزَّلةٌ بعد — نزّل سورةً من صفحة أيّ قارئ" />
      ) : (
        groups.map(([rid, nums]) => {
          const r = reciters.find((x) => x.id === rid);
          const queue: PlayerTrack[] = nums.map((n) => ({
            id: `${rid}-${n}`,
            title: `سورة ${surahMeta.get(n)?.ar ?? n}`,
            subtitle: r?.ar ?? rid,
            // كلّها مُنزَّلة، فالمسار المحلّي هو الأصل ولا حاجة إلى البثّ.
            url: `gtsalat://local/${surahAudioRel(rid, n)}`,
            section: QURAN_AUDIO_SECTION,
            icon: '🎧',
          }));
          return (
            <div key={rid} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div className="dhikr-text" style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal-400)' }}>
                  {r?.ar ?? rid}
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
                  رواية {riwayaLabel(r?.riwaya)} · {nums.length} سورة
                </span>
                <div style={{ flex: 1 }} />
                {r && <Button size="sm" onClick={() => onOpenReciter(rid)}>كلّ سوره ←</Button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                {nums.map((n, i) => {
                  const isCurrent = player.track?.id === queue[i].id;
                  const paused = isCurrent && player.status === 'paused';
                  return (
                    <Card
                      key={n}
                      onClick={() => {
                        if (isCurrent) return player.togglePause();
                        onListen(n);
                        player.playQueue(queue, i);
                      }}
                      style={{
                        padding: '11px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderColor: isCurrent ? 'var(--teal-500)' : undefined,
                        background: isCurrent ? 'var(--accent-tint)' : undefined,
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--teal-400)' }}>{isCurrent && !paused ? '⏸' : '▶'}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{n}</span>
                      <span className="dhikr-text" style={{ fontSize: 15, color: 'var(--fg-primary)' }}>
                        {surahMeta.get(n)?.ar ?? n}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * سور قارئٍ بعينه — النقر يشغّل، والمُنزَّل يُقدَّم على البثّ.
 * المشغّل يتلقّى القائمة كلّها فيتنقّل بالسابق/التالي بين السور تلقائياً.
 */
function ReciterSurahs({
  reciter,
  index,
  surahMeta,
  task,
  onBack,
  onListen,
}: {
  reciter: SurahReciter;
  index: TafsirSurahInfo[];
  surahMeta: Map<number, SurahMeta>;
  task: DownloadTask | null;
  onBack: () => void;
  onListen: (surah: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState<(string | null)[]>([]);
  /** إخفاء غير المُنزَّل — يجعل القائمة ما يعمل دون إنترنت وحده. */
  const [onlyDownloaded, setOnlyDownloaded] = useState(false);
  const player = usePlayer();

  // تُحَلّ مرّةً عند فتح القارئ، وتُعاد بعد انتهاء تنزيلٍ يخصّه.
  const downloading = task?.kind === 'surah-audio' && task.key === reciter.id && task.running;
  useEffect(() => {
    if (downloading) return;
    const rels = Array.from({ length: 114 }, (_, i) => surahAudioRel(reciter.id, i + 1));
    window.gtSalat.downloads.localUrls(rels).then(setLocal);
  }, [reciter.id, downloading]);

  const shown = useMemo(() => {
    const q = query.trim();
    return index.filter((s) => {
      if (onlyDownloaded && !local[s.n - 1]) return false;
      if (!q) return true;
      const m = surahMeta.get(s.n);
      return s.name.includes(q) || (m?.ar ?? '').includes(q) || String(s.n) === q;
    });
  }, [index, query, surahMeta, onlyDownloaded, local]);

  const queue: PlayerTrack[] = useMemo(
    () =>
      shown.map((s) => ({
        id: `${reciter.id}-${s.n}`,
        title: `سورة ${surahMeta.get(s.n)?.ar ?? s.name}`,
        subtitle: reciter.ar,
        url: local[s.n - 1] ?? surahAudioUrl(reciter.server, s.n),
        section: QURAN_AUDIO_SECTION,
        icon: '🎧',
      })),
    [shown, reciter, surahMeta, local],
  );

  const downloaded = local.filter(Boolean).length;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={onBack}>← كلّ القرّاء</Button>
        <div className="dhikr-text" style={{ fontSize: 21, fontWeight: 700, color: 'var(--gold-500)' }}>
          {reciter.ar}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          رواية {riwayaLabel(reciter.riwaya)}
          {downloaded > 0 && ` · ${downloaded} سورةً مُنزَّلة`}
        </div>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث بالاسم أو رقم السورة…"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{shown.length} سورة</span>
            {/* داخل القارئ دور الزرّ: إخفاء غير المُنزَّل */}
            <Button
              size="sm"
              variant={onlyDownloaded ? 'primary' : 'ghost'}
              disabled={downloaded === 0 && !onlyDownloaded}
              onClick={() => setOnlyDownloaded((v) => !v)}
              title="اقصر القائمة على السور المُنزَّلة — تعمل دون إنترنت"
            >
              {onlyDownloaded ? '⬇ المُنزَّل فقط ✓' : `⬇ المُنزَّل فقط${downloaded > 0 ? ` (${downloaded})` : ''}`}
            </Button>
          </div>
        }
      />

      {shown.length === 0 ? (
        <EmptyState icon="🎧" text={onlyDownloaded ? 'لا سورة مُنزَّلةً بهذا الاسم' : 'لا سورة بهذا الاسم'} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {shown.map((s, i) => {
            const t = queue[i];
            const isCurrent = player.track?.id === t?.id;
            const paused = isCurrent && player.status === 'paused';
            const offline = !!local[s.n - 1];
            return (
              <Card
                key={s.n}
                // النقر على الجارية إيقافٌ مؤقّتٌ لا إنهاء — الإنهاء في شريط المشغّل.
                onClick={() => {
                  if (isCurrent) return player.togglePause();
                  onListen(s.n);
                  player.playQueue(queue, i);
                }}
                style={{
                  padding: '11px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderColor: isCurrent ? 'var(--teal-500)' : undefined,
                  background: isCurrent ? 'var(--accent-tint)' : undefined,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--teal-400)' }}>{isCurrent && !paused ? '⏸' : '▶'}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.n}</span>
                <span className="dhikr-text" style={{ fontSize: 15, color: 'var(--fg-primary)', flex: 1, minWidth: 0 }}>
                  {surahMeta.get(s.n)?.ar ?? s.name}
                </span>
                {offline && (
                  <span
                    title="مُنزَّلة — تعمل دون إنترنت"
                    style={{
                      fontSize: 10,
                      color: 'var(--color-success)',
                      border: '1px solid var(--color-success)',
                      borderRadius: 99,
                      padding: '1px 6px',
                      flexShrink: 0,
                    }}
                  >
                    ⬇ مُنزَّلة
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

/** مهلة التراجع قبل الحذف الفعلي — تكفي لاستدراك نقرةٍ خاطئة ولا تُبقي الحالة معلّقةً طويلاً. */
const UNDO_MS = 7000;

/** بطاقة قارئ: النقر عليها يفتح سوره للاستماع، والتنزيل زرٌّ ثانويٌّ لا يحجب الاستماع. */
function ReciterCard({
  reciter,
  task,
  onOpen,
  onEdit,
  edited,
  downloadedCount,
}: {
  reciter: SurahReciter;
  task: DownloadTask | null;
  onOpen: () => void;
  onEdit: () => void;
  /** معدَّلٌ أو مضاف — تُعلَّم بطاقته كي يعرف المستخدم ما خرج عن الافتراضي. */
  edited: boolean;
  /** عدد سوره المُنزَّلة — يُعلَم بها في القائمة العامّة قبل فتحه. */
  downloadedCount: number;
}) {
  const [stat, setStat] = useState<{ files: number; bytes: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const expected = 114;

  const refresh = () => window.gtSalat.downloads.stat('surah-audio', reciter.id, expected).then(setStat);
  useEffect(() => { refresh(); }, [reciter.id]);

  const mine = task && task.kind === 'surah-audio' && task.key === reciter.id;
  const running = !!mine && task!.running;
  useEffect(() => { if (mine && !task!.running) refresh(); }, [task?.running, task?.done]);

  // الحذف المؤجَّل: نُخفي الملفّات من العرض فوراً، ولا نحذفها إلا بعد انقضاء المهلة.
  useEffect(() => {
    if (!pendingDelete) return;
    const t = setTimeout(async () => {
      await window.gtSalat.downloads.remove('surah-audio', reciter.id);
      setPendingDelete(false);
      refresh();
    }, UNDO_MS);
    return () => clearTimeout(t);
  }, [pendingDelete, reciter.id]);

  const files = pendingDelete ? 0 : stat?.files ?? 0;
  const complete = files >= expected;
  const partial = files > 0 && !complete;
  const percent = running ? Math.round((task!.done / Math.max(1, task!.total)) * 100) : 0;

  // النقر على البطاقة كلّها يفتح السور — وأزرار التنزيل توقف التصاعد كي لا تفتحها معها.
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <Card onClick={onOpen} style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>🎧</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="dhikr-text" style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-primary)' }}>
              {reciter.ar}
            </div>
            {downloadedCount > 0 && (
              <span
                title={`${downloadedCount} سورةً مُنزَّلة — تعمل دون إنترنت`}
                style={{
                  fontSize: 10,
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 99,
                  padding: '1px 6px',
                }}
              >
                ⬇ {downloadedCount}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 3 }}>
            رواية {riwayaLabel(reciter.riwaya)} · 114 سورة{edited ? ' · ✎ معدَّل' : ''}
          </div>
          <div style={{ fontSize: 11.5, color: complete ? 'var(--color-success)' : 'var(--fg-muted)', marginTop: 6 }}>
            {pendingDelete
              ? 'سيُحذف بعد قليل…'
              : complete
                ? `✓ مُنزَّل كاملاً · ${formatBytes(stat?.bytes ?? 0)}`
                : partial
                  ? `مُنزَّل جزئياً: ${files} من ${expected} · ${formatBytes(stat?.bytes ?? 0)}`
                  : 'اضغط للاستماع — والتنزيل اختياريٌّ للعمل دون إنترنت'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <Button size="sm" onClick={stop(onEdit)} title="تعديل الاسم والرواية ورابط الخادم">✎ تعديل</Button>
          {pendingDelete ? (
            <Button size="sm" variant="secondary" onClick={stop(() => setPendingDelete(false))}>↺ تراجع</Button>
          ) : running ? (
            <Button size="sm" variant="danger" onClick={stop(() => { window.gtSalat.downloads.cancel(); })}>إلغاء</Button>
          ) : complete ? (
            <Button size="sm" variant="danger" onClick={stop(() => setConfirming(true))}>🗑️ حذف</Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!!task?.running}
              onClick={stop(() => { window.gtSalat.downloads.start('surah-audio', reciter.id, { server: reciter.server }); })}
            >
              ⬇ تنزيل
            </Button>
          )}
          {partial && !running && !pendingDelete && (
            <Button size="sm" variant="danger" onClick={stop(() => setConfirming(true))}>🗑️</Button>
          )}
        </div>
      </div>

      {running && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--teal-500)', transition: 'width 0.3s' }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
            {task!.done} / {task!.total} ({percent}٪)
          </div>
        </div>
      )}

      {mine && !task!.running && task!.error && (
        <div style={{ fontSize: 11.5, color: 'var(--color-warning)', marginTop: 8 }}>{task!.error}</div>
      )}

      {confirming && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)' }}
        >
          <div style={{ fontSize: 12.5, color: 'var(--fg-primary)', marginBottom: 8 }}>
            حذف ما نُزِّل بصوت {reciter.ar}؟ ستبقى مهلةٌ للتراجع بعد التأكيد.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="danger" onClick={stop(() => { setConfirming(false); setPendingDelete(true); })}>
              نعم، احذف
            </Button>
            <Button size="sm" onClick={stop(() => setConfirming(false))}>إلغاء</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function formatBytes(b: number): string {
  if (b <= 0) return '0';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} ك.ب`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1048576).toFixed(1)} م.ب`;
  return `${(b / 1073741824).toFixed(2)} غ.ب`;
}
