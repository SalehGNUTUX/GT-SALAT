import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ShellName } from './types.js';

const MARK_BEGIN = '# >>> GT-SALAT hook >>>';
const MARK_END = '# <<< GT-SALAT hook <<<';

interface ShellSpec {
  name: ShellName;
  rcPath: string;
  makeBlock: (showZikr: boolean, showSalat: boolean) => string;
}

function cliPath(): string {
  // سكربت صغير يشغّله shell-hook عند فتح الطرفية.
  return path.join(os.homedir(), '.gt-salat', 'terminal-hook.sh');
}

const SHELLS: ShellSpec[] = [
  {
    name: 'bash',
    rcPath: path.join(os.homedir(), '.bashrc'),
    makeBlock: (zikr, salat) => [
      MARK_BEGIN,
      '# هذا الكود يُضاف/يُزال تلقائياً من GT-SALAT (لا تعدّله يدوياً)',
      `[ -x "${cliPath()}" ] && "${cliPath()}" ${zikr ? '--zikr' : ''} ${salat ? '--salat' : ''}`.trim(),
      MARK_END,
      '',
    ].join('\n'),
  },
  {
    name: 'zsh',
    rcPath: path.join(os.homedir(), '.zshrc'),
    makeBlock: (zikr, salat) => [
      MARK_BEGIN,
      `[ -x "${cliPath()}" ] && "${cliPath()}" ${zikr ? '--zikr' : ''} ${salat ? '--salat' : ''}`.trim(),
      MARK_END,
      '',
    ].join('\n'),
  },
  {
    name: 'fish',
    rcPath: path.join(os.homedir(), '.config', 'fish', 'config.fish'),
    makeBlock: (zikr, salat) => [
      MARK_BEGIN,
      `if test -x "${cliPath()}"`,
      `    "${cliPath()}" ${zikr ? '--zikr' : ''} ${salat ? '--salat' : ''}`.trim(),
      'end',
      MARK_END,
      '',
    ].join('\n'),
  },
];

