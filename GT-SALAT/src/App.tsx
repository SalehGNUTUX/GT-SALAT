import { useEffect, useState } from 'react';
import { Sidebar, type PageId } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardPage } from './pages/Dashboard';
import { TimetablePage } from './pages/Timetable';
import { DhikrPage } from './pages/Dhikr';
import { SettingsPage } from './pages/Settings';
import { StatusPage } from './pages/Status';
import { WelcomePage } from './pages/Welcome';
import { useClock } from './hooks/useClock';
import { useSettings } from './hooks/useSettings';
import { useTodayTimetable, type DayTimetable } from './hooks/usePrayer';

const PAGE_LABELS: Record<PageId, string> = {
  dashboard: 'لوحة التحكم',
  timetable: 'مواقيت الصلاة',
  dhikr: 'الأذكار',
  settings: 'الإعدادات',
  status: 'حالة النظام',
};

export function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [version, setVersion] = useState('');
  const [settings, updateSettings] = useSettings();
  const time = useClock();
  const today = useTodayTimetable();

  useEffect(() => {
    window.gtSalat.app.version().then(setVersion);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings?.theme ?? 'dark');
  }, [settings?.theme]);

  const nav = (p: PageId) => {
    setPage(p);
  };

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'row' }}>
      {/* الشريط الجانبي — يمين (أول DOM في RTL = يمين) */}
      <Sidebar
        page={page}
        onSelect={nav}
        version={version}
        doNotDisturb={settings.doNotDisturb}
        notifyActive={notifyActive}
      />
      {/* المحتوى الرئيسي — يسار */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar pageLabel={PAGE_LABELS[page]} time={time} city={settings.city} hijriFromApi={today?.hijri} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {page === 'dashboard' && <DashboardPage city={settings.city} today={today} />}
          {page === 'timetable' && <TimetablePage />}
          {page === 'dhikr' && <DhikrPage />}
          {page === 'settings' && <SettingsPage settings={settings} update={updateSettings} />}
          {page === 'status' && <StatusPage settings={settings} />}
        </div>
      </div>
    </div>
  );
}
