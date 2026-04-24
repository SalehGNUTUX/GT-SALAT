import { useEffect, useState } from 'react';
import { Button } from '../components/common';
import appIcon from '@/assets/icons/app-icon.png';

interface Props {
  onDone: () => void;
}

export function WelcomePage({ onDone }: Props) {
  const [step, setStep] = useState<'hello' | 'location' | 'method' | 'notify' | 'terminal' | 'done'>('hello');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [methods, setMethods] = useState<{ id: number; nameAr: string }[]>([]);
  const [methodId, setMethodId] = useState(3);
  const [enableSalat, setEnableSalat] = useState(true);
  const [enableZikr, setEnableZikr] = useState(true);
  const [enableTerminal, setEnableTerminal] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    window.gtSalat.prayer.methods().then(setMethods);
  }, []);

  const detect = async () => {
    setDetecting(true);
    try {
      const loc = await window.gtSalat.prayer.autoDetect();
      if (loc) {
        setLat(loc.lat);
        setLon(loc.lon);
        setCity(loc.city);
        setCountry(loc.country);
        if (loc.suggestedMethodId) setMethodId(loc.suggestedMethodId);
      }
    } finally {
      setDetecting(false);
    }
  };

  const finish = async () => {
    const method = methods.find((m) => m.id === methodId);
    await window.gtSalat.settings.set({
      lat,
      lon,
      city,
      country,
      methodId,
      methodName: method?.nameAr ?? '',
      enableSalatNotify: enableSalat,
      enableZikrNotify: enableZikr,
      terminalSalatNotify: enableTerminal,
      terminalZikrNotify: enableTerminal,
      setupCompleted: true,
    });
    if (enableTerminal) {
      const shells = await window.gtSalat.shell.detect();
      await window.gtSalat.settings.set({ terminalShells: shells });
      await window.gtSalat.shell.apply({
        enabledShells: shells,
        showZikr: true,
        showSalat: true,
      });
    }
    await window.gtSalat.autostart.set(true);
    await window.gtSalat.prayer.prefetch();
    onDone();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background:
          'radial-gradient(ellipse at top, rgba(245,197,24,0.05), transparent 50%), var(--bg-base)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 38,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img src={appIcon} style={{ width: 56, height: 56 }} alt="GT-SALAT" />
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal-400)' }}>GT-SALAT</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>معالج الترحيب — إعداد أولي</div>
          </div>
        </div>

        {step === 'hello' && (
          <>
            <p className="dhikr-text" style={{ fontSize: 18, color: 'var(--fg-primary)', marginBottom: 14 }}>
              بسم الله الرحمن الرحيم
            </p>
            <p style={{ fontSize: 14, color: 'var(--fg-secondary)', marginBottom: 18, lineHeight: 2 }}>
              مرحباً بك في <b style={{ color: 'var(--gold-500)' }}>GT-SALAT</b> — الجيل الجديد من
              GT-salat-dikr، نسخة ذات واجهة رسومية حديثة لتذكير الصلاة وعرض الأذكار على لينكس.
              <br />
              سنكمل الإعداد في خطوات قليلة.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" size="lg" onClick={() => setStep('location')}>
                ابدأ الإعداد ←
              </Button>
            </div>
          </>
        )}

        {step === 'location' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📍 الموقع الجغرافي</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18 }}>
              نحتاج موقعك لحساب مواقيت الصلاة بدقة.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" style={welcomeInput} />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الدولة" style={welcomeInput} />
              <input
                type="number"
                step="0.0001"
                value={lat ?? ''}
                onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="خط العرض"
                style={welcomeInput}
              />
              <input
                type="number"
                step="0.0001"
                value={lon ?? ''}
                onChange={(e) => setLon(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="خط الطول"
                style={welcomeInput}
              />
            </div>
            <Button variant="secondary" onClick={detect} disabled={detecting}>
              {detecting ? '🔎 جاري الاكتشاف…' : '🌍 اكتشف الموقع تلقائياً'}
            </Button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button onClick={() => setStep('hello')}>→ رجوع</Button>
              <Button variant="primary" onClick={() => setStep('method')} disabled={lat == null || lon == null}>
                التالي ←
              </Button>
            </div>
          </>
        )}

        {step === 'method' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📐 طريقة الحساب</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18 }}>
              اختر الطريقة المعتمدة في بلدك أو منطقتك.
            </p>
            <select value={methodId} onChange={(e) => setMethodId(parseInt(e.target.value, 10))} style={welcomeInput}>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameAr}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button onClick={() => setStep('location')}>→ رجوع</Button>
              <Button variant="primary" onClick={() => setStep('notify')}>
                التالي ←
              </Button>
            </div>
          </>
        )}

        {step === 'notify' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🔔 الإشعارات</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18 }}>
              سيتم إرسال إشعارات نظام عبر libnotify + صوت أذان.
            </p>
            <label style={checkLabel}>
              <input type="checkbox" checked={enableSalat} onChange={(e) => setEnableSalat(e.target.checked)} />
              <span>تنبيهات الصلاة (مع صوت الأذان)</span>
            </label>
            <label style={checkLabel}>
              <input type="checkbox" checked={enableZikr} onChange={(e) => setEnableZikr(e.target.checked)} />
              <span>أذكار دورية خلال اليوم</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button onClick={() => setStep('method')}>→ رجوع</Button>
              <Button variant="primary" onClick={() => setStep('terminal')}>
                التالي ←
              </Button>
            </div>
          </>
        )}

        {step === 'terminal' && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>💻 تكامل الطرفية (اختياري)</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18, lineHeight: 1.9 }}>
              تستطيع أيضاً عرض ذكر وموعد الصلاة القادمة كلّما فتحت طرفية جديدة (مثل النسخة الأصلية).
              مُعطّل افتراضياً — يمكنك تفعيله الآن أو لاحقاً من الإعدادات.
            </p>
            <label style={checkLabel}>
              <input type="checkbox" checked={enableTerminal} onChange={(e) => setEnableTerminal(e.target.checked)} />
              <span>تفعيل تكامل الطرفية لجميع الصدفات المتاحة (bash / zsh / fish)</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button onClick={() => setStep('notify')}>→ رجوع</Button>
              <Button variant="primary" size="lg" onClick={finish}>
                ✓ إنهاء الإعداد وبدء الاستخدام
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const welcomeInput: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--fg-primary)',
  direction: 'rtl',
  fontFamily: 'inherit',
};

const checkLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: 'var(--bg-panel)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 10,
  cursor: 'pointer',
  fontSize: 14,
};