function ensureHookScript(showZikr: boolean, showSalat: boolean, azkarPath: string): void {
  const dir = path.dirname(cliPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const statusFile = path.join(os.homedir(), '.gt-salat', 'status');
  const sep = '═'.repeat(76);

  const script = `#!/usr/bin/env bash
# GT-SALAT terminal hook — يُستدعى من .bashrc/.zshrc عند فتح طرفية جديدة
# لا تعدّل هذا الملف يدوياً، فهو يُعاد إنشاؤه من الواجهة.

AZKAR_FILE="${azkarPath}"
STATUS_FILE="${statusFile}"

show_zikr=0
show_salat=0
for arg in "$@"; do
  case "$arg" in
    --zikr)  show_zikr=1 ;;
    --salat) show_salat=1 ;;
  esac
done

GOLD='\\033[1;33m'
CYAN='\\033[1;36m'
DIM='\\033[2m'
RESET='\\033[0m'

SEP="${sep}"

printf "\\n\${GOLD}\${SEP}\${RESET}\\n"
printf "\${GOLD}🕌 GT-SALAT 🕋 ﷽\${RESET}\\n"
printf "\${GOLD}\${SEP}\${RESET}\\n"

# ══════ الذكر ══════
if [ "\$show_zikr" = "1" ] && [ -f "\$AZKAR_FILE" ]; then
  count=\$(grep -c '^%$' "\$AZKAR_FILE" 2>/dev/null || echo 0)
  if [ "\$count" -gt 0 ]; then
    idx=\$(( RANDOM % count ))
    zikr=\$(awk -v i="\$idx" 'BEGIN{RS="\\n%\\n"; n=0} {if (n==i) {print; exit} n++}' "\$AZKAR_FILE" 2>/dev/null)
    if [ -n "\$zikr" ]; then
      printf "\${zikr}\\n"
      printf "\${GOLD}\${SEP}\${RESET}\\n"
    fi
  fi
fi

# ══════ الصلاة القادمة ══════
if [ "\$show_salat" = "1" ] && [ -f "\$STATUS_FILE" ] && [ -s "\$STATUS_FILE" ]; then
  . "\$STATUS_FILE" 2>/dev/null
  if [ -n "\${PRAYER_NAME:-}" ] && [ -n "\${PRAYER_TS:-}" ]; then
    now=\$(date +%s)
    diff=\$(( PRAYER_TS - now ))
    printf "\\n"
    if [ "\$diff" -gt 0 ]; then
      h=\$(( diff / 3600 ))
      m=\$(( (diff % 3600) / 60 ))
      remaining=\$(printf "%02d:%02d" "\$h" "\$m")
      printf "\${GOLD}🕌 الصلاة القادمة: \${PRAYER_NAME} عند \${PRAYER_TIME} (باقي \${remaining})\${RESET}\\n"
    else
      printf "\${GOLD}🕌 الصلاة القادمة: \${PRAYER_NAME} \${PRAYER_TIME}\${RESET}\\n"
    fi
  fi
fi

printf "\\n"
`;
  fs.writeFileSync(cliPath(), script, { mode: 0o755 });
}

function removeBlockFromFile(file: string): void {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf-8');
  const re = new RegExp(`\\n?${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`, 'g');
  const cleaned = content.replace(re, '');
  if (cleaned !== content) {
    fs.writeFileSync(file, cleaned, 'utf-8');
  }
}

function addBlockToFile(file: string, block: string): void {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  // إزالة أي block سابق
  const re = new RegExp(`\\n?${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`, 'g');
  content = content.replace(re, '');
  // إضافة في أعلى الملف
  content = content.replace(/^\n+/, '');
  fs.writeFileSync(file, block + '\n' + content, 'utf-8');
}

export function checkShellIntegration(): { shell: ShellName; exists: boolean }[] {
  return SHELLS.map((spec) => {
    if (!fs.existsSync(spec.rcPath)) return { shell: spec.name, exists: false };
    const content = fs.readFileSync(spec.rcPath, 'utf-8');
    return { shell: spec.name, exists: content.includes(MARK_BEGIN) };
  });
}

export interface ApplyOptions {
  enabledShells: ShellName[];
  showZikr: boolean;
  showSalat: boolean;
  azkarPath: string;
  settingsPath: string;
}

export function applyShellIntegration(opts: ApplyOptions): { shell: ShellName; ok: boolean; error?: string }[] {
  const results: { shell: ShellName; ok: boolean; error?: string }[] = [];

  try {
    ensureHookScript(opts.showZikr, opts.showSalat, opts.azkarPath);
  } catch (err: any) {
    return SHELLS.map((s) => ({ shell: s.name, ok: false, error: err?.message }));
  }

  for (const spec of SHELLS) {
    const enabled = opts.enabledShells.includes(spec.name);
    try {
      if (!enabled || (!opts.showZikr && !opts.showSalat)) {
        removeBlockFromFile(spec.rcPath);
        results.push({ shell: spec.name, ok: true });
      } else {
        const block = spec.makeBlock(opts.showZikr, opts.showSalat);
        addBlockToFile(spec.rcPath, block);
        results.push({ shell: spec.name, ok: true });
      }
    } catch (err: any) {
      results.push({ shell: spec.name, ok: false, error: err?.message });
    }
  }
  return results;
}

export function removeAllShellIntegration(): void {
  for (const spec of SHELLS) {
    try { removeBlockFromFile(spec.rcPath); } catch {}
  }
}

export function refreshHookScriptIfEnabled(azkarPath: string, settings: { terminalSalatNotify: boolean; terminalZikrNotify: boolean; terminalShells: string[] }): void {
  if (!settings.terminalSalatNotify && !settings.terminalZikrNotify) return;
  if (settings.terminalShells.length === 0) return;
  try { ensureHookScript(settings.terminalZikrNotify, settings.terminalSalatNotify, azkarPath); } catch {}
}

export function detectInstalledShells(): ShellName[] {
  const found: ShellName[] = [];
  for (const spec of SHELLS) {
    if (fs.existsSync(spec.rcPath) || (spec.name === 'bash' || spec.name === 'zsh')) {
      if (fs.existsSync(spec.rcPath)) found.push(spec.name);
    }
  }
  // bash دائماً متاح على لينكس
  if (!found.includes('bash')) found.push('bash');
  return found;
}
