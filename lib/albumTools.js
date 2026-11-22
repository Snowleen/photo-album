'use client';
import { api, uploadPhoto } from './client';
import { createClient } from '@supabase/supabase-js';

const THEME = {
  couple: { a: '#f7a8c2', b: '#e0527f', ink: '#3b1d2a', soft: '#fde7ef' },
  family: { a: '#9fd4ff', b: '#2f8fe0', ink: '#19405f', soft: '#dff1ff' },
  pet: { a: '#ffd3a1', b: '#e0873a', ink: '#4a2f1a', soft: '#fff0dc' },
  individual: { a: '#c3c8ff', b: '#4f5bd5', ink: '#1f2333', soft: '#e8eaff' },
};

const safeName = (s) => (s || 'album').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80) || 'album';
const cleanName = (n) => (n || '').replace(/\.(jpe?g|png|heic|heif|webp|gif|bmp|tiff?|avif)$/i, '');

async function loadImg(src) {
  // go through a blob so the canvas is allowed to export the picture
  const res = await fetch(src);
  if (!res.ok) throw new Error('Could not load image');
  const url = URL.createObjectURL(await res.blob());
  const img = new Image();
  img.src = url;
  await img.decode();
  return { img, done: () => URL.revokeObjectURL(url) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

/**
 * Draws the 1200x630 link-preview picture (cover photo + album name) and uploads it,
 * so WhatsApp / Facebook show a nice card when the share link is sent.
 */
export async function makeSharePreview({ album, mode, coverUrl, crop, upload }) {
  if (!upload) return;
  const t = THEME[mode] || THEME.couple;
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.soft); g.addColorStop(1, t.a);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // cover photo card (4:3, same crop as the album card)
  const cw = 640, ch = 480, cx = 56, cy = (H - ch) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  roundRect(ctx, cx - 10, cy - 10, cw + 20, ch + 20, 34); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, cx, cy, cw, ch, 26); ctx.clip();
  if (coverUrl) {
    try {
      const { img, done } = await loadImg(coverUrl);
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let sx, sy, sw, sh;
      if (crop) { sx = crop.x * iw; sy = crop.y * ih; sw = crop.w * iw; sh = crop.h * ih; }
      else {
        const r = cw / ch;
        if (iw / ih > r) { sh = ih; sw = ih * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = iw / r; sx = 0; sy = (ih - sh) / 2; }
      }
      ctx.drawImage(img, sx, sy, sw, sh, cx, cy, cw, ch);
      done();
    } catch {
      ctx.fillStyle = t.soft; ctx.fillRect(cx, cy, cw, ch);
    }
  } else { ctx.fillStyle = t.soft; ctx.fillRect(cx, cy, cw, ch); }
  ctx.restore();

  // text column
  const tx = 740, tw = W - tx - 50;
  ctx.fillStyle = t.b;
  ctx.font = '700 30px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText('Click here to view photos in', tx, 190);
  ctx.fillStyle = t.ink;
  ctx.font = '700 62px Georgia, "Times New Roman", serif';
  const lines = wrap(ctx, album.name, tw, 3);
  lines.forEach((l, i) => ctx.fillText(l, tx, 265 + i * 72));
  const after = 265 + (lines.length - 1) * 72;
  ctx.fillStyle = t.ink; ctx.globalAlpha = 0.7;
  ctx.font = '500 28px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText(`${album.count} photo${album.count === 1 ? '' : 's'}`, tx, after + 60);
  ctx.globalAlpha = 1;

  // brand
  try {
    const { img, done } = await loadImg('/brand/memory-mark.png');
    ctx.save(); roundRect(ctx, tx, H - 120, 56, 56, 14); ctx.clip(); ctx.drawImage(img, tx, H - 120, 56, 56); ctx.restore();
    done();
  } catch {}
  ctx.fillStyle = '#e8578a';
  ctx.font = '800 32px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText('ME-mory', tx + 70, H - 82);

  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await sb.storage.from('photos').uploadToSignedUrl(upload.path, upload.token, blob, { contentType: 'image/jpeg', upsert: true });
}

function save(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif' };
const TYPE_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };

