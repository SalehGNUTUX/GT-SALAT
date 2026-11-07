/**
 * إيقاف الوسائط الأخرى مؤقّتاً أثناء الأذان — نظير «بؤرة الصوت» (audio focus) في الهاتف.
 *
 * لينكس لا يملك بؤرة صوتٍ عامّة، لكنّ المشغّلات والمتصفّحات تعلن نفسها على ناقل الجلسة بمعيار
 * MPRIS (`org.mpris.MediaPlayer2.*`): VLC وmpv (بإضافته) وRhythmbox وSpotify وفايرفوكس وكروم،
 * ومعها مشغّل هذا التطبيق نفسه (الإذاعة والتلاوة)، فـChromium يعلن جلسات الوسائط كذلك.
 * نوقف ما كان **يعمل** منها فقط، ونحفظ أسماءها، ثمّ نستأنفها هي وحدها بعد انتهاء صوتنا — فلا
 * نشغّل ما أوقفه المستخدم بنفسه. بلا مكتبةٍ إضافيّة: `dbus-send` موجودٌ مع D-Bus في كلّ توزيعة.
 */
import { execFile } from 'node:child_process';

const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player';
const PATH = '/org/mpris/MediaPlayer2';

/** المشغّلات التي أوقفناها نحن، لنستأنفها وحدها. */
let pausedByUs: string[] = [];

function dbus(args: string[], timeout = 2500): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('dbus-send', ['--session', '--print-reply', ...args], { timeout }, (err, out) =>
      resolve(err ? null : String(out)),
    );
  });
}

async function mprisPlayers(): Promise<string[]> {
  const out = await dbus(['--dest=org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus.ListNames']);
  if (!out) return [];
  return [...out.matchAll(/string "(org\.mpris\.MediaPlayer2\.[^"]+)"/g)].map((m) => m[1]);
}

async function isPlaying(name: string): Promise<boolean> {
  const out = await dbus([
    `--dest=${name}`, PATH, 'org.freedesktop.DBus.Properties.Get',
    `string:${PLAYER_IFACE}`, 'string:PlaybackStatus',
  ]);
  return !!out && /"Playing"/.test(out);
}

/** يوقف كلّ مشغّلٍ يعمل الآن، ويتذكّره. آمنٌ إن لم يوجد D-Bus أو مشغّل. */
export async function pauseOtherMedia(): Promise<void> {
  try {
    const playing: string[] = [];
    for (const name of await mprisPlayers()) {
      if (await isPlaying(name)) playing.push(name);
    }
    for (const name of playing) {
      await dbus([`--dest=${name}`, PATH, `${PLAYER_IFACE}.Pause`]);
    }
    // لا نمحو من أوقفناه في مرّةٍ سابقةٍ لم نستأنفها بعد (أذانٌ ثمّ دعاء).
    pausedByUs = [...new Set([...pausedByUs, ...playing])];
    if (playing.length) console.log('[media] أُوقف مؤقّتاً:', playing.join('، '));
  } catch {
    // لا شيء: الأذان أهمّ من إيقاف غيره
  }
}

/** يستأنف ما أوقفناه نحن فقط. */
export async function resumeOtherMedia(): Promise<void> {
  const names = pausedByUs;
  pausedByUs = [];
  for (const name of names) {
    const ok = await dbus([`--dest=${name}`, PATH, `${PLAYER_IFACE}.Play`]);
    console.log('[media] استئناف', name, ok === null ? 'فشل' : 'تمّ');
  }
}
