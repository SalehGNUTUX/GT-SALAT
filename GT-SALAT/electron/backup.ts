import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import AdmZip from 'adm-zip';
import { getSettings, setSettings } from './settings.js';
import type { AlertMode, AppSettings, AsrMadhab, CalendarKind, MonthScheme } from './types.js';

/**
 * نسخٌ احتياطيٌّ **متوافقٌ مع نسخة الهاتف**: الحزمة الواحدة تُصدَّر من أيّ النسختين وتُستورَد في الأخرى.
 *
 * بنية الحزمة (مطابقةٌ لـ`BackupManager.kt` حرفياً):
 *   settings.json  {app:"GT-SALAT", schema:1, prefs:{ "<مفتاح>": {t:"bool|int|long|float|double|str|set", v} }}
 *   prayers.json   {prefix:"prayers":[{dateIso, methodId, locKey, hijri, fajr…isha (ملّي ثانية), source, savedAt}]}
 *   files/…        صوت القرآن والمصحف المُنزَّلان (خاصّة بالهاتف — يتجاهلها سطح المكتب ولا يمسّها)
 *
 * **مبدأ التوافق:** الحقول المشتركة تُكتَب بأسماء مفاتيح الهاتف نفسها، وما يخصّ سطح المكتب وحده
 * يُكتَب بسابقة `gtd_`. فالهاتف يقرأ ما يعنيه ويتجاهل الباقي (ويحفظه فيعود سليماً في رحلة العودة)،
 * وسطح المكتب يقرأ المشترك ثم يُغلّبه بـ`gtd_` إن وُجد.
 *
 * `locKey` بصيغة `%.2f_%.2f` في النسختين — فتتبادلان المواقيت المخزَّنة بلا تحويل.
 */

export interface BackupOptions {
  settings: boolean;
  prayers: boolean;
}

export interface BackupContents {
  hasSettings: boolean;
  prayersCount: number;
  /** ملفّات الهاتف (صوت/مصحف) — تُعرَض للعلم فقط، لا يستوردها سطح المكتب. */
  phoneFiles: number;
  phoneBytes: number;
  fromPhone: boolean;
}

export interface BackupResult {
  ok: boolean;
  settings: boolean;
  prayers: number;
  error?: string;
}

type PrefType = 'bool' | 'int' | 'long' | 'float' | 'double' | 'str' | 'set';
interface Pref { t: PrefType; v: unknown }
type Prefs = Record<string, Pref>;

const B = (v: boolean): Pref => ({ t: 'bool', v });
const I = (v: number): Pref => ({ t: 'int', v: Math.round(v) });
const D = (v: number): Pref => ({ t: 'double', v });
const S = (v: string): Pref => ({ t: 'str', v });
const SET = (v: string[]): Pref => ({ t: 'set', v });

// ── قراءةٌ متساهلة: تقبل أيّ نوعٍ رقميّ/نصّيّ كتبه الطرف الآخر ──
function readBool(p: Prefs, k: string): boolean | undefined {
  const o = p[k];
  if (!o) return undefined;
  if (typeof o.v === 'boolean') return o.v;
  if (typeof o.v === 'number') return o.v !== 0;
  if (typeof o.v === 'string') return o.v === 'true' || o.v === '1';
  return undefined;
}
function readNum(p: Prefs, k: string): number | undefined {
  const o = p[k];
  if (!o) return undefined;
  const n = typeof o.v === 'number' ? o.v : parseFloat(String(o.v));
  return Number.isFinite(n) ? n : undefined;
}
function readStr(p: Prefs, k: string): string | undefined {
  const o = p[k];
  return o && o.v != null ? String(o.v) : undefined;
}
function readSet(p: Prefs, k: string): string[] | undefined {
  const o = p[k];
  if (!o) return undefined;
  if (Array.isArray(o.v)) return o.v.map(String);
  if (typeof o.v === 'string' && o.v) return o.v.split(',').map((x) => x.trim()).filter(Boolean);
  return undefined;
}

