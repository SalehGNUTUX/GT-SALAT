/**
 * نصّ المشاركة: المحتوى المنسوخ + مصدره + تعريفٌ بالتطبيق ورابطَي النسختين.
 *
 * كلّ نسخةٍ من التطبيق تحمل معها تعريفاً به — فحين يشارك المستخدم ذكراً أو آيةً
 * يصل من يقرؤها إلى مصدرها وإلى التطبيق نفسه، لسطح المكتب أو للهاتف.
 */

export const SITE_URL = 'https://salehgnutux.github.io/GT-SALAT/';
export const PHONE_SITE_URL = 'https://salehgnutux.github.io/GT-SALAT-PHONE/';

const SIGNATURE = [
  '📿 من تطبيق GT-SALAT — مواقيت الصلاة والأذكار والقرآن على غنو/لينكس',
  `🖥️ نسخة سطح المكتب: ${SITE_URL}`,
  `📱 نسخة أندرويد: ${PHONE_SITE_URL}`,
].join('\n');

/**
 * يبني النصّ المنسوخ: المتن، ثم المصدر إن وُجد، ثم التوقيع — يفصل بينها سطرٌ فارغ.
 * تُنظَّف المسافات الزائدة كي لا تُنقل فراغات التنسيق من الواجهة.
 */
export function buildShareText(text: string, source?: string): string {
  const body = (text || '').replace(/[ \t]+/g, ' ').trim();
  const parts = [body];
  if (source && source.trim()) parts.push(`— ${source.trim()}`);
  parts.push(SIGNATURE);
  return parts.join('\n\n');
}

/** ينسخ النصّ مع توقيعه إلى الحافظة عبر العملية الرئيسية (أضمن من واجهة الويب في Electron). */
export async function copyWithSignature(text: string, source?: string): Promise<boolean> {
  return window.gtSalat.app.copy(buildShareText(text, source));
}
