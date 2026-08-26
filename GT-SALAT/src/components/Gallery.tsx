import { useEffect, useState } from 'react';
import { galleryUrls } from '@electron/quran';
import { Button } from './common';

/**
 * معرضٌ مصوَّرٌ للدروس والمصحف: تصفّحٌ بالسهمين وشريطُ مصغّرات، وملءُ شاشةٍ بتكبير.
 * الصور موردٌ **محزَّمٌ مع التطبيق** يُقرأ عبر `gtsalat://res/…` — لا عبر `file://`
 * (يمنعه كروميوم من صفحةٍ على http في التطوير) ولا عبر Vite (الموارد خارج `src/`).
 *
 * **التكبير لا يبتلع التصفّح**: عجلة الفأرة تكبّر، والسحب يحرّك الصورة المكبَّرة،
 * والسهمان يبقيان عاملَين — وهو الخلل الذي أُصلح في نسخة الهاتف (v1.11).
 */
export function Gallery({ dir, count, title }: { dir: string; count: number; title?: string }) {
  const urls = galleryUrls(dir, count);
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);

  if (urls.length === 0) return null;

  const go = (d: number) => setI((v) => Math.min(urls.length - 1, Math.max(0, v + d)));

  return (
    <div style={{ marginTop: 12 }}>
      {title && <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 8 }}>{title}</div>}

      <div style={{ position: 'relative', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <img
          src={urls[i]}
          alt={`${title ?? 'صورة'} ${i + 1}`}
          onClick={() => setFull(true)}
          style={{ width: '100%', display: 'block', cursor: 'zoom-in', maxHeight: 480, objectFit: 'contain' }}
        />
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
          }}
        >
          <Button size="sm" variant="secondary" onClick={() => go(1)} disabled={i >= urls.length - 1}>
            ‹ التالية
          </Button>
          <span className="mono" style={{ fontSize: 12, color: '#fff' }}>
            {i + 1} / {urls.length}
          </span>
          <Button size="sm" variant="secondary" onClick={() => go(-1)} disabled={i <= 0}>
            السابقة ›
          </Button>
        </div>
      </div>

      {/* شريطُ مصغّراتٍ يُغني عن التنقّل خطوةً خطوة في المعارض الطويلة (25 صورة). */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8, paddingBottom: 4 }}>
        {urls.map((u, n) => (
          <img
            key={u}
            src={u}
            alt=""
            onClick={() => setI(n)}
            style={{
              width: 52,
              height: 52,
              objectFit: 'cover',
              borderRadius: 6,
              cursor: 'pointer',
              flexShrink: 0,
              border: n === i ? '2px solid var(--teal-500)' : '2px solid transparent',
              opacity: n === i ? 1 : 0.6,
            }}
          />
        ))}
      </div>

      {full && <Lightbox urls={urls} index={i} onIndex={setI} onClose={() => setFull(false)} />}
    </div>
  );
}

/** عارضٌ بملء الشاشة: تكبيرٌ بالعجلة، وتحريكٌ بالسحب، وتصفّحٌ بالسهمين مهما بلغ التكبير. */
function Lightbox({
  urls,
  index,
  onIndex,
  onClose,
}: {
  urls: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  // تبديلُ الصورة يعيد التكبير — وإلّا فُتحت الصورة التالية على تكبير سابقتها فتبدو مقطوعة.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // في RTL يبقى السهمان على معناهما المكانيّ: اليسار للتالية.
      if (e.key === 'ArrowLeft') onIndex(Math.min(urls.length - 1, index + 1));
      if (e.key === 'ArrowRight') onIndex(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, urls.length, onClose, onIndex]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 12 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={() => onIndex(Math.min(urls.length - 1, index + 1))} disabled={index >= urls.length - 1}>
            ‹ التالية
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onIndex(Math.max(0, index - 1))} disabled={index <= 0}>
            السابقة ›
          </Button>
        </div>
        <span className="mono" style={{ fontSize: 12, color: '#fff' }}>
          {index + 1} / {urls.length} — {Math.round(zoom * 100)}٪
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            ↺ حجمٌ أصليّ
          </Button>
          <Button size="sm" variant="danger" onClick={onClose}>✕ إغلاق</Button>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) =>
          setZoom((z) => {
            const next = Math.min(6, Math.max(1, z - Math.sign(e.deltaY) * 0.2));
            // العودة إلى الاحتواء تُصفّر الإزاحة، وإلّا بقيت الصفحة مُزاحةً وهي محتواةٌ أصلاً.
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
          })
        }
        onDoubleClick={() => setZoom((z) => { if (z > 1) { setPan({ x: 0, y: 0 }); return 1; } return 2.5; })}
        onMouseDown={(e) => setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })}
        onMouseMove={(e) => drag && setPan({ x: e.clientX - drag.x, y: e.clientY - drag.y })}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => setDrag(null)}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: zoom > 1 ? (drag ? 'grabbing' : 'grab') : 'zoom-in',
        }}
      >
        <img
          src={urls[index]}
          alt=""
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: drag ? 'none' : 'transform 0.12s',
          }}
        />
      </div>
    </div>
  );
}
