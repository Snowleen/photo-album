'use client';
import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

export const COVER_RATIO = 4 / 3; // album cards show covers at 4:3

/**
 * Shows a cover photo cropped to the chosen area.
 * crop = { x, y, w, h } as fractions of the photo; without it the photo is centre-cropped.
 */
export function AlbumCover({ src, crop, alt = '' }) {
  if (!crop) return <img src={src} alt={alt} loading="lazy" />;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="cropped"
      style={{
        width: `${100 / crop.w}%`,
        height: `${100 / crop.h}%`,
        left: `${(-crop.x / crop.w) * 100}%`,
        top: `${(-crop.y / crop.h) * 100}%`,
      }}
    />
  );
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Drag to position, pinch / wheel / slider to zoom. Calls onDone({ x, y, w, h }).
 */
export default function CoverCropper({ src, initialCrop, albumName, onCancel, onDone, busy }) {
  const frameRef = useRef(null);
  const [nat, setNat] = useState(null);          // natural image size
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);           // 1 = photo just covers the frame
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left inside frame (px, <= 0)
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const ready = nat && frame.w > 0;

  // measure the frame (and re-measure on resize)
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseScale = ready ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
  const scale = baseScale * zoom;
  const dw = ready ? nat.w * scale : 0;
  const dh = ready ? nat.h * scale : 0;

  const clampPos = (p, w = dw, h = dh) => ({ x: clamp(p.x, frame.w - w, 0), y: clamp(p.y, frame.h - h, 0) });

  // initial position: restore the saved crop, or centre the photo
  const placed = useRef(false);
  useEffect(() => {
    if (!ready || placed.current) return;
    placed.current = true;
    if (initialCrop) {
      const w = frame.w / initialCrop.w;           // displayed width implied by the crop
      const z = clamp(w / (nat.w * baseScale), 1, 6);
      const W = nat.w * baseScale * z, H = nat.h * baseScale * z;
      setZoom(z);
      setPos(clampPos({ x: -initialCrop.x * W, y: -initialCrop.y * H }, W, H));
    } else {
      setPos({ x: (frame.w - dw) / 2, y: (frame.h - dh) / 2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // zoom while keeping a given point (frame coords) fixed
  function zoomTo(nextZoom, cx = frame.w / 2, cy = frame.h / 2) {
    const z = clamp(nextZoom, 1, 6);
    const W = nat.w * baseScale * z, H = nat.h * baseScale * z;
    const fx = (cx - pos.x) / dw, fy = (cy - pos.y) / dh; // point on the photo under the cursor
    setZoom(z);
    setPos(clampPos({ x: cx - fx * W, y: cy - fy * H }, W, H));
  }

  const local = (e) => {
    const r = frameRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function onPointerDown(e) {
    frameRef.current.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    const cur = local(e);
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo(pinch.current.zoom * (d / pinch.current.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1) {
      setPos((p) => clampPos({ x: p.x + (cur.x - prev.x), y: p.y + (cur.y - prev.y) }));
    }
  }
  function onPointerUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  function onWheel(e) {
    e.preventDefault();
    const p = local(e);
    zoomTo(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p.x, p.y);
  }
  // React's onWheel is passive, so attach a real listener to be able to preventDefault
  const wheelRef = useRef(onWheel);
  wheelRef.current = onWheel;
  useEffect(() => {
    const el = frameRef.current;
    const h = (e) => wheelRef.current(e);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  function done() {
    onDone({
      x: clamp(-pos.x / dw, 0, 1),
      y: clamp(-pos.y / dh, 0, 1),
      w: clamp(frame.w / dw, 0, 1),
      h: clamp(frame.h / dh, 0, 1),
    });
  }

  return (
    <Modal title="Choose the album cover" onClose={onCancel}>
      <div className="stack">
        <p className="muted small">
          Drag the photo to choose what shows on the <b>{albumName}</b> cover. Pinch, scroll or use the slider to zoom.
        </p>
        <div
          ref={frameRef}
          className="crop-frame"
          style={{ aspectRatio: String(COVER_RATIO) }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={ready ? { width: dw, height: dh, transform: `translate(${pos.x}px, ${pos.y}px)` } : { opacity: 0 }}
          />
          <div className="crop-grid" aria-hidden />
        </div>
        <label className="zoom-row">
          <span className="muted small">Zoom</span>
          <input type="range" min="1" max="6" step="0.01" value={zoom} onChange={(e) => zoomTo(Number(e.target.value))} disabled={!ready} />
        </label>
        <div className="row gap">
          <button className="btn grow" onClick={onCancel}>Cancel</button>
          <button className="btn primary grow" onClick={done} disabled={!ready || busy}>{busy ? 'Saving…' : 'Done'}</button>
        </div>
      </div>
    </Modal>
  );
}
