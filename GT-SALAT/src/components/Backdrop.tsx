import { useEffect, useState } from 'react';
import type { AppSettings } from '../hooks/useSettings';
import { backgroundUrl, CUSTOM_BG, resolveBackground, scrimAlpha } from '../utils/backgrounds';

/**
 * طبقة الخلفيّة خلف النافذة كلّها (الشريط الجانبيّ والمحتوى)، كما يرسمها الهاتف خلف الـScaffold.
 *
 * - في لوحة التحكّم: الصورة حادّة، والبطاقات زجاجٌ يموّه ما خلفه بقدر `glassBlur`.
 * - في بقيّة الأقسام (مع السمة الزجاجيّة): الصورة نفسها مموَّهة، كـ`BlurredBackdrop` في الهاتف.
 * - في القرآن: لا صورة (كما في القارئ والمصحف بالهاتف)، بل تدرّجٌ هادئ.
 * - بلا صورة والسمة الزجاجيّة مفعّلة: تدرّجٌ لونيّ يظهر الزجاج فوقه.
 */
export function Backdrop({ settings, mode }: { settings: AppSettings; mode: 'sharp' | 'blurred' | 'gradient' | 'none' }) {
  const dark = settings.theme !== 'light';
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const isCustom = settings.homeBackgroundId === CUSTOM_BG;

  useEffect(() => {
    if (!isCustom) { setCustomUrl(null); return; }
    window.gtSalat.background.customUrl().then(setCustomUrl);
  }, [isCustom, settings.customBackgroundStamp]);

  if (mode === 'none') return null;

  const layer: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' };

  if (mode === 'gradient') {
    return (
      <div
        style={{
          ...layer,
          background: dark
            ? 'radial-gradient(1200px 700px at 30% 10%, var(--accent-tint-2), transparent 60%), linear-gradient(160deg, #0b1a1f, #0f1117 50%, #17142a)'
            : 'radial-gradient(1200px 700px at 30% 10%, var(--accent-tint-2), transparent 60%), linear-gradient(160deg, #e6f4f6, #f7f9fc 50%, #eeeaf7)',
        }}
      />
    );
  }

  // صورة المستخدم المحذوفة تسقط إلى الافتراضيّة.
  const url = isCustom && customUrl ? customUrl : backgroundUrl(resolveBackground(isCustom ? 'hassan' : settings.homeBackgroundId, dark));
  const blurPx = mode === 'blurred' ? Math.max(6, settings.glassBlur * 0.32) : 0;
  const scrim = scrimAlpha(settings.homeBackgroundLevel, dark) + (mode === 'blurred' ? 0.08 : 0);
  const tint = dark ? '10, 12, 16' : '247, 249, 252';

  return (
    <div style={{ ...layer, overflow: 'hidden', background: dark ? '#0a0c10' : '#f7f9fc' }}>
      <div
        style={{
          position: 'absolute',
          // هامشٌ خارج الإطار حتى لا يظهر حدٌّ شفّافٌ عند التمويه.
          inset: blurPx ? -blurPx * 2 : 0,
          backgroundImage: `url("${url}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: blurPx ? `blur(${blurPx}px)` : undefined,
          transition: 'filter 0.3s',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(${tint}, ${scrim})` }} />
    </div>
  );
}
