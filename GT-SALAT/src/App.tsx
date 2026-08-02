import { useCallback, useEffect, useState } from 'react';
import { Sidebar, type PageId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { UpdateBanner } from './components/UpdateBanner';
import { PhonePromoBanner } from './components/PhonePromoBanner';
import { DashboardPage } from './pages/Dashboard';
import { TimetablePage } from './pages/Timetable';
import { DhikrPage } from './pages/Dhikr';
import { MorePage, MORE_FEATURES } from './pages/More';
import { SettingsPage } from './pages/Settings';
import { AdvancedSettingsPage } from './pages/AdvancedSettings';
import { StatusPage } from './pages/Status';
import { WelcomePage } from './pages/Welcome';
import { HisnPage } from './pages/more/Hisn';
import { AdhkarSessionPage } from './pages/more/AdhkarSession';
import { TasbihPage } from './pages/more/Tasbih';
import { AsmaPage, DuasPage, EventsPage, HadithPage, HikamPage } from './pages/more/TextContent';
import { QuranPage } from './pages/more/Quran';
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
  dhikr: 'الأذكار',
  more: 'المزيد',
  settings: 'الإعدادات الأساسية',
  advanced: 'الإعدادات الإضافية',
  status: 'حالة النظام',
};

/** الأقسام الفرعية: تُفتَح من داخل صفحةٍ رئيسية وتُغلَق بزرّ الرجوع في الشريط العلوي. */
const SUB_LABELS: Record<string, string> = Object.fromEntries(
  MORE_FEATURES.map((f) => [f.id, f.label]),
);

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

  /** يفتح وجهةً بصيغة «page» أو «page/sub» — من الإشعارات أو من شريط المشغّل. */
  const goTo = useCallback((route: string) => {
    const [p, s2] = route.split('/');
    setPage(p as PageId);
    setSub(s2 ?? null);
  }, []);

  // النقر على إشعارٍ يحمل وجهة (أذكار المساء مثلاً) يفتح قسمه مباشرةً.
  useEffect(() => {
    const unsub = window.gtSalat.nav.onGo(goTo);
    return () => { unsub(); };
  }, [goTo]);

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

  const notifyActive = settings.enableSalatNotify || settings.enableZikrNotify;
  // المثبَّتة تُعرَض بترتيب الشبكة لا بترتيب الإضافة، فيثبت موضعها في الشريط.
  const favoriteSections = MORE_FEATURES.filter((f) => (settings.favoriteSections ?? []).includes(f.id));
  const label = sub ? SUB_LABELS[sub] ?? PAGE_LABELS[page] : PAGE_LABELS[page];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'row' }}>
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
      />
      {/* المحتوى الرئيسي — يسار */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <UpdateBanner settings={settings} update={updateSettings} />
        <PhonePromoBanner settings={settings} update={updateSettings} />
        <TopBar
          pageLabel={label}
          time={time}
          city={settings.city}
          hijriFromApi={today?.hijri}
          settings={settings}
          next={next}
          onBack={sub ? () => setSub(null) : undefined}
          onOpenDashboard={() => nav('dashboard')}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {page === 'dashboard' && (
            <DashboardPage settings={settings} today={today} next={next} onOpenMore={(id) => { setPage('more'); setSub(id); }} />
          )}
          {page === 'timetable' && <TimetablePage settings={settings} />}
          {page === 'dhikr' && <DhikrPage />}

          {page === 'more' && !sub && <MorePage onOpen={setSub} settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'hisn' && <HisnPage />}
          {page === 'more' && sub === 'adhkar-morning' && <AdhkarSessionPage type="morning" />}
          {page === 'more' && sub === 'adhkar-evening' && <AdhkarSessionPage type="evening" />}
          {page === 'more' && sub === 'tasbih' && <TasbihPage settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'duas' && <DuasPage />}
          {page === 'more' && sub === 'hikam' && <HikamPage />}
          {page === 'more' && sub === 'hadith' && <HadithPage />}
          {page === 'more' && sub === 'asma' && <AsmaPage />}
          {page === 'more' && sub === 'events' && <EventsPage />}
          {page === 'more' && sub === 'radios' && <RadiosPage settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'imsakiah' && <ImsakiahPage settings={settings} />}
          {page === 'more' && sub === 'quran' && <QuranPage settings={settings} update={updateSettings} />}
          {page === 'more' && sub === 'tafsir' && <QuranPage settings={settings} update={updateSettings} withTafsir />}

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
