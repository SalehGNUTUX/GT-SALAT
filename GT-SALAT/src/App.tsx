import { useCallback, useEffect, useState } from 'react';
import { Sidebar, type PageId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { UpdateBanner } from './components/UpdateBanner';
import { PhonePromoBanner } from './components/PhonePromoBanner';
import { DashboardPage } from './pages/Dashboard';
import { TimetablePage } from './pages/Timetable';
import { DhikrPage } from './pages/Dhikr';
import { MorePage, MORE_FEATURES } from './pages/More';
import { LearnPage } from './pages/more/Learn';
import { RuqyahPage } from './pages/more/Ruqyah';
import { AdhkarAudioPage } from './pages/more/AdhkarAudio';
import { WhatsNewDialog, WHATS_NEW } from './components/WhatsNewDialog';
import { SettingsPage } from './pages/Settings';
import { AdvancedSettingsPage } from './pages/AdvancedSettings';
import { StatusPage } from './pages/Status';
import { WelcomePage } from './pages/Welcome';
import { HisnPage } from './pages/more/Hisn';
import { AdhkarSessionPage } from './pages/more/AdhkarSession';
import { TasbihPage } from './pages/more/Tasbih';
import { AsmaPage, DuasPage, EventsPage, HadithPage, HikamPage } from './pages/more/TextContent';
import { QuranPage } from './pages/more/Quran';
import { QuranHub, QURAN_TABS, quranTabOf } from './pages/more/QuranHub';
import { RadiosPage } from './pages/more/Radios';
import { ImsakiahPage } from './pages/more/Imsakiah';
import { useClock } from './hooks/useClock';
import { useSettings } from './hooks/useSettings';
import { useNextPrayer, useTodayTimetable } from './hooks/usePrayer';
import { applyAccent } from './utils/accent';
import { PlayerProvider } from './hooks/usePlayer';
import { MiniPlayer } from './components/MiniPlayer';

const PAGE_LABELS: Record<PageId, string> = {
  dashboard: 'لوحة التحكم',
  timetable: 'مواقيت الصلاة',
  quran: 'القرآن الكريم',
  dhikr: 'الأذكار',
  more: 'المزيد',
  settings: 'الإعدادات الأساسية',
  advanced: 'الإعدادات الإضافية',
  status: 'حالة النظام',
};

/** الأقسام الفرعية: تُفتَح من داخل صفحةٍ رئيسية وتُغلَق بزرّ الرجوع في الشريط العلوي. */
const SUB_LABELS: Record<string, string> = {
  ...Object.fromEntries(MORE_FEATURES.map((f) => [f.id, f.label])),
  // تبويبات القرآن ليست بطاقاتٍ في «المزيد» — القسم صار أساسياً في الشريط الجانبي.
  ...Object.fromEntries(QURAN_TABS.map((t) => [t.id, t.label])),
};

export function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}

