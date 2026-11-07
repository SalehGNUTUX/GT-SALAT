/**
 * ★ اتّباع توقيت النظام رغم قِدَم بيانات المناطق الزمنيّة المضمَّنة في Electron.
 *
 * يحمل Electron مكتبة ICU خاصّةً به، وفيها قواعد المناطق الزمنيّة كما كانت يوم بنائه.
 * فإن تغيّرت قواعد بلدٍ بعد ذلك ظلّ التطبيق على القديمة وإن حُدِّث النظام: عاد المغرب إلى
 * GMT+0 في 2026-09-20، والنظام (tzdata 2026e) يعرف ذلك، وElectron 30 ما زال يحسب
 * `Africa/Casablanca` على GMT+1. فتقدّمت ساعة التطبيق والأذان ساعةً كاملة.
 *
 * العلاج: نسأل النظام عن إزاحته الفعليّة الآن (`date +%z`)، فإن خالفت إزاحة Electron ضبطنا
 * `process.env.TZ` على منطقةٍ ثابتة الإزاحة (`Etc/GMT±N`) قبل فتح أيّ نافذة. تتبعها العمليّة
 * الرئيسيّة فوراً (تعيد Node قراءة TZ عند تغييره)، وكلّ عمليّة عرضٍ تُنشأ بعدها؛ أمّا النافذة
 * المفتوحة فلا تتبعها إلّا إذا أُعيد إنشاؤها (مُختبَر).
 *
 * ملاحظتان:
 * - مناطق `Etc/GMT` معكوسة الإشارة في معيار POSIX: `Etc/GMT-1` تعني GMT+1.
 * - لا تدعم إلّا الساعات الكاملة؛ الإزاحات النصفيّة (الهند +5:30) لا تُصحَّح تلقائيّاً،
 *   ولا يكاد يُحتاج إليها، فبيانات ICU لهذه المناطق لم تتغيّر.
 *
 * وفي الإعدادات وضعٌ يدويّ يفرض إزاحةً يختارها المستخدم، لمن يعرض نظامُه نفسُه وقتاً خاطئاً.
 */
import { execFileSync } from 'node:child_process';
import { getSettings } from './settings.js';
import type { TimeZoneStatus } from './types.js';

/** قيمة TZ التي شُغِّل بها التطبيق، قبل أيّ تعديلٍ منّا. */
const ORIGINAL_TZ = process.env.TZ;

/** المنطقة التي فرضناها (null = لم نتدخّل وتعمل منطقة النظام كما هي). */
let applied: string | null = null;
/** إزاحة Electron بقواعده المضمَّنة قبل تدخّلنا — بالدقائق شرقَ غرينتش. */
let engineOffset: number | null = null;
let systemOffset: number | null = null;

function setTz(value: string | undefined): void {
  if (value === undefined) delete process.env.TZ;
  else process.env.TZ = value;
}

/** إزاحة النظام الفعليّة الآن بالدقائق شرقَ غرينتش (60 = GMT+1)، أو null إن تعذّرت. */
function readSystemOffset(): number | null {
  if (process.platform === 'win32') return null;
  try {
    const env = { ...process.env };
    if (ORIGINAL_TZ === undefined) delete env.TZ;
    else env.TZ = ORIGINAL_TZ;
    const out = execFileSync('date', ['+%z'], { env, timeout: 2000, encoding: 'utf-8' }).trim();
    const m = /^([+-])(\d{2})(\d{2})$/.exec(out);
    if (!m) return null;
    const minutes = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    return m[1] === '-' ? -minutes : minutes;
  } catch {
    return null;
  }
}

/** إزاحة محرّك Electron بقواعده هو، بلا تدخّلنا. */
function readEngineOffset(): number {
  const current = process.env.TZ;
  setTz(ORIGINAL_TZ);
  const offset = -new Date().getTimezoneOffset();
  setTz(current);
  return offset;
}

/** منطقةٌ ثابتة الإزاحة لساعاتٍ كاملة، أو null لإزاحةٍ نصفيّة. */
function fixedZone(offsetMinutes: number): string | null {
  if (offsetMinutes % 60 !== 0) return null;
  const h = offsetMinutes / 60;
  if (h === 0) return 'Etc/GMT';
  return `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}`;
}

/** المنطقة المطلوبة حسب الإعدادات وحال النظام، أو null لترك منطقة النظام. */
function desiredZone(): string | null {
  const s = getSettings();
  if (s.timeZoneMode === 'manual') {
    return fixedZone(Math.round((s.manualUtcOffset ?? 0) * 60));
  }
  systemOffset = readSystemOffset();
  engineOffset = readEngineOffset();
  if (systemOffset == null || systemOffset === engineOffset) return null;
  return fixedZone(systemOffset);
}

/**
 * يطبّق المنطقة المطلوبة. يُعيد true إن تغيّرت، فيلزم إعادة إنشاء النوافذ المفتوحة
 * كي تتبعها (العمليّة الرئيسيّة والمجدول يتبعانها فوراً).
 */
export function applyTimeZone(): boolean {
  const want = desiredZone();
  if (want === applied) return false;
  applied = want;
  setTz(want ?? ORIGINAL_TZ);
  if (want) console.log(`[timezone] فُرضت المنطقة ${want}${systemOffset != null ? ` (النظام ${systemOffset} د، Electron ${engineOffset} د)` : " (يدويّ)"}`);
  return true;
}

export function timeZoneStatus(): TimeZoneStatus {
  const s = getSettings();
  if (engineOffset == null) engineOffset = readEngineOffset();
  if (systemOffset == null) systemOffset = readSystemOffset();
  return {
    mode: s.timeZoneMode === 'manual' ? 'manual' : 'auto',
    systemOffset,
    engineOffset,
    appOffset: -new Date().getTimezoneOffset(),
    applied,
    unsupported: s.timeZoneMode !== 'manual' && systemOffset != null && systemOffset !== engineOffset && fixedZone(systemOffset) == null,
  };
}

let refresher: ((route?: string) => boolean) | null = null;
/** `main.ts` يسجّل دالّته التي تطبّق المنطقة وتعيد إنشاء النافذة. */
export function setTimeZoneRefresher(fn: (route?: string) => boolean): void {
  refresher = fn;
}
/** تطبيقٌ فوريّ بعد تغيير الإعداد؛ النافذة تُستبدَل وتعود إلى `route`. */
export function refreshTimeZoneNow(route?: string): boolean {
  return refresher ? refresher(route) : applyTimeZone();
}

// ★ يُطبَّق لحظة استيراد الوحدة: `main.ts` يستوردها أوّلاً، فتسبق أيّ نافذة.
applyTimeZone();
