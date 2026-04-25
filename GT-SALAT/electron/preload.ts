import { contextBridge, ipcRenderer } from 'electron';

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: any) => ipcRenderer.invoke('settings:set', patch),
    reset: () => ipcRenderer.invoke('settings:reset'),
    path: () => ipcRenderer.invoke('settings:path'),
    importLegacy: () => ipcRenderer.invoke('settings:import-legacy'),
    onChange: (cb: (s: any) => void) => {
      const listener = (_e: any, s: any) => cb(s);
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
    cachedMonths: () => ipcRenderer.invoke('prayer:cached-months'),
  },
  dhikr: {
    random: () => ipcRenderer.invoke('dhikr:random'),
    all: () => ipcRenderer.invoke('dhikr:all'),
    byIndex: (i: number) => ipcRenderer.invoke('dhikr:by-index', i),
    count: () => ipcRenderer.invoke('dhikr:count'),
  },
  audio: {
    play: (kind: 'full' | 'short' | 'approaching' | 'dua_after_adhan' | 'post_prayer_dhikr') => ipcRenderer.invoke('audio:play', kind),
    playFile: (filePath: string) => ipcRenderer.invoke('audio:play-file', filePath),
    stop: () => ipcRenderer.invoke('audio:stop'),
    playing: () => ipcRenderer.invoke('audio:playing'),
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
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    quit: () => ipcRenderer.invoke('app:quit'),
    openUrl: (url: string) => ipcRenderer.invoke('app:open-url', url),
    openPath: (p: string) => ipcRenderer.invoke('app:open-path', p),
    userDataDir: () => ipcRenderer.invoke('app:user-data-dir'),
  },
};

contextBridge.exposeInMainWorld('gtSalat', api);

export type GtSalatApi = typeof api;
