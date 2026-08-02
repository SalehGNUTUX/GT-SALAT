import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ChipGroup, EmptyState, SearchInput, Toggle } from '../../components/common';
import type { AyahHit, QuranMeta, SurahMeta, TafsirSurah, TafsirSurahInfo } from '@electron/types';
import type { AppSettings } from '../../hooks/useSettings';

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

export function QuranPage({ settings, update, withTafsir = false }: Props) {
  const [meta, setMeta] = useState<QuranMeta | null>(null);
  const [index, setIndex] = useState<TafsirSurahInfo[]>([]);
  const [view, setView] = useState<View>({ kind: 'index' });
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AyahHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showTafsir, setShowTafsir] = useState(withTafsir);

  useEffect(() => {
    window.gtSalat.content.quranMeta().then(setMeta);
    window.gtSalat.content.tafsirIndex().then(setIndex);
  }, []);

  // البحث الشامل عبر 6236 آية يجري في العملية الرئيسية.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      setHits(await window.gtSalat.content.quranSearch(q));
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const surahMeta = useMemo(() => {
    const map = new Map<number, SurahMeta>();
    for (const s of meta?.surahs ?? []) map.set(s.n, s);
    return map;
  }, [meta]);

  if (view.kind === 'surah') {
    return (
      <SurahReader
        n={view.n}
        goto={view.goto}
        meta={surahMeta.get(view.n)}
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
  const filteredIndex = index.filter((s) => {
    const q = query.trim();
    if (!q || hits) return true;
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
        placeholder="ابحث في نصّ القرآن كلّه، أو عن اسم سورة…"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
            {settings.lastReadSurah > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setView({ kind: 'surah', n: settings.lastReadSurah, goto: settings.lastReadAyah })}
              >
                ↩ متابعة القراءة
              </Button>
            )}
            <Button size="sm" onClick={() => setView({ kind: 'bookmarks' })}>
              🔖 الإشارات {bookmarkCount > 0 ? `(${bookmarkCount})` : ''}
            </Button>
          </div>
        }
      />

      {searching && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>… يجري البحث في 6236 آية</div>}

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
                  <div className="dhikr-text" style={{ fontSize: 19, color: 'var(--fg-primary)', lineHeight: 2.1 }}>
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
                <div style={{ minWidth: 0 }}>
                  <div className="dhikr-text" style={{ fontSize: 17, color: 'var(--fg-primary)' }}>
                    {m?.ar ?? s.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                    {s.type || m?.place} · {s.count} آية
                  </div>
                </div>
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

  const bookmarks = new Set(settings.quranBookmarks ?? []);

  const toggleBookmark = (ayah: number) => {
    const key = `${n}:${ayah}`;
    const next = new Set(bookmarks);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update({ quranBookmarks: Array.from(next) });
  };

  const markRead = (ayah: number) => update({ lastReadSurah: n, lastReadAyah: ayah });

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
        <Button
          size="sm"
          variant={auto ? 'primary' : 'secondary'}
          onClick={() => setAuto((v) => !v)}
          title="ينتقل بين الآيات تلقائياً بمهلةٍ تناسب طول كل آية"
        >
          {auto ? '⏸ إيقاف التمرير' : '▶ تمرير تلقائي'}
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>التفسير</span>
          <Toggle on={showTafsir} onChange={setShowTafsir} />
        </div>
        <Button size="sm" disabled={n <= 1} onClick={() => onNavigate(n - 1)}>السابقة</Button>
        <Button size="sm" disabled={n >= total} onClick={() => onNavigate(n + 1)}>التالية</Button>
      </div>

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
          {surah.ayahs?.map((a) => {
            const marked = bookmarks.has(`${n}:${a.n}`);
            const reading = auto && a.n === current;
            const isCurrent = !auto && settings.lastReadSurah === n && settings.lastReadAyah === a.n;
            return (
              <Card
                key={a.n}
                id={`ayah-${n}-${a.n}`}
                style={{
                  padding: '16px 20px',
                  borderColor: reading ? 'var(--teal-500)' : marked ? 'var(--gold-500)' : isCurrent ? 'var(--teal-500)' : undefined,
                  background: reading ? 'var(--accent-tint)' : marked ? 'rgba(245,197,24,0.05)' : undefined,
                  transition: 'background 0.3s, border-color 0.3s',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    onClick={() => { markRead(a.n); setCurrent(a.n); }}
                    title="اجعلها موضع المتابعة (وبدايةَ التمرير التلقائي)"
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
                    {showTafsir && a.tafsir && (
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
                  <button
                    onClick={() => toggleBookmark(a.n)}
                    title={marked ? 'إزالة الإشارة' : 'إشارة مرجعية'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      cursor: 'pointer',
                      opacity: marked ? 1 : 0.3,
                      flexShrink: 0,
                    }}
                  >
                    🔖
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
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
