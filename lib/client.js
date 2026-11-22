'use client';
import { createClient } from '@supabase/supabase-js';

export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}

let sb;
function storage() {
  if (!sb) {
    sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return sb.storage.from('photos');
}

const MAX_SIDE = 2560;   // longest side of the stored photo (still sharp on any phone)
const THUMB_SIDE = 480;  // longest side of the grid preview
const SHRINK_OVER = 1.5 * 1024 * 1024; // re-save photos bigger than 1.5 MB even if small in pixels

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, done: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read image')); };
    img.src = url;
  });
}

function drawJpeg(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height); // browsers apply the photo's rotation (EXIF) here
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Makes big phone photos smaller before upload (max 2560px, JPEG) and creates a
 * small preview for the grid. If the browser can't read the format (e.g. some HEIC),
 * the original file is uploaded unchanged without a preview.
 */
export async function preparePhoto(file) {
  let loaded;
  try { loaded = await loadImage(file); } catch { return { main: file, type: file.type, name: file.name, thumb: null }; }
  const { img, done } = loaded;
  try {
    let main = file;
    let type = file.type;
    const big = Math.max(img.naturalWidth, img.naturalHeight) > MAX_SIDE || file.size > SHRINK_OVER;
    if (big && file.type !== 'image/gif') {
      const blob = await drawJpeg(img, MAX_SIDE, 0.85);
      if (blob && blob.size < file.size) { main = blob; type = 'image/jpeg'; }
    }
    const thumb = await drawJpeg(img, THUMB_SIDE, 0.78);
    const name = type === 'image/jpeg' && file.type !== 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;
    return { main, type, name, thumb };
  } finally {
    done();
  }
}

/** Uploads one file (shrunk if large, plus a preview) and saves its details. */
export async function uploadPhoto(file, meta) {
  const { main, type, name, thumb } = await preparePhoto(file);
  const up = await api('/api/photos/upload-url', {
    method: 'POST',
    body: { filename: name, type, thumb: !!thumb },
  });
  const uploads = [storage().uploadToSignedUrl(up.path, up.token, main, { contentType: type })];
  if (thumb && up.thumb_token) uploads.push(storage().uploadToSignedUrl(up.thumb_path, up.thumb_token, thumb, { contentType: 'image/jpeg' }));
  const [res] = await Promise.all(uploads); // a failed preview is fine — the full photo is used instead
  if (res.error) throw new Error(res.error.message);
  await api('/api/photos', {
    method: 'POST',
    body: { path: up.path, original_name: file.name, mime: type, ...meta },
  });
}

export const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function daysLeft(deletedAt) {
  const left = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 864e5);
  return Math.max(0, left);
}