/** Saves the whole album as "<name> (ME-mory album).zip": photos + album.json (names, dates, notes, cover). */
export async function exportAlbumZip(album, photos, onProgress = () => {}) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const meta = { format: 'me-mory-album', version: 1, name: album.name, exported_at: new Date().toISOString(), cover: null, photos: [] };
  const used = new Set();
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    onProgress(i, photos.length);
    const res = await fetch(p.url);
    if (!res.ok) throw new Error(`Could not download “${cleanName(p.original_name)}”`);
    const blob = await res.blob();
    const ext = EXT_BY_TYPE[blob.type] || (p.original_name || '').split('.').pop() || 'jpg';
    let base = `${String(i + 1).padStart(3, '0')} ${safeName(cleanName(p.original_name) || 'photo')}`;
    while (used.has(base)) base += '_';
    used.add(base);
    const file = `photos/${base}.${ext}`;
    zip.file(file, blob, { binary: true });
    meta.photos.push({ file, name: cleanName(p.original_name) || null, capture_date: p.capture_date || null, remark: p.remark || null });
    if (album.cover_photo_id === p.id) meta.cover = { index: i, crop: album.cover_crop || null };
  }
  zip.file('album.json', JSON.stringify(meta, null, 2));
  onProgress(photos.length, photos.length, 'zip');
  const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' }); // photos are already compressed
  save(out, `${safeName(album.name)} (ME-mory album).zip`);
}

/**
 * Rebuilds an album from a .zip: either one exported by ME-mory (keeps names, dates,
 * notes and cover) or any zip of photos (album named after the zip file).
 */
export async function importAlbumZip(zipFile, onProgress = () => {}) {
  const { default: JSZip } = await import('jszip');
  let zip;
  try { zip = await JSZip.loadAsync(zipFile); } catch { throw new Error('That file is not a valid .zip'); }

  let meta = null;
  const metaFile = zip.file('album.json') || zip.file(/(^|\/)album\.json$/)[0];
  if (metaFile) {
    try { meta = JSON.parse(await metaFile.async('string')); } catch { meta = null; }
    if (meta?.format !== 'me-mory-album') meta = null;
  }
  const prefix = metaFile ? metaFile.name.replace(/album\.json$/, '') : '';
  const isImage = (n) => /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(n) && !/(^|\/)(__MACOSX|\.)/.test(n);
  const items = meta
    ? meta.photos.map((p) => ({ entry: zip.file(prefix + p.file), name: p.name, capture_date: p.capture_date, remark: p.remark })).filter((x) => x.entry)
    : Object.values(zip.files).filter((f) => !f.dir && isImage(f.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((entry) => ({ entry, name: cleanName(entry.name.split('/').pop()) }));
  if (!items.length) throw new Error('No photos found in this .zip');

  const name = (meta?.name || zipFile.name.replace(/\.zip$/i, '').replace(/\s*\(ME-mory album\)$/i, '') || 'Imported album').slice(0, 100);
  const { album } = await api('/api/albums', { method: 'POST', body: { name } });

  const ids = [];
  let failed = 0;
  for (let i = 0; i < items.length; i++) {
    onProgress(i, items.length);
    const it = items[i];
    try {
      const ext = (it.entry.name.split('.').pop() || 'jpg').toLowerCase();
      const blob = await it.entry.async('blob');
      const file = new File([blob], `${it.name || 'photo'}.${ext}`, { type: TYPE_BY_EXT[ext] || 'image/jpeg' });
      const { id } = await uploadPhoto(file, { capture_date: it.capture_date || null, remark: it.remark || null, album_id: album.id });
      // keep the photo's name exactly as it was (without the file ending)
      if (it.name) await api(`/api/photos/${id}`, { method: 'PATCH', body: { name: it.name } });
      ids[i] = id;
    } catch {
      failed++;
    }
  }
  onProgress(items.length, items.length);
  if (meta?.cover?.crop && ids[meta.cover.index]) {
    await api(`/api/albums/${album.id}`, {
      method: 'PATCH',
      body: { cover_photo_id: ids[meta.cover.index], cover_crop: meta.cover.crop },
    }).catch(() => {});
  }
  return { album, count: items.length - failed, failed };
}
