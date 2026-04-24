import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, execFileSync, ChildProcess } from 'node:child_process';

let currentPlayer: ChildProcess | null = null;
let cachedPlayers: Array<[string, string[]]> | null = null;

function audioDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'audio');
  return path.join(app.getAppPath(), 'resources', 'audio');
}

export type AdhanAudioKind = 'full' | 'short' | 'approaching' | 'dua_after_adhan' | 'post_prayer_dhikr';

export function audioFilePath(kind: AdhanAudioKind): string {
  const file =
    kind === 'full' ? 'adhan.ogg' :
    kind === 'short' ? 'short_adhan.ogg' :
    kind === 'approaching' ? 'prayer_approaching.ogg' :
    kind === 'dua_after_adhan' ? 'dua_after_adhan.ogg' :
    'post_prayer_dhikr.ogg';
  return path.join(audioDir(), file);
}

const PLAYERS: Array<[string, string[]]> = [
  ['mpv', ['--really-quiet', '--no-video']],
  ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet']],
  ['cvlc', ['--intf', 'dummy', '--play-and-exit', '--quiet']],
  ['paplay', []],
  ['play', ['-q']],
  ['ogg123', ['-q']],
];

function getAvailablePlayers(): Array<[string, string[]]> {
  if (cachedPlayers !== null) return cachedPlayers;
  cachedPlayers = PLAYERS.filter(([cmd]) => {
    try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; }
  });
  return cachedPlayers;
}

export function play(kind: AdhanAudioKind, onFinished?: () => void): boolean {
  stop();
  const file = audioFilePath(kind);
  if (!fs.existsSync(file)) {
    onFinished?.();
    return false;
  }

  for (const [cmd, baseArgs] of getAvailablePlayers()) {
    try {
      const args = [...baseArgs, file];
      const proc = spawn(cmd, args, { stdio: 'ignore', detached: false });
      proc.on('error', () => {});
      proc.on('exit', () => {
        if (currentPlayer === proc) {
          currentPlayer = null;
          onFinished?.();
        }
      });
      currentPlayer = proc;
      return true;
    } catch {
      continue;
    }
  }
  onFinished?.();
  return false;
}

export function playFile(filePath: string, onFinished?: () => void): boolean {
  stop();
  if (!fs.existsSync(filePath)) { onFinished?.(); return false; }

  for (const [cmd, baseArgs] of getAvailablePlayers()) {
    try {
      const args = [...baseArgs, filePath];
      const proc = spawn(cmd, args, { stdio: 'ignore', detached: false });
      proc.on('error', () => {});
      proc.on('exit', () => {
        if (currentPlayer === proc) { currentPlayer = null; onFinished?.(); }
      });
      currentPlayer = proc;
      return true;
    } catch { continue; }
  }
  onFinished?.();
  return false;
}

export function stop(): void {
  if (currentPlayer && !currentPlayer.killed) {
    try { currentPlayer.kill('SIGTERM'); } catch {}
  }
  currentPlayer = null;
}

export function isPlaying(): boolean {
  return currentPlayer !== null && !currentPlayer.killed;
}