// ── تحويلات القيم بين اصطلاحَي النسختين ──
const ALERT_TO_PHONE: Record<AlertMode, string> = { adhan: 'FULL', tone: 'TONE', silent: 'SILENT' };
const ALERT_FROM_PHONE: Record<string, AlertMode> = { FULL: 'adhan', TONE: 'tone', SILENT: 'silent' };

/** لون التمييز: الهاتف يخزّنه عدداً ARGB، وسطح المكتب نصّاً `#rrggbb`. */
function hexToArgb(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  return (0xff000000 | parseInt(m[1], 16)) | 0;
}
function argbToHex(argb: number): string {
  if (!argb) return '';
  return '#' + (argb & 0xffffff).toString(16).padStart(6, '0');
}

// ═══════════════════════ الإعدادات → prefs ═══════════════════════

function settingsToPrefs(s: AppSettings): Prefs {
  const p: Prefs = {};

  // ── مفاتيح الهاتف القانونية (المشترك بين النسختين) ──
  if (s.lat != null) p['lat'] = D(s.lat);
  if (s.lon != null) p['lon'] = D(s.lon);
  p['has_loc'] = B(s.lat != null && s.lon != null);
  p['city'] = S(s.city);
  p['country'] = S(s.country);
  p['method_id'] = I(s.methodId);
  p['location_history'] = S(JSON.stringify(s.locationHistory ?? []));
  p['auto_update_loc'] = B(s.autoUpdateLocation);
  p['madhab'] = S(s.madhab === 'hanafi' ? 'HANAFI' : 'SHAFI');
  p['pre_notify_min'] = I(s.preNotifyMinutes);
  p['adhan_type'] = S(s.useCustomAdhan ? 'CUSTOM' : s.adhanType === 'short' ? 'SHORT' : 'FULL');
  p['en_salat_notify'] = B(s.enableSalatNotify);
  p['en_adhan_sound'] = B(s.systemSalatNotify);
  p['en_dua_after'] = B(s.enableDuaAfterAdhan);
  p['adhan_volume'] = I(s.adhanVolume);
  p['per_prayer_alerts'] = B(s.perPrayerAlerts);
  p['prayer_alerts_csv'] = S((s.prayerAlerts ?? []).map((a) => ALERT_TO_PHONE[a] ?? 'FULL').join(','));
  p['en_pre_notify_sound'] = B(s.enablePreNotifySound);
  p['fullscreen_adhan'] = B(s.fullscreenAdhan);
  p['keep_adhan_screen'] = B(s.keepAdhanWindow);
  p['en_post_dhikr'] = B(s.enablePostPrayerDhikr);
  p['post_dhikr_min'] = I(s.postPrayerDhikrDelayMinutes);
  p['en_daily_ayah'] = B(s.enableDailyAyah);
  p['en_whitedays'] = B(s.enableWhiteDaysReminder);
  p['en_morning_adhkar'] = B(s.enableMorningAdhkarReminder);
  p['en_evening_adhkar'] = B(s.enableEveningAdhkarReminder);
  p['morning_adhkar_hour'] = I(s.morningAdhkarHour);
  p['evening_adhkar_hour'] = I(s.eveningAdhkarHour);
  p['en_sunnah'] = B(s.enableSunnahReminders);
  p['gtd_sunnahReminderHour'] = I(s.sunnahReminderHour);
  p['use_api'] = B(s.useApiTimetables);
  p['dnd'] = B(s.doNotDisturb);
  p['theme_mode'] = S(s.theme === 'light' ? 'LIGHT' : 'DARK');
  p['seed_color'] = I(hexToArgb(s.accentColor));
  p['month_scheme'] = S((s.monthScheme || 'auto').toUpperCase());
  p['timetable_calendar'] = S((s.timetableCalendar || 'hijri').toUpperCase());
  p['clock_24h'] = B(s.clock24h);
  p['hijri_offset'] = I(s.hijriOffset);
  p['check_updates'] = B(s.checkUpdates);
  p['last_whatsnew_code'] = S(s.lastWhatsNewVersion);
  p['setup_completed'] = B(s.setupCompleted);
  p['last_read_surah'] = I(s.lastReadSurah);
  p['last_read_ayah'] = I(s.lastReadAyah);
  p['last_listen_surah'] = I(s.lastListenSurah);
  p['last_listen_ayah'] = I(s.lastListenAyah);
  p['last_audio_surah'] = I(s.lastAudioSurah);
  p['last_audio_pos'] = I(Math.round((s.lastAudioPos ?? 0) * 1000));
  p['quran_bookmarks'] = SET(s.quranBookmarks ?? []);
  p['last_reciter_id'] = S(s.lastReciterId);
  p['last_mushaf_page'] = I(s.lastMushafPage);
  p['last_riwaya'] = S(s.lastRiwaya);

  // ── ما يخصّ سطح المكتب وحده (يتجاهله الهاتف ويحفظه) ──
  p['gtd_methodName'] = S(s.methodName);
  p['gtd_zikrIntervalMinutes'] = I(s.zikrIntervalMinutes);
  p['gtd_enableZikrNotify'] = B(s.enableZikrNotify);
  p['gtd_systemZikrNotify'] = B(s.systemZikrNotify);
  p['gtd_terminalSalatNotify'] = B(s.terminalSalatNotify);
  p['gtd_terminalZikrNotify'] = B(s.terminalZikrNotify);
  p['gtd_terminalShells'] = SET(s.terminalShells ?? []);
  p['gtd_autoUpdateTimetables'] = B(s.autoUpdateTimetables);
  p['gtd_autoStart'] = B(s.autoStart);
  p['gtd_minimizeToTray'] = B(s.minimizeToTray);
  p['gtd_startMinimized'] = B(s.startMinimized);
  p['gtd_customAdhanPath'] = S(s.customAdhanPath);
  p['gtd_useCustomAdhan'] = B(s.useCustomAdhan);
  p['gtd_enableDailyHikmah'] = B(s.enableDailyHikmah);
  p['gtd_enableTodayEvent'] = B(s.enableTodayEvent);
  p['gtd_enableRamadanCard'] = B(s.enableRamadanCard);
  p['gtd_accentColor'] = S(s.accentColor);
  p['gtd_advancedOpenSection'] = S(s.advancedOpenSection);
  p['gtd_tasbihTarget'] = I(s.tasbihTarget);
  p['gtd_tasbihCount'] = I(s.tasbihCount);
  p['gtd_tasbihTotal'] = I(s.tasbihTotal);
  p['gtd_tasbihDhikrIndex'] = I(s.tasbihDhikrIndex);
  p['gtd_tasbihMixed'] = B(s.tasbihMixed);
  p['gtd_tasbihMixedType'] = I(s.tasbihMixedType);
  p['gtd_tasbihVoiceSensitivity'] = I(s.tasbihVoiceSensitivity);
  p['quran_scroll_speed'] = I(s.quranScrollSpeed);
  p['last_audio_reciter'] = S(s.lastSurahReciterId);
  p['gtd_mushafRiwaya'] = S(s.mushafRiwaya);
  p['gtd_mushafInvert'] = B(s.mushafInvert);
  p['gtd_favoriteRadios'] = SET(s.favoriteRadios ?? []);
  p['favorite_features'] = SET(s.favoriteSections ?? []);
  p['gtd_customRadios'] = S(JSON.stringify(s.customRadios ?? []));
  p['gtd_radioEdits'] = S(JSON.stringify(s.radioEdits ?? {}));

  return p;
}

