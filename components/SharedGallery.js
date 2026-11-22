'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon, ArrowLeftIcon } from './Icons';

const fmt = (d) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const cleanName = (n) => (n || '').replace(/\.(jpe?g|png|heic|heif|webp|gif|bmp|tiff?|avif)$/i, '');

/** Masonry grid of previews + full-screen viewer with swipe / arrow keys. */
export default function SharedGallery({ photos }) {
  const [open, setOpen] = useState(null); // index
  const touch = useRef(null);

  const go = useCallback((d) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, go]);

  const p = open !== null ? photos[open] : null;

  return (
    <>
      <div className="shared-grid">
        {photos.map((ph, i) => (
          <button key={ph.id} className="shared-tile" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={ph.thumb || ph.url} alt={ph.remark || cleanName(ph.original_name)} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>

      {p && (
        <div
          className="viewer"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          <div className="viewer-top">
            <span>{open + 1} / {photos.length}</span>
            <button className="viewer-btn" onClick={() => setOpen(null)} aria-label="Close"><CloseIcon size={22} /></button>
          </div>
          <img key={p.id} className="viewer-img" src={p.url} alt={p.remark || cleanName(p.original_name)} />
          {photos.length > 1 && (
            <>
              <button className="viewer-nav prev" onClick={() => go(-1)} aria-label="Previous"><ArrowLeftIcon size={24} /></button>
              <button className="viewer-nav next" onClick={() => go(1)} aria-label="Next"><ArrowLeftIcon size={24} /></button>
            </>
          )}
          {(p.capture_date || p.remark || p.original_name) && (
            <div className="viewer-caption">
              <strong>{cleanName(p.original_name)}</strong>
              {p.capture_date && <span>{fmt(p.capture_date)}</span>}
              {p.remark && <p>{p.remark}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
