import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { hardDelete } from '@/lib/photos';

// body: { action: 'delete' | 'restore' | 'purge' | 'move' | 'emptyBin', ids: [], album_id }
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { action, ids = [], album_id } = await readJson(req);

  let q = db().from('photos').select('id, storage_path, deleted_at').eq('space_id', me.space_id);
  if (action === 'emptyBin') q = q.not('deleted_at', 'is', null);
  else {
    if (!Array.isArray(ids) || !ids.length) return fail('Nothing selected');
    q = q.in('id', ids.slice(0, 1000));
  }
  const { data: rows } = await q;
  const own = (rows || []).map((r) => r.id);
  if (!own.length) return ok();

  const now = new Date().toISOString();
  if (action === 'delete') await db().from('photos').update({ deleted_at: now }).in('id', own);
  else if (action === 'restore') await db().from('photos').update({ deleted_at: null }).in('id', own);
  else if (action === 'purge' || action === 'emptyBin') await hardDelete(rows);
  else if (action === 'move') {
    if (album_id) {
      const { data: al } = await db().from('albums').select('id').eq('id', album_id).eq('space_id', me.space_id).maybeSingle();
      if (!al) return fail('Album not found');
    }
    await db().from('photos').update({ album_id: album_id || null }).in('id', own);
  } else return fail('Unknown action');

  return ok();
}
