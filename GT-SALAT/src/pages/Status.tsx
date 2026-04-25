import { useEffect, useState } from 'react';
import { Card, SectionTitle, StatusDot, Button } from '../components/common';
import type { AppSettings } from '../hooks/useSettings';

interface Props {
  settings: AppSettings;
}

interface LogEntry {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  body: string;
}

export function StatusPage({ settings }: Props) {
  const [version, setVersion] = useState('');
  const [cachedMonths, setCachedMonths] = useState(0);
  const [dhikrCount, setDhikrCount] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [userDataPath, setUserDataPath] = useState('');

  useEffect(() => {
    window.gtSalat.app.version().then(setVersion);
    window.gtSalat.prayer.cachedMonths().then(setCachedMonths);
    window.gtSalat.dhikr.count().then(setDhikrCount);
    window.gtSalat.app.userDataDir().then(setUserDataPath);
    const loadLog = () => window.gtSalat.notify.log().then(setLog);
    loadLog();
    const t = setInterval(loadLog, 5000);
    return () => clearInterval(t);
  }, []);

  const items: { label: string; value: string; ok: boolean }[] = [
    { label: 'شريط المهام (Tray)', value: 'يعمل', ok: true },
    {
      label: 'إشعارات الصلاة',
      value: settings.enableSalatNotify ? 'مفعّلة' : 'معطّلة',
      ok: settings.enableSalatNotify,
    },
    {
      label: 'إشعارات الأذكار',
      value: settings.enableZikrNotify ? 'مفعّلة' : 'معطّلة',
      ok: settings.enableZikrNotify,
    },
    {
      label: 'وضع عدم الإزعاج',
      value: settings.doNotDisturb ? 'مفعّل' : 'غير مفعّل',
      ok: settings.doNotDisturb,
    },
    {
      label: 'تكامل الطرفية',
      value: settings.terminalSalatNotify || settings.terminalZikrNotify ? 'مفعّل' : 'معطّل',
      ok: true,
    },
    {
      label: 'الموقع الجغرافي',
      value: settings.city ? `${settings.city}، ${settings.country}` : 'غير محدد',
      ok: !!settings.city,
    },
    {
      label: 'طريقة الحساب',
      value: settings.methodName,
      ok: true,
    },
    {
      label: 'المواقيت المخزنة',
      value: `${cachedMonths} شهر محلياً`,
      ok: cachedMonths > 0,
    },
    {
      label: 'قاعدة الأذكار',
      value: `${dhikrCount} ذكر`,
      ok: dhikrCount > 0,
    },
  ];

  const typeLabel = (t: string) => {
    if (t === 'salat') return '🕌';
    if (t === 'zikr') return '🕊️';
    if (t === 'approaching') return '⏰';
    return '🔔';
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>الإصدار</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--teal-400)' }}>{version || '…'}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>GT-SALAT</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>مشتق من</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)' }}>GT-salat-dikr v3.2</div>
          <div style={{ fontSize: 12, color: 'var(--gold-500)', marginTop: 4 }}>الجيل الجديد — واجهة رسومية</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>حالة المكونات</SectionTitle>
        {items.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--bg-elevated)',
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--fg-primary)' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusDot ok={s.ok} />
              <span style={{ fontSize: 13, color: s.ok ? 'var(--fg-secondary)' : 'var(--color-warning)' }}>
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle
          action={
            <Button
              size="sm"
              onClick={async () => {
                await window.gtSalat.notify.clearLog();
                setLog([]);
              }}
            >
              مسح السجل
            </Button>
          }
        >
          📜 سجل الإشعارات
        </SectionTitle>
        {log.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', padding: '8px 0' }}>لا توجد إشعارات بعد.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {log.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '8px 12px',
                background: 'var(--bg-panel)',
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <span>{typeLabel(e.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{e.title}</div>
                <div style={{ color: 'var(--fg-secondary)', fontSize: 12 }}>{e.body}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                {new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>معلومات</SectionTitle>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 2.1 }}>
          <div>📂 مجلد البيانات: <code className="mono">{userDataPath}</code></div>
          <div>
            🌐 مستودع GT-SALAT:{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.gtSalat.app.openUrl('https://github.com/SalehGNUTUX/GT-SALAT');
              }}
              style={{ color: 'var(--gold-500)', cursor: 'pointer' }}
            >
              github.com/SalehGNUTUX/GT-SALAT
            </a>
          </div>
          <div>
            🌐 المستودع الأصلي (GT-salat-dikr):{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.gtSalat.app.openUrl('https://github.com/SalehGNUTUX/GT-salat-dikr');
              }}
              style={{ color: 'var(--teal-400)', cursor: 'pointer' }}
            >
              github.com/SalehGNUTUX/GT-salat-dikr
            </a>
          </div>
          <div>📜 الترخيص: GPL-3.0</div>
        </div>
      </Card>
    </div>
  );
}
