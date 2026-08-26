import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, execFileSync, ChildProcess } from 'node:child_process';
import { getSettings } from './settings.js';

let currentPlayer: ChildProcess | null = null;
let currentKind: string | null = null;
let cachedPlayers: Array<[string, string[]]> | null = null;

/**
 * مستمعٌ يُخطَر بكلّ تغيّرٍ في الصوت الجاري — `main.ts` يربطه ببثٍّ إلى الواجهة، فيظهر
 * **زرّ إيقاف الصوت** في لوحة التحكّم أثناء الأذان أو التنبيه أو الأذكار (كما في نسخة الهاتف).
 * بدونه لا تعرف الواجهة أنّ شيئاً يُشغَّل — فالصوت يخرج من مشغّل النظام لا من عنصر `<audio>`.
 */
let stateListener: ((kind: string | null) => void) | null = null;

export function setAudioStateListener(cb: (kind: string | null) => void): void {
  stateListener = cb;
}

function emitState(): void {
  try { stateListener?.(playingKind()); } catch {}
}

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

/**
 * وسائط ضبط مستوى الصوت لكل مشغّل (0..100). لكل مشغّل صيغته الخاصة:
 * mpv/ffplay بالنسبة المئوية، paplay بمقياس PulseAudio (65536 = 100٪)،
 * cvlc بمعامل تضخيمٍ عشري، sox بمعامل ضربٍ عشري. ogg123 لا يدعم ضبط الصوت فيُتجاهَل.
 */
function volumeArgs(cmd: string, volume: number): string[] {
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  if (v === 100) return [];
  switch (cmd) {
    case 'mpv': return [`--volume=${v}`];
    case 'ffplay': return ['-volume', String(v)];
    case 'cvlc': return [`--gain=${(v / 100).toFixed(2)}`];
    case 'paplay': return [`--volume=${Math.round((v / 100) * 65536)}`];
    case 'play': return ['-v', (v / 100).toFixed(2)];
    default: return [];
  }
}

function getAvailablePlayers(): Array<[string, string[]]> {
  if (cachedPlayers !== null) return cachedPlayers;
  cachedPlayers = PLAYERS.filter(([cmd]) => {
    try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; }
  });
  return cachedPlayers;
}

/** المشغّلات المكتشَفة — تُعرَض في صفحة حالة النظام. */
export function detectedPlayers(): string[] {
  return getAvailablePlayers().map(([cmd]) => cmd);
}

/** تشغيل ملفٍ عبر أول مشغّلٍ متاح، مع تسمية النوع لتتبّع أزرار المعاينة في الواجهة. */
function spawnPlayer(file: string, kind: string, onFinished?: () => void): boolean {
  stop();
  if (!fs.existsSync(file)) {
    onFinished?.();
    return false;
  }

  const volume = getSettings().adhanVolume ?? 100;

  for (const [cmd, baseArgs] of getAvailablePlayers()) {
    try {
      const args = [...baseArgs, ...volumeArgs(cmd, volume), file];
      const proc = spawn(cmd, args, { stdio: 'ignore', detached: false });
      proc.on('error', () => {});
      proc.on('exit', () => {
        if (currentPlayer === proc) {
          currentPlayer = null;
          currentKind = null;
          emitState();
          onFinished?.();
        }
      });
      currentPlayer = proc;
      currentKind = kind;
      emitState();
      return true;
    } catch {
      continue;
    }
  }
  onFinished?.();
  return false;
}

export function play(kind: AdhanAudioKind, onFinished?: () => void): boolean {
  return spawnPlayer(audioFilePath(kind), kind, onFinished);
}

export function playFile(filePath: string, onFinished?: () => void): boolean {
  return spawnPlayer(filePath, 'custom', onFinished);
}

export function stop(): void {
  const was = currentPlayer !== null;
  if (currentPlayer && !currentPlayer.killed) {
    try { currentPlayer.kill('SIGTERM'); } catch {}
  }
  currentPlayer = null;
  currentKind = null;
  if (was) emitState();
}

export function isPlaying(): boolean {
  return currentPlayer !== null && !currentPlayer.killed;
}

/** نوع الصوت الجاري تشغيله (أو null) — تستعمله أزرار المعاينة لتبديل تشغيل/إيقاف. */
export function playingKind(): string | null {
  return isPlaying() ? currentKind : null;
}

/** زرّ معاينة: يشغّل النوع، أو يوقفه إن كان هو الجاري. يعيد النوع الجاري بعد العملية. */
export function togglePreview(kind: AdhanAudioKind | 'custom', customPath?: string): string | null {
  if (playingKind() === kind) {
    stop();
    return null;
  }
  if (kind === 'custom') {
    if (!customPath) return null;
    playFile(customPath);
  } else {
    play(kind);
  }
  return playingKind();
}
