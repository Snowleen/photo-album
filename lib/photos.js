import { db, BUCKET, BIN_DAYS } from './db';

export async function removeFiles(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    await db().storage.from(BUCKET).remove(paths.slice(i, i + 100));
  }
}

/** Permanently deletes photos (files + rows) by id. */
export async function hardDelete(rows) {
  if (!rows.length) return;
  await removeFiles(rows.map((r) => r.storage_path));
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

/** Adds a temporary signed `url` to each row that has a storage_path. */
export async function withUrls(rows, key = 'storage_path', out = 'url') {
  const list = rows.filter((r) => r[key]);
  if (!list.length) return rows;
  const { data } = await db().storage.from(BUCKET).createSignedUrls(list.map((r) => r[key]), 60 * 60 * 6);
  const map = new Map((data || []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, [out]: r[key] ? map.get(r[key]) || null : null }));
}
