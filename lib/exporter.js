'use client';
import { fmtDate } from './client';

async function loadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download photo');
  const blobUrl = URL.createObjectURL(await res.blob());
  const img = new Image();
  img.src = blobUrl;
  await img.decode();
  return { img, done: () => URL.revokeObjectURL(blobUrl) };
}

function toCanvas(img, maxSide = Infinity, whiteBg = false) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d');
  if (whiteBg) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function save(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const baseName = (p) => (p.original_name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '_') || 'photo';

/** Save a single photo as PNG or JPG. */
export async function exportImage(photo, fmt) {
  const { img, done } = await loadImage(photo.url);
  const canvas = toCanvas(img, Infinity, fmt === 'jpg');
  done();
  const blob = await new Promise((r) => canvas.toBlob(r, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.95));
  save(blob, `${baseName(photo)}.${fmt}`);
}

/** Save one or more photos into a single PDF, one photo per page with its details. */
export async function exportPdf(photos, title = 'photos') {
  const { jsPDF } = await import('jspdf');
  let doc;
  for (const p of photos) {
    const { img, done } = await loadImage(p.url);
    const canvas = toCanvas(img, 2400, true);
    done();
    const landscape = canvas.width > canvas.height;
    if (!doc) doc = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'mm', format: 'a4' });
    else doc.addPage('a4', landscape ? 'l' : 'p');

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 10;
    const captionH = 22;
    const scale = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m - captionH) / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', (pw - w) / 2, m, w, h);

    let y = m + h + 7;
    doc.setFontSize(10);
    doc.setTextColor(90);
    const line = [
      p.capture_date ? `Captured: ${fmtDate(p.capture_date)}` : null,
      `Uploaded: ${fmtDate(p.uploaded_at)}`,
    ].filter(Boolean).join('    ');
    doc.text(line, m, y);
    if (p.remark) {
      y += 5;
      doc.setTextColor(40);
      doc.text(doc.splitTextToSize(p.remark, pw - 2 * m).slice(0, 2), m, y);
    }
  }
  const name = photos.length === 1 ? baseName(photos[0]) : title.replace(/[^\w\- ]+/g, '_');
  save(doc.output('blob'), `${name}.pdf`);
}
