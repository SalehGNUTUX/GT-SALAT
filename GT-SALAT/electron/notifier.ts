import { Notification, app, nativeImage } from 'electron';
import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import * as audio from './audio.js';
import { closeAdhanWindow } from './adhan-window.js';
import path from 'node:path';
import type { NotificationLogEntry } from './types.js';

const LOG_LIMIT = 100;
const log: NotificationLogEntry[] = [];

function iconPath(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'icons', 'prayer-icon-128.png');
  return path.join(app.getAppPath(), 'resources', 'icons', 'prayer-icon-128.png');
}

export interface NotifyOptions {
  type: NotificationLogEntry['type'];
  title: string;
  body: string;
  urgent?: boolean;
  onClick?: () => void;
  /**
   * وجهةٌ داخل التطبيق يفتحها النقر على الإشعار: «page» أو «page/sub»
   * (مثل `more/adhkar-evening`). يُظهر النافذة وينتقل إليها مباشرةً.
   */
  route?: string;
  /**
   * زرّ «⏹ إيقاف الأذان» في الإشعار نفسه (لينكس، عبر `notify-send`): يوقف الصوت ويُغلق نافذة الأذان،
   * ويُغلَق الإشعار تلقائيّاً حين ينتهي الصوت. واجهة إشعارات Electron لا تدعم الأزرار إلّا على macOS.
   */
  stopAction?: boolean;
}

/** يضبطه `main.ts`: يُظهر النافذة ويُرسل الوجهة إلى الواجهة. */
let navHandler: ((route: string) => void) | null = null;

export function setNavHandler(fn: (route: string) => void): void {
  navHandler = fn;
}

export function notify(opts: NotifyOptions): boolean {
  try {
    const entry: NotificationLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type: opts.type,
      title: opts.title,
      body: opts.body,
    };
    log.unshift(entry);
    if (log.length > LOG_LIMIT) log.length = LOG_LIMIT;

    if (opts.stopAction && notifyWithStop(opts)) return true;

    if (!Notification.isSupported()) return false;
    const n = new Notification({
      title: opts.title,
      body: opts.body,
      icon: nativeImage.createFromPath(iconPath()),
      urgency: opts.urgent ? 'critical' : 'normal',
      silent: true, // الصوت يُشغّل عبر audio.ts
    });
    if (opts.onClick) n.on('click', opts.onClick);
    else if (opts.route) n.on('click', () => navHandler?.(opts.route!));
    n.show();
    return true;
  } catch {
    return false;
  }
}

export function getLog(): NotificationLogEntry[] {
  return [...log];
}

export function clearLog(): void {
  log.length = 0;
}

// ── إشعارٌ بزرّ إيقاف الأذان (notify-send) ───────────────────────────────────────

let notifySendOk: boolean | null = null;
function hasNotifySend(): boolean {
  if (notifySendOk === null) {
    try { execFileSync('which', ['notify-send'], { stdio: 'ignore' }); notifySendOk = true; } catch { notifySendOk = false; }
  }
  return notifySendOk;
}

/** الإشعار الجاري بزرّ الإيقاف: عمليّته ومعرّفه لدى خادم الإشعارات (لإغلاقه). */
let active: { proc: ChildProcess; id: string | null; unsub: () => void } | null = null;

function closeActive(): void {
  if (!active) return;
  const { proc, id, unsub } = active;
  active = null;
  unsub();
  // إغلاقه من الشاشة بمعرّفه (المعيار)، ثمّ إنهاء عمليّة الانتظار.
  if (id) {
    execFile('gdbus', ['call', '--session', '--dest', 'org.freedesktop.Notifications',
      '--object-path', '/org/freedesktop/Notifications', '--method',
      'org.freedesktop.Notifications.CloseNotification', id], () => {});
  }
  try { proc.kill(); } catch {}
}

function notifyWithStop(opts: NotifyOptions): boolean {
  if (process.platform !== 'linux' || !hasNotifySend()) return false;
  closeActive();
  try {
    const proc = spawn('notify-send', [
      '--app-name=GT-SALAT', `--icon=${iconPath()}`, `--urgency=${opts.urgent ? 'critical' : 'normal'}`,
      '--print-id', '--action=stop=⏹ إيقاف الأذان', '--action=default=فتح GT-SALAT',
      opts.title, opts.body,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    const entry = { proc, id: null as string | null, unsub: () => {} };
    active = entry;
    // انتهاء الصوت (أو إيقافه من النافذة أو الشريط) يُغلق الإشعار، فلا يبقى زرٌّ لا عمل له.
    // مهلةٌ قصيرة: بين الأذان والدعاء لحظةٌ بلا صوت، فلا يُغلَق الإشعار قبل الدعاء.
    entry.unsub = audio.onAudioState((kind) => {
      if (kind !== null || active !== entry) return;
      setTimeout(() => { if (active === entry && audio.playingKind() === null) closeActive(); }, 2500);
    });
    let buf = '';
    proc.stdout?.on('data', (d: Buffer) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (/^\d+$/.test(line) && entry.id === null) entry.id = line;   // السطر الأوّل: المعرّف
        else if (line === 'stop') { audio.stop(); closeAdhanWindow(); }
        else if (line === 'default' && opts.route) navHandler?.(opts.route);
      }
    });
    proc.on('exit', () => { if (active === entry) { active = null; entry.unsub(); } });
    proc.on('error', () => { if (active === entry) { active = null; entry.unsub(); } });
    return true;
  } catch {
    return false;
  }
}
