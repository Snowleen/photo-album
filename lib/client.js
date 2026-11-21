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

/** Uploads one file and saves its details. */
export async function uploadPhoto(file, meta) {
  const { path, token } = await api('/api/photos/upload-url', {
    method: 'POST',
    body: { filename: file.name, type: file.type },
  });
  const { error } = await storage().uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  await api('/api/photos', {
    method: 'POST',
    body: { path, original_name: file.name, mime: file.type, ...meta },
  });
}

export const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function daysLeft(deletedAt) {
  const left = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 864e5);
  return Math.max(0, left);
}