function prefsToSettings(p: Prefs): Partial<AppSettings> {
  const out: Partial<AppSettings> = {};
  const setIf = <K extends keyof AppSettings>(k: K, v: AppSettings[K] | undefined) => {
    if (v !== undefined) out[k] = v;
  };

  // ── المشترك ──
  const lat = readNum(p, 'lat');
  const lon = readNum(p, 'lon');
  if (lat !== undefined) out.lat = lat;
  if (lon !== undefined) out.lon = lon;
  setIf('city', readStr(p, 'city'));
  setIf('country', readStr(p, 'country'));
  setIf('methodId', readNum(p, 'method_id'));
  // السجلّ يُخزَّن نصّاً JSON بنفس صيغة الهاتف (`List<Place>`) فتتبادله النسختان كما هو.
  const hist = readStr(p, 'location_history');
  if (hist) {
    try {
      const arr = JSON.parse(hist);
      if (Array.isArray(arr)) setIf('locationHistory', arr.filter((x) => x && typeof x.lat === 'number'));
    } catch {}
  }
  setIf('autoUpdateLocation', readBool(p, 'auto_update_loc'));
  const madhab = readStr(p, 'madhab');
  if (madhab) out.madhab = (madhab.toUpperCase() === 'HANAFI' ? 'hanafi' : 'shafi') as AsrMadhab;
  setIf('preNotifyMinutes', readNum(p, 'pre_notify_min'));
  const adhanType = readStr(p, 'adhan_type');
  if (adhanType) {
    out.adhanType = adhanType.toUpperCase() === 'SHORT' ? 'short' : 'full';
    if (adhanType.toUpperCase() === 'CUSTOM') out.useCustomAdhan = true;
  }
  setIf('enableSalatNotify', readBool(p, 'en_salat_notify'));
  setIf('systemSalatNotify', readBool(p, 'en_adhan_sound'));
  setIf('enableDuaAfterAdhan', readBool(p, 'en_dua_after'));
  setIf('adhanVolume', readNum(p, 'adhan_volume'));
  setIf('perPrayerAlerts', readBool(p, 'per_prayer_alerts'));
  const csv = readStr(p, 'prayer_alerts_csv');
  if (csv) {
    const list = csv.split(',').map((x) => ALERT_FROM_PHONE[x.trim().toUpperCase()] ?? 'adhan');
    while (list.length < 5) list.push('adhan');
    out.prayerAlerts = list.slice(0, 5);
  }
  setIf('enablePreNotifySound', readBool(p, 'en_pre_notify_sound'));
  setIf('fullscreenAdhan', readBool(p, 'fullscreen_adhan'));
  setIf('keepAdhanWindow', readBool(p, 'keep_adhan_screen'));
  setIf('enablePostPrayerDhikr', readBool(p, 'en_post_dhikr'));
  setIf('postPrayerDhikrDelayMinutes', readNum(p, 'post_dhikr_min'));
  setIf('enableDailyAyah', readBool(p, 'en_daily_ayah'));
  setIf('enableWhiteDaysReminder', readBool(p, 'en_whitedays'));
  setIf('enableMorningAdhkarReminder', readBool(p, 'en_morning_adhkar'));
  setIf('enableEveningAdhkarReminder', readBool(p, 'en_evening_adhkar'));
  setIf('morningAdhkarHour', readNum(p, 'morning_adhkar_hour'));
  setIf('eveningAdhkarHour', readNum(p, 'evening_adhkar_hour'));
  setIf('enableSunnahReminders', readBool(p, 'en_sunnah'));
  setIf('sunnahReminderHour', readNum(p, 'gtd_sunnahReminderHour'));
  setIf('useApiTimetables', readBool(p, 'use_api'));
  setIf('doNotDisturb', readBool(p, 'dnd'));
  const theme = readStr(p, 'theme_mode');
  // «SYSTEM» في الهاتف لا مقابل له هنا، فيُترك المظهر الحالي كما هو.
  if (theme === 'LIGHT' || theme === 'DARK') out.theme = theme.toLowerCase() as 'light' | 'dark';
  const scheme = readStr(p, 'month_scheme');
  if (scheme) out.monthScheme = scheme.toLowerCase() as MonthScheme;
  const cal = readStr(p, 'timetable_calendar');
  if (cal) out.timetableCalendar = cal.toLowerCase() as CalendarKind;
  setIf('clock24h', readBool(p, 'clock_24h'));
  setIf('hijriOffset', readNum(p, 'hijri_offset'));
  setIf('checkUpdates', readBool(p, 'check_updates'));
  setIf('lastWhatsNewVersion', readStr(p, 'last_whatsnew_code'));
  setIf('setupCompleted', readBool(p, 'setup_completed'));
  setIf('lastReadSurah', readNum(p, 'last_read_surah'));
  setIf('lastReadAyah', readNum(p, 'last_read_ayah'));
  setIf('lastListenSurah', readNum(p, 'last_listen_surah'));
  setIf('lastListenAyah', readNum(p, 'last_listen_ayah'));
  setIf('lastAudioSurah', readNum(p, 'last_audio_surah'));
  // الهاتف يكتب الموضع بالمِلّي ثانية ونحن بالثواني — التحويل هنا كي لا يقفز الموضع ألف ضعف.
  const posMs = readNum(p, 'last_audio_pos');
  if (posMs != null) setIf('lastAudioPos', Math.round(posMs / 1000));
  setIf('quranBookmarks', readSet(p, 'quran_bookmarks'));
  setIf('lastReciterId', readStr(p, 'last_reciter_id'));
  setIf('lastMushafPage', readNum(p, 'last_mushaf_page'));
  setIf('lastRiwaya', readStr(p, 'last_riwaya'));
  const seed = readNum(p, 'seed_color');
  if (seed !== undefined) out.accentColor = argbToHex(seed);

  // ── ما يخصّ سطح المكتب: يُغلَّب على المشترك إن وُجد ──
  setIf('methodName', readStr(p, 'gtd_methodName'));
  setIf('zikrIntervalMinutes', readNum(p, 'gtd_zikrIntervalMinutes'));
  setIf('enableZikrNotify', readBool(p, 'gtd_enableZikrNotify'));
  setIf('systemZikrNotify', readBool(p, 'gtd_systemZikrNotify'));
  setIf('terminalSalatNotify', readBool(p, 'gtd_terminalSalatNotify'));
  setIf('terminalZikrNotify', readBool(p, 'gtd_terminalZikrNotify'));
  setIf('terminalShells', readSet(p, 'gtd_terminalShells'));
  setIf('autoUpdateTimetables', readBool(p, 'gtd_autoUpdateTimetables'));
  setIf('autoStart', readBool(p, 'gtd_autoStart'));
  setIf('minimizeToTray', readBool(p, 'gtd_minimizeToTray'));
  setIf('startMinimized', readBool(p, 'gtd_startMinimized'));
  setIf('customAdhanPath', readStr(p, 'gtd_customAdhanPath'));
  setIf('useCustomAdhan', readBool(p, 'gtd_useCustomAdhan'));
  setIf('enableDailyHikmah', readBool(p, 'gtd_enableDailyHikmah'));
  setIf('enableTodayEvent', readBool(p, 'gtd_enableTodayEvent'));
  setIf('enableRamadanCard', readBool(p, 'gtd_enableRamadanCard'));
  setIf('accentColor', readStr(p, 'gtd_accentColor'));
  setIf('advancedOpenSection', readStr(p, 'gtd_advancedOpenSection'));
  setIf('tasbihTarget', readNum(p, 'gtd_tasbihTarget'));
  setIf('tasbihCount', readNum(p, 'gtd_tasbihCount'));
  setIf('tasbihTotal', readNum(p, 'gtd_tasbihTotal'));
  setIf('tasbihDhikrIndex', readNum(p, 'gtd_tasbihDhikrIndex'));
  setIf('tasbihMixed', readBool(p, 'gtd_tasbihMixed'));
  setIf('tasbihMixedType', readNum(p, 'gtd_tasbihMixedType'));
  setIf('tasbihVoiceSensitivity', readNum(p, 'gtd_tasbihVoiceSensitivity'));
  setIf('quranScrollSpeed', readNum(p, 'quran_scroll_speed') ?? readNum(p, 'gtd_quranScrollSpeed'));
  setIf('lastSurahReciterId', readStr(p, 'last_audio_reciter') ?? readStr(p, 'gtd_lastSurahReciterId'));
  setIf('mushafRiwaya', readStr(p, 'gtd_mushafRiwaya'));
  setIf('mushafInvert', readBool(p, 'gtd_mushafInvert'));
  setIf('favoriteRadios', readSet(p, 'gtd_favoriteRadios'));
  setIf('favoriteSections', readSet(p, 'favorite_features') ?? readSet(p, 'gtd_favoriteSections'));
  const customRadios = readStr(p, 'gtd_customRadios');
  if (customRadios) {
    try { out.customRadios = JSON.parse(customRadios); } catch { /* حزمةٌ تالفةٌ جزئياً — نتجاهل الحقل */ }
  }
  const radioEdits = readStr(p, 'gtd_radioEdits');
  if (radioEdits) {
    try { out.radioEdits = JSON.parse(radioEdits); } catch { /* كسابقه */ }
  }

  return out;
}

