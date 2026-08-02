/**
 * تطبيق اللون المميّز الذي يختاره المستخدم على متغيّرات CSS.
 *
 * التصميم كلّه يشير إلى `--teal-*` و`--accent-*` بدل ألوانٍ ثابتة، فيكفي استبدال
 * هذه المتغيّرات لينتقل اللون إلى كل الصفحات دفعةً واحدة.
 */

const DEFAULTS: Record<string, string> = {
  '--teal-400': '#2ec7c7',
  '--teal-500': '#00bcd4',
  '--teal-600': '#00acc1',
  '--accent-tint': 'rgba(0, 188, 212, 0.1)',
  '--accent-tint-2': 'rgba(0, 188, 212, 0.15)',
  '--accent-border': 'rgba(0, 188, 212, 0.3)',
};

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

/** مزجٌ خطّي نحو الأبيض (ratio موجب) أو نحو الأسود (ratio سالب). */
function shade(rgb: [number, number, number], ratio: number): [number, number, number] {
  const target = ratio > 0 ? 255 : 0;
  const t = Math.abs(ratio);
  return rgb.map((c) => c + (target - c) * t) as [number, number, number];
}

export function applyAccent(color: string): void {
  const root = document.documentElement;
  const rgb = color ? parseHex(color) : null;

  if (!rgb) {
    for (const [k, v] of Object.entries(DEFAULTS)) root.style.setProperty(k, v);
    return;
  }

  const [r, g, b] = rgb;
  root.style.setProperty('--teal-500', toHex(rgb));
  root.style.setProperty('--teal-400', toHex(shade(rgb, 0.22)));   // أفتح — للنصوص فوق الخلفيات الداكنة
  root.style.setProperty('--teal-600', toHex(shade(rgb, -0.12)));  // أغمق — للحدود والحالات المضغوطة
  root.style.setProperty('--accent-tint', `rgba(${r}, ${g}, ${b}, 0.1)`);
  root.style.setProperty('--accent-tint-2', `rgba(${r}, ${g}, ${b}, 0.15)`);
  root.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.3)`);
}