function AppShell() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [sub, setSub] = useState<string | null>(null);
  const [version, setVersion] = useState('');
  const [settings, updateSettings] = useSettings();
  const time = useClock();
  const today = useTodayTimetable();
  // تُجلَب هنا مرّةً وتُمرَّر إلى الشريط العلوي ولوحة التحكم معاً (لا استدعاءان كل ثانية).
  const next = useNextPrayer(1000);

  useEffect(() => {
    window.gtSalat.app.version().then(setVersion);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings?.theme ?? 'dark');
  }, [settings?.theme]);

  useEffect(() => {
    applyAccent(settings?.accentColor ?? '');
  }, [settings?.accentColor]);

  const nav = (p: PageId) => {
    setPage(p);
    setSub(null);
  };

  /** فتح قسمٍ من لوحة التحكم — «القرآن» صار قسماً أساسياً لا بطاقةً في «المزيد». */
  const openSection = (id: string) => {
    if (id === 'quran') nav('quran');
    else { setPage('more'); setSub(id); }
  };

  /**
   * يفتح وجهةً بصيغة «page» أو «page/sub» — من الإشعارات أو من شريط المشغّل.
   *
   * `navTick` يُصعَّد في كلّ نداء ويُمرَّر مفتاحاً (`key`) لقسم القرآن، فيُعاد تركيبه
   * **حتى لو كنتَ فيه أصلاً**: عندئذٍ يفتح سورة المقطع الجاري أو قارئه لا رأس القسم.
   * بدونه لا يقع تغييرٌ في الحالة فلا يستجيب النقر على الشريط وأنت داخل القسم نفسه.
   */
  const [navTick, setNavTick] = useState(0);
  const goTo = useCallback((route: string) => {
    const [p, s2] = route.split('/');
    setPage(p as PageId);
    setSub(s2 ?? null);
    setNavTick((t) => t + 1);
  }, []);

  // النقر على إشعارٍ يحمل وجهة (أذكار المساء مثلاً) يفتح قسمه مباشرةً.
  useEffect(() => {
    const unsub = window.gtSalat.nav.onGo(goTo);
    return () => { unsub(); };
  }, [goTo]);

  // قسمٌ كان بطاقةً في «المزيد» ثمّ صار أساسيّاً في الشريط (القرآن في 2.1) يبقى مخزَّناً في
  // المثبَّتة، فيشغل خانةً من الثلاث لا تُعرَض — فيظنّ المستخدم أنّ حقّه خانتان. يُنظَّف مرّةً.
  useEffect(() => {
    const favs = settings?.favoriteSections;
    if (!favs) return;
    const known = favs.filter((id) => MORE_FEATURES.some((f) => f.id === id));
    if (known.length !== favs.length) void updateSettings({ favoriteSections: known });
  }, [settings?.favoriteSections, updateSettings]);

  if (!settings) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
        }}
      >
        جاري التحميل…
      </div>
    );
  }

  if (!settings.setupCompleted) {
    return <WelcomePage onDone={() => updateSettings({ setupCompleted: true })} />;
  }

  // «ما الجديد» تُعرَض مرّةً بعد كلّ تحديثٍ فعليّ، ويُخزَّن القرار في الإعدادات لا في
  // localStorage — فينتقل مع النسخ الاحتياطي ولا يُفقَد بمسح بيانات المتصفّح.
  const showWhatsNew = settings.lastWhatsNewVersion !== WHATS_NEW.version;

  const notifyActive = settings.enableSalatNotify || settings.enableZikrNotify;
  // المثبَّتة تُعرَض بترتيب الشبكة لا بترتيب الإضافة، فيثبت موضعها في الشريط.
  const favoriteSections = MORE_FEATURES.filter((f) => (settings.favoriteSections ?? []).includes(f.id));
  const label = sub ? SUB_LABELS[sub] ?? PAGE_LABELS[page] : PAGE_LABELS[page];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'row' }}>
      {showWhatsNew && (
        <WhatsNewDialog onClose={() => updateSettings({ lastWhatsNewVersion: WHATS_NEW.version })} />
      )}

      {/* الشريط الجانبي — يمين (أول DOM في RTL = يمين) */}
      <Sidebar
        page={page}
        sub={sub}
        onSelect={nav}
        version={version}
        doNotDisturb={settings.doNotDisturb}
        notifyActive={notifyActive}
        favorites={favoriteSections}
        onOpenFavorite={(id) => { setPage('more'); setSub(id); }}
        theme={settings.theme}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      />
      {/* المحتوى الرئيسي — يسار */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <UpdateBanner settings={settings} update={updateSettings} />
        <PhonePromoBanner settings={settings} update={updateSettings} />
        {/* زرّ الرجوع للأقسام الفرعية في «المزيد» فقط — تبويبات القرآن يُتنقَّل بينها بشريطها */}
        <TopBar
          pageLabel={label}
          time={time}
          city={settings.city}
          hijriFromApi={today?.hijri}
          settings={settings}
          next={next}
          onBack={page === 'more' && sub ? () => setSub(null) : undefined}
          onOpenDashboard={() => nav('dashboard')}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {page === 'dashboard' && (
            <DashboardPage settings={settings} today={today} next={next} onOpenMore={openSection} />
          )}
          {page === 'timetable' && <TimetablePage settings={settings} />}
          {page === 'dhikr' && <DhikrPage />}

          {page === 'more' && !sub && <MorePage onOpen={setSub} settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'hisn' && <HisnPage />}
          {page === 'more' && sub === 'adhkar-sleep' && <HisnPage initialCategory={2} />}
          {page === 'more' && sub === 'adhkar-morning' && <AdhkarSessionPage type="morning" />}
          {page === 'more' && sub === 'adhkar-evening' && <AdhkarSessionPage type="evening" />}
          {page === 'more' && sub === 'learn' && <LearnPage />}
          {page === 'more' && sub === 'ruqyah' && <RuqyahPage />}
          {page === 'more' && sub === 'adhkar-audio' && <AdhkarAudioPage />}
          {page === 'more' && sub === 'tasbih' && <TasbihPage settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'duas' && <DuasPage />}
          {page === 'more' && sub === 'hikam' && <HikamPage />}
          {page === 'more' && sub === 'hadith' && <HadithPage />}
          {page === 'more' && sub === 'asma' && <AsmaPage />}
          {page === 'more' && sub === 'events' && <EventsPage />}
          {page === 'more' && sub === 'radios' && <RadiosPage settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'imsakiah' && <ImsakiahPage settings={settings} />}
          {page === 'more' && sub === 'tafsir' && <QuranPage settings={settings} update={updateSettings} withTafsir />}

          {/* القرآن الكريم: قسمٌ أساسيّ بثلاثة تبويباتٍ على المسار، فيصحّ التنقّل إليها
              من الإشعارات ومن شريط المشغّل («quran/audio» مثلاً) */}
          {page === 'quran' && (
            <QuranHub
              key={navTick}
              tab={quranTabOf(sub)}
              onTab={setSub}
              settings={settings}
              update={updateSettings}
            />
          )}

          {page === 'settings' && (
            <SettingsPage settings={settings} update={updateSettings} onOpenAdvanced={() => nav('advanced')} />
          )}
          {page === 'advanced' && (
            <AdvancedSettingsPage settings={settings} update={updateSettings} version={version} />
          )}

          {page === 'status' && <StatusPage settings={settings} />}
        </div>
        {/* شريط المشغّل — يبقى ظاهراً في كل الأقسام ما دام هناك بثّ */}
        <MiniPlayer onOpen={goTo} />
      </div>
    </div>
  );
}