// ═══════════════════════ المواقيت ═══════════════════════

interface PrayerRow {
  dateIso: string;
  methodId: number;
  locKey: string;
  hijri: string | null;
  fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number;
  source: string;
  savedAt: number;
}

function timetablesDir(): string {
  const dir = path.join(app.getPath('userData'), 'timetables');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** اسم ملفّ الكاش: نفس اصطلاح `prayer.ts` (طريقة + مذهب + موقع). */
function cacheFileName(year: number, month: number, methodId: number, school: number, locKey: string): string {
  return `timetable_${year}_${String(month).padStart(2, '0')}_m${methodId}_s${school}_l${locKey}.json`;
}

/** يقرأ كل جداول الكاش ويحوّلها إلى صفوفٍ بصيغة الهاتف. */
function collectPrayerRows(): PrayerRow[] {
  const rows: PrayerRow[] = [];
  let files: string[] = [];
  try { files = fs.readdirSync(timetablesDir()); } catch { return rows; }

  for (const f of files) {
    const m = f.match(/^timetable_(\d{4})_(\d{2})_m(\d+)_s(\d)_l(.+)\.json$/);
    if (!m) continue;
    const methodId = Number(m[3]);
    const locKey = m[5];
    let days: Array<{ date: string; hijri?: string; prayers: Array<{ id: string; timestamp: number }> }>;
    try {
      days = JSON.parse(fs.readFileSync(path.join(timetablesDir(), f), 'utf-8'));
    } catch { continue; }
    if (!Array.isArray(days)) continue;

    const savedAt = (() => {
      try { return Math.round(fs.statSync(path.join(timetablesDir(), f)).mtimeMs); } catch { return Date.now(); }
    })();

    for (const d of days) {
      const t = (id: string) => d.prayers?.find((p) => p.id === id)?.timestamp ?? 0;
      rows.push({
        dateIso: d.date,
        methodId,
        locKey,
        hijri: d.hijri ?? null,
        fajr: t('fajr'), sunrise: t('sunrise'), dhuhr: t('dhuhr'),
        asr: t('asr'), maghrib: t('maghrib'), isha: t('isha'),
        source: 'api',
        savedAt,
      });
    }
  }
  return rows;
}

const PRAYER_NAMES: Record<string, string> = {
  fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر',
  asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** يعيد بناء ملفّات الكاش الشهرية من صفوف الهاتف. يعيد عدد الأيام المستوردة. */
function restorePrayerRows(rows: PrayerRow[]): number {
  // نجمع حسب (سنة-شهر + طريقة + موقع) لأنّ سطح المكتب يخزّن ملفّاً لكل شهر.
  const groups = new Map<string, PrayerRow[]>();
  for (const r of rows) {
    if (!r.dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(r.dateIso)) continue;
    const key = `${r.dateIso.slice(0, 7)}|${r.methodId}|${r.locKey}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const madhab = getSettings().madhab;
  const school = madhab === 'hanafi' ? 1 : 0;
  let count = 0;

  for (const [key, list] of groups) {
    const [ym, methodStr, locKey] = key.split('|');
    const [year, month] = ym.split('-').map(Number);
    // مفتاح الموقع يأتي من الحزمة — نرفض ما قد يهرب من مجلّد الجداول.
    if (!/^-?\d+(\.\d+)?_-?\d+(\.\d+)?$/.test(locKey)) continue;

    const days = list
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
      .map((r) => ({
        date: r.dateIso,
        ...(r.hijri ? { hijri: r.hijri } : {}),
        prayers: (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((id) => {
          const ts = Number(r[id]) || 0;
          const d = new Date(ts);
          return {
            id,
            name: PRAYER_NAMES[id],
            time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
            date: r.dateIso,
            timestamp: ts,
          };
        }),
      }));

    const file = path.join(timetablesDir(), cacheFileName(year, month, Number(methodStr), school, locKey));
    try {
      fs.writeFileSync(file, JSON.stringify(days, null, 2), 'utf-8');
      count += days.length;
    } catch { /* ملفٌّ متعذّر الكتابة — نتابع البقيّة */ }
  }
  return count;
}

// ═══════════════════════ التصدير والاستيراد ═══════════════════════

export function backupSizes(): { prayersCount: number } {
  return { prayersCount: collectPrayerRows().length };
}

export function exportBackup(filePath: string, opts: BackupOptions): BackupResult {
  try {
    const zip = new AdmZip();
    let prayers = 0;

    if (opts.settings) {
      const root = { app: 'GT-SALAT', schema: 1, prefs: settingsToPrefs(getSettings()) };
      zip.addFile('settings.json', Buffer.from(JSON.stringify(root, null, 2), 'utf-8'));
    }
    if (opts.prayers) {
      const rows = collectPrayerRows();
      prayers = rows.length;
      zip.addFile('prayers.json', Buffer.from(JSON.stringify({ prayers: rows }), 'utf-8'));
    }

    zip.writeZip(filePath);
    return { ok: true, settings: opts.settings, prayers };
  } catch (err) {
    return { ok: false, settings: false, prayers: 0, error: String(err) };
  }
}

export function inspectBackup(filePath: string): BackupContents {
  const empty: BackupContents = { hasSettings: false, prayersCount: 0, phoneFiles: 0, phoneBytes: 0, fromPhone: false };
  try {
    const zip = new AdmZip(filePath);
    let out = { ...empty };
    for (const e of zip.getEntries()) {
      if (e.isDirectory) continue;
      if (e.entryName === 'settings.json') out.hasSettings = true;
      else if (e.entryName === 'prayers.json') {
        try {
          const j = JSON.parse(e.getData().toString('utf-8')) as { prayers?: unknown[] };
          out.prayersCount = Array.isArray(j.prayers) ? j.prayers.length : 0;
        } catch { /* مدخلٌ تالف */ }
      } else if (e.entryName.startsWith('files/')) {
        out.phoneFiles++;
        out.phoneBytes += e.header.size;
        out.fromPhone = true;
      }
    }
    return out;
  } catch {
    return empty;
  }
}

export function importBackup(filePath: string, opts: BackupOptions): BackupResult {
  try {
    const zip = new AdmZip(filePath);
    let didSettings = false;
    let prayers = 0;

    // ★ الترتيب مقصود ولا يُعكَس: الإعدادات أولاً ثم المواقيت.
    // اسم ملفّ كاش الشهر يتضمّن رقم المذهب، وهو يُقرأ من الإعدادات — فلو استُعيدت
    // المواقيت قبلها لكُتبت بمذهب الجهاز القديم ولما وجدها التطبيق بعد تغيّره.
    // (لا نعتمد على ترتيب مدخلات ZIP، فهو غير مضمون.)
    if (opts.settings) {
      const e = zip.getEntry('settings.json');
      if (e) {
        const root = JSON.parse(e.getData().toString('utf-8')) as { prefs?: Prefs };
        if (root.prefs) {
          setSettings(prefsToSettings(root.prefs));
          didSettings = true;
        }
      }
    }
    if (opts.prayers) {
      const e = zip.getEntry('prayers.json');
      if (e) {
        const j = JSON.parse(e.getData().toString('utf-8')) as { prayers?: PrayerRow[] };
        if (Array.isArray(j.prayers)) prayers = restorePrayerRows(j.prayers);
      }
    }
    // مدخلات `files/` (صوت القرآن والمصحف) خاصّةٌ بالهاتف — تُترَك كما هي.
    return { ok: true, settings: didSettings, prayers };
  } catch (err) {
    return { ok: false, settings: false, prayers: 0, error: String(err) };
  }
}
