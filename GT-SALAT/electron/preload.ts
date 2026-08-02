import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  BackupContents,
  BackupResult,
  UpdateInfo,
  AsmaName,
  AyahHit,
  CreditSource,
  DailyAyah,
  DuaCategory,
  HadithCollection,
  HikamCategory,
  Hikmah,
  HisnCategory,
  HisnCategoryInfo,
  HistoryEvent,
  QuranMeta,
  Radio,
  SessionDhikr,
  TafsirSurah,
  TafsirSurahInfo,
} from './types.js';

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:set', patch),
    reset: (): Promise<AppSettings> => ipcRenderer.invoke('settings:reset'),
    path: (): Promise<string> => ipcRenderer.invoke('settings:path'),
    importLegacy: (): Promise<boolean> => ipcRenderer.invoke('settings:import-legacy'),
    onChange: (cb: (s: AppSettings) => void) => {
      const listener = (_e: unknown, s: AppSettings) => cb(s);
      ipcRenderer.on('settings:changed', listener);
      return () => ipcRenderer.removeListener('settings:changed', listener);
    },
  },
  prayer: {
    today: () => ipcRenderer.invoke('prayer:today'),
    month: (y: number, m: number) => ipcRenderer.invoke('prayer:month', y, m),
    next: () => ipcRenderer.invoke('prayer:next'),
    autoDetect: () => ipcRenderer.invoke('prayer:auto-detect'),
    prefetch: () => ipcRenderer.invoke('prayer:prefetch'),
    methods: () => ipcRenderer.invoke('prayer:methods'),
    cachedMonths: (): Promise<number> => ipcRenderer.invoke('prayer:cached-months'),
    pruneCache: (): Promise<number> => ipcRenderer.invoke('prayer:prune-cache'),
  },
  dhikr: {
    random: () => ipcRenderer.invoke('dhikr:random'),
    all: () => ipcRenderer.invoke('dhikr:all'),
    byIndex: (i: number) => ipcRenderer.invoke('dhikr:by-index', i),
    count: () => ipcRenderer.invoke('dhikr:count'),
  },
  content: {
    asma: (): Promise<AsmaName[]> => ipcRenderer.invoke('content:asma'),
    hadith: (): Promise<HadithCollection[]> => ipcRenderer.invoke('content:hadith'),
    duas: (): Promise<DuaCategory[]> => ipcRenderer.invoke('content:duas'),
    hikam: (): Promise<HikamCategory[]> => ipcRenderer.invoke('content:hikam'),
    hikmah: (seed: number): Promise<Hikmah | null> => ipcRenderer.invoke('content:hikmah', seed),
    hisnIndex: (): Promise<HisnCategoryInfo[]> => ipcRenderer.invoke('content:hisn-index'),
    hisnCategory: (id: number): Promise<HisnCategory | null> => ipcRenderer.invoke('content:hisn-category', id),
    hisnSearch: (q: string): Promise<HisnCategory[]> => ipcRenderer.invoke('content:hisn-search', q),
    tafsirIndex: (): Promise<TafsirSurahInfo[]> => ipcRenderer.invoke('content:tafsir-index'),
    tafsirSurah: (n: number): Promise<TafsirSurah | null> => ipcRenderer.invoke('content:tafsir-surah', n),
    quranMeta: (): Promise<QuranMeta> => ipcRenderer.invoke('content:quran-meta'),
    quranSearch: (q: string): Promise<AyahHit[]> => ipcRenderer.invoke('content:quran-search', q),
    ayah: (surah: number, ayah: number): Promise<AyahHit | null> => ipcRenderer.invoke('content:ayah', surah, ayah),
    dailyAyah: (seed: number): Promise<DailyAyah | null> => ipcRenderer.invoke('content:daily-ayah', seed),
    events: (): Promise<HistoryEvent[]> => ipcRenderer.invoke('content:events'),
    eventsToday: (hMonth: number, hDay: number): Promise<HistoryEvent[]> =>
      ipcRenderer.invoke('content:events-today', hMonth, hDay),
    radios: (): Promise<Radio[]> => ipcRenderer.invoke('content:radios'),
    sessionAdhkar: (type: 'morning' | 'evening'): Promise<SessionDhikr[]> =>
      ipcRenderer.invoke('content:session-adhkar', type),
    credits: (): Promise<{
      sources: CreditSource[];
      developer: string;
      github: string;
      repo: string;
      phoneRepo: string;
      projects: string;
    }> => ipcRenderer.invoke('content:credits'),
  },
  audio: {
    play: (kind: 'full' | 'short' | 'approaching' | 'dua_after_adhan' | 'post_prayer_dhikr') => ipcRenderer.invoke('audio:play', kind),
    playFile: (filePath: string) => ipcRenderer.invoke('audio:play-file', filePath),
    stop: () => ipcRenderer.invoke('audio:stop'),
    playing: (): Promise<boolean> => ipcRenderer.invoke('audio:playing'),
    playingKind: (): Promise<string | null> => ipcRenderer.invoke('audio:playing-kind'),
    preview: (
      kind: 'full' | 'short' | 'approaching' | 'dua_after_adhan' | 'post_prayer_dhikr' | 'custom',
      customPath?: string,
    ): Promise<string | null> => ipcRenderer.invoke('audio:preview', kind, customPath),
    players: (): Promise<string[]> => ipcRenderer.invoke('audio:players'),
  },
  notify: {
    test: () => ipcRenderer.invoke('notify:test'),
    testAdhan: () => ipcRenderer.invoke('notify:test-adhan'),
    testAdhanShort: () => ipcRenderer.invoke('notify:test-adhan-short'),
    testApproaching: () => ipcRenderer.invoke('notify:test-approaching'),
    log: () => ipcRenderer.invoke('notify:log'),
    clearLog: () => ipcRenderer.invoke('notify:clear-log'),
  },
  shell: {
    apply: (opts: { enabledShells: string[]; showZikr: boolean; showSalat: boolean }) =>
      ipcRenderer.invoke('shell:apply', opts),
    remove: () => ipcRenderer.invoke('shell:remove'),
    detect: () => ipcRenderer.invoke('shell:detect'),
    check: () => ipcRenderer.invoke('shell:check'),
  },
  autostart: {
    get: () => ipcRenderer.invoke('autostart:get'),
    set: (v: boolean) => ipcRenderer.invoke('autostart:set', v),
  },
  scheduler: {
    start: () => ipcRenderer.invoke('scheduler:start'),
    stop: () => ipcRenderer.invoke('scheduler:stop'),
  },
  tray: {
    refresh: () => ipcRenderer.invoke('tray:refresh'),
  },
  dialog: {
    openAudio: () => ipcRenderer.invoke('dialog:open-audio'),
  },
  backup: {
    sizes: (): Promise<{ prayersCount: number }> => ipcRenderer.invoke('backup:sizes'),
    export: (opts: { settings: boolean; prayers: boolean }): Promise<BackupResult | null> =>
      ipcRenderer.invoke('backup:export', opts),
    pick: (): Promise<{ path: string; contents: BackupContents } | null> => ipcRenderer.invoke('backup:pick'),
    import: (filePath: string, opts: { settings: boolean; prayers: boolean }): Promise<BackupResult> =>
      ipcRenderer.invoke('backup:import', filePath, opts),
  },
  nav: {
    onGo: (cb: (route: string) => void) => {
      const listener = (_e: unknown, route: string) => cb(route);
      ipcRenderer.on('nav:go', listener);
      return () => ipcRenderer.removeListener('nav:go', listener);
    },
  },
  update: {
    check: (): Promise<UpdateInfo> => ipcRenderer.invoke('update:check'),
    last: (): Promise<UpdateInfo | null> => ipcRenderer.invoke('update:last'),
    openPage: () => ipcRenderer.invoke('update:open-page'),
    onAvailable: (cb: (info: UpdateInfo) => void) => {
      const listener = (_e: unknown, info: UpdateInfo) => cb(info);
      ipcRenderer.on('update:available', listener);
      return () => ipcRenderer.removeListener('update:available', listener);
    },
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    quit: () => ipcRenderer.invoke('app:quit'),
    openUrl: (url: string) => ipcRenderer.invoke('app:open-url', url),
    openPath: (p: string) => ipcRenderer.invoke('app:open-path', p),
    userDataDir: () => ipcRenderer.invoke('app:user-data-dir'),
    copy: (text: string): Promise<boolean> => ipcRenderer.invoke('app:copy', text),
  },
};

contextBridge.exposeInMainWorld('gtSalat', api);

export type GtSalatApi = typeof api;
