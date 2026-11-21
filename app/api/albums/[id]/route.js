import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const num01 = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -0.001 && v <= 1.001;

// PATCH { name }                          -> rename
// PATCH { cover_photo_id, cover_crop }    -> set the cover (photo must be in this album)
// PATCH { cover_photo_id: null }          -> back to the automatic cover (newest photo)
export async function PATCH(req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const body = await readJson(req);

  const { data: album } = await db().from('albums').select('id').eq('id', params.id).eq('space_id', me.space_id).maybeSingle();
  if (!album) return fail('Album not found', 404);

  const patch = {};
  if (body.name !== undefined) {
    if (!String(body.name).trim()) return fail('Album name is required');
    patch.name = String(body.name).trim().slice(0, 100);
  }
  if (body.cover_photo_id !== undefined) {
    if (body.cover_photo_id === null) {
      patch.cover_photo_id = null;
      patch.cover_crop = null;
    } else {
      const { data: photo } = await db()
        .from('photos')
        .select('id')
        .eq('id', body.cover_photo_id)
        .eq('album_id', album.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (!photo) return fail('That photo is not in this album');
      const c = body.cover_crop;
      if (!c || ![c.x, c.y, c.w, c.h].every(num01) || c.w <= 0 || c.h <= 0) return fail('Invalid cover area');
      patch.cover_photo_id = photo.id;
      patch.cover_crop = { x: c.x, y: c.y, w: c.w, h: c.h };
    }
  }
  if (!Object.keys(patch).length) return ok();

  const { error } = await db().from('albums').update(patch).eq('id', album.id);
  if (error) return fail(error.message, 500);
  return ok();
}

// Deleting an album keeps its photos (they just become "no album").
export async function DELETE(_req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { error } = await db().from('albums').delete().eq('id', params.id).eq('space_id', me.space_id);
  if (error) return fail(error.message, 500);
  return ok();
}
