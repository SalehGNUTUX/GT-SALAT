import { app } from 'electron';
import { REPO } from './credits.js';
import type { UpdateInfo } from './types.js';

/**
 * فحص توفّر نسخةٍ جديدة من صفحة إصدارات GitHub.
 *
 * الفحص يجري في **العملية الرئيسية** (لا الواجهة) — فلا يحتاج توسيع `connect-src` في الـCSP،
 * ولا يُسرّب أيّ بيانات: طلب GET واحدٌ لا يحمل معرّفاً للمستخدم.
 * لا تنزيل ولا تثبيت تلقائي: نُعلم المستخدم ونفتح صفحة الإصدار في متصفّحه إن شاء.
 */

const RELEASES_API = 'https://api.github.com/repos/SalehGNUTUX/GT-SALAT/releases/latest';
const RELEASES_PAGE = `${REPO}/releases/latest`;

let cached: UpdateInfo | null = null;

/** «v2.1.0» أو «2.1.0» → [2, 1, 0] */
function parseVersion(v: string): number[] {
  return (v || '')
    .replace(/^v/i, '')
    .split(/[.\-+]/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
}

/** أكبر من الحالية؟ مقارنةٌ رقميةٌ جزءاً جزءاً (2.10.0 > 2.9.0). */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(RELEASES_API, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GT-SALAT' },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as { tag_name?: string; name?: string; html_url?: string; body?: string };
    const latest = (json.tag_name || json.name || '').replace(/^v/i, '');
    if (!latest) throw new Error('لا وسم في الإصدار');

    cached = {
      current,
      latest,
      available: isNewer(latest, current),
      url: json.html_url || RELEASES_PAGE,
      notes: (json.body || '').slice(0, 600),
      checked: true,
    };
    return cached;
  } catch {
    // تعذّر الفحص (بلا إنترنت مثلاً) — ليس خطأً يستحقّ إزعاج المستخدم.
    cached = { current, latest: '', available: false, url: RELEASES_PAGE, notes: '', checked: false };
    return cached;
  }
}

/** آخر نتيجة فحصٍ محفوظة (بلا اتصالٍ جديد). */
export function lastUpdateInfo(): UpdateInfo | null {
  return cached;
}

export const RELEASES_URL = RELEASES_PAGE;
