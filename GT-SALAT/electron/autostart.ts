import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const AUTOSTART_DIR = path.join(os.homedir(), '.config', 'autostart');
const DESKTOP_FILE = path.join(AUTOSTART_DIR, 'gt-salat.desktop');

function execPath(): string {
  // AppImage → APPIMAGE env. مُثبّت → app.getPath('exe'). تطوير → npm start.
  if (process.env.APPIMAGE) return process.env.APPIMAGE;
  return app.getPath('exe');
}

function iconPath(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'icons', 'prayer-icon-256.png');
  return path.join(app.getAppPath(), 'resources', 'icons', 'prayer-icon-256.png');
}

export function isAutoStartEnabled(): boolean {
  return fs.existsSync(DESKTOP_FILE);
}

export function setAutoStart(enabled: boolean): boolean {
  try {
    if (!enabled) {
      if (fs.existsSync(DESKTOP_FILE)) fs.unlinkSync(DESKTOP_FILE);
      return true;
    }
    if (!fs.existsSync(AUTOSTART_DIR)) fs.mkdirSync(AUTOSTART_DIR, { recursive: true });
    const content = `[Desktop Entry]
Type=Application
Version=1.0
Name=GT-SALAT
Name[ar]=GT-SALAT ـ تذكير الصلاة والأذكار
Comment=Prayer times and dhikr reminders
Comment[ar]=واجهة حديثة لتذكير الصلاة وعرض الأذكار
Exec=${execPath()} --hidden
Icon=${iconPath()}
Terminal=false
Categories=Utility;
X-GNOME-Autostart-enabled=true
StartupNotify=false
`;
    fs.writeFileSync(DESKTOP_FILE, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
