import { db, BUCKET, BIN_DAYS } from './db';

const SIGNED_URL_SECONDS = 60 * 60 * 6;

/**
 * Small preview image stored next to each photo:
 *   <space>/<uuid>.jpg  ->  <space>/thumbs/<uuid>.jpg
 * Older photos may not have one; callers fall back to the full photo.
 */
export function thumbPathFor(path) {
  const m = /^([^/]+)\/([^/]+?)(\.[a-z0-9]+)?$/i.exec(path || '');
  return m ? `${m[1]}/thumbs/${m[2]}.jpg` : null;
}

export async function removeFiles(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    await db().storage.from(BUCKET).remove(paths.slice(i, i + 100));
  }
}

/** Photo files plus their thumbnails. */
export const filesFor = (rows) => rows.flatMap((r) => [r.storage_path, thumbPathFor(r.storage_path)].filter(Boolean));

/** Permanently deletes photos (files + thumbnails + rows) by id. */
export async function hardDelete(rows) {
  if (!rows.length) return;
  await removeFiles(filesFor(rows));
  await db().from('photos').delete().in('id', rows.map((r) => r.id));
}

/** Permanently deletes anything that has been in the recycle bin for 30+ days. */
export async function purgeExpired(spaceId) {
  const cutoff = new Date(Date.now() - BIN_DAYS * 864e5).toISOString();
  let q = db().from('photos').select('id, storage_path').not('deleted_at', 'is', null).lt('deleted_at', cutoff);
  if (spaceId) q = q.eq('space_id', spaceId);
  const { data } = await q;
  await hardDelete(data || []);
  return (data || []).length;
}

async function signMany(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await db().storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  return new Map((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/** Adds a temporary signed `url` to each row that has a storage_path. */
export async function withUrls(rows, key = 'storage_path', out = 'url') {
  const map = await signMany(rows.map((r) => r[key]));
  return rows.map((r) => ({ ...r, [out]: r[key] ? map.get(r[key]) || null : null }));
}

/**
 * Adds `url` (full photo) and `thumb` (small preview, or the full photo if there is
 * no thumbnail yet). Both are signed in one request.
 */
export async function withPhotoUrls(rows, key = 'storage_path', out = 'url', thumbOut = 'thumb') {
  const map = await signMany(rows.flatMap((r) => [r[key], thumbPathFor(r[key])]));
  return rows.map((r) => {
    const full = r[key] ? map.get(r[key]) || null : null;
    return { ...r, [out]: full, [thumbOut]: map.get(thumbPathFor(r[key])) || full };
  });
}
