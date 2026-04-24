import { Notification, app, nativeImage } from 'electron';
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

    if (!Notification.isSupported()) return false;
    const n = new Notification({
      title: opts.title,
      body: opts.body,
      icon: nativeImage.createFromPath(iconPath()),
      urgency: opts.urgent ? 'critical' : 'normal',
      silent: true, // الصوت يُشغّل عبر audio.ts
    });
    if (opts.onClick) n.on('click', opts.onClick);
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
