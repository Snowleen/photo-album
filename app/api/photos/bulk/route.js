import { db, ok, fail, readJson, BUCKET } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { hardDelete, thumbPathFor } from '@/lib/photos';

const MAX_COPY = 40; // per request (the app sends bigger selections in batches)

/** Returns the target album id: an existing album in this space, or a newly created one. */
async function targetAlbum(me, album_id, new_album_name) {
  if (new_album_name !== undefined && new_album_name !== null) {
    const name = String(new_album_name).trim().slice(0, 100);
    if (!name) throw new Error('Album name is required');
    const { data, error } = await db().from('albums').insert({ space_id: me.space_id, name, created_by: me.id }).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  }
  if (!album_id) return null;
  const { data: al } = await db().from('albums').select('id').eq('id', album_id).eq('space_id', me.space_id).maybeSingle();
  if (!al) throw new Error('Album not found');
  return al.id;
}

/** Copies one photo (file + preview) into a new, independent photo. */
async function copyPhoto(me, p, albumId) {
  const bucket = db().storage.from(BUCKET);
  const ext = (p.storage_path.split('.').pop() || 'jpg').toLowerCase();
  const newPath = `${me.space_id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await bucket.copy(p.storage_path, newPath);
  if (error) throw new Error(error.message);
  await bucket.copy(thumbPathFor(p.storage_path), thumbPathFor(newPath)).catch(() => {}); // older photos may have no preview
  const { error: e2 } = await db().from('photos').insert({
    space_id: me.space_id,
    uploaded_by: p.uploaded_by,
    album_id: albumId,
    storage_path: newPath,
    original_name: p.original_name,
    mime: p.mime,
    capture_date: p.capture_date,
    remark: p.remark,
  });
  if (e2) throw new Error(e2.message);
}

// body: { action: 'delete' | 'restore' | 'purge' | 'move' | 'copy' | 'emptyBin', ids: [], album_id, new_album_name }
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { action, ids = [], album_id, new_album_name } = await readJson(req);

  let q = db()
    .from('photos')
    .select('id, storage_path, deleted_at, uploaded_by, original_name, mime, capture_date, remark')
    .eq('space_id', me.space_id);
  if (action === 'emptyBin') q = q.not('deleted_at', 'is', null);
  else {
    if (!Array.isArray(ids) || !ids.length) return fail('Nothing selected');
    q = q.in('id', ids.slice(0, 1000));
  }
  const { data: rows } = await q;
  const own = (rows || []).map((r) => r.id);
  if (!own.length) return ok();

  const now = new Date().toISOString();
  try {
    if (action === 'delete') await db().from('photos').update({ deleted_at: now }).in('id', own);
    else if (action === 'restore') await db().from('photos').update({ deleted_at: null }).in('id', own);
    else if (action === 'purge' || action === 'emptyBin') await hardDelete(rows);
    else if (action === 'move') {
      const target = await targetAlbum(me, album_id, new_album_name);
      await db().from('photos').update({ album_id: target }).in('id', own);
      return ok({ album_id: target });
    } else if (action === 'copy') {
      const list = rows.filter((r) => !r.deleted_at);
      if (list.length > MAX_COPY) return fail(`Copy at most ${MAX_COPY} photos at a time`);
      const target = await targetAlbum(me, album_id, new_album_name);
      if (!target) return fail('Choose an album to copy to');
      // copy a few at a time so big selections stay quick
      for (let i = 0; i < list.length; i += 6) {
        await Promise.all(list.slice(i, i + 6).map((p) => copyPhoto(me, p, target)));
      }
      return ok({ album_id: target, copied: list.length });
    } else return fail('Unknown action');
  } catch (e) {
    return fail(e.message || 'Something went wrong', 400);
  }
  return ok();
}
