import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { hardDelete } from '@/lib/photos';

async function findPhoto(me, id) {
  const { data } = await db()
    .from('photos')
    .select('id, storage_path, deleted_at')
    .eq('id', id)
    .eq('space_id', me.space_id)
    .maybeSingle();
  return data;
}

// Edit details, move album, or restore from bin.
export async function PATCH(req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const photo = await findPhoto(me, params.id);
  if (!photo) return fail('Photo not found', 404);

  const body = await readJson(req);
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim().replace(/[\r\n\t]+/g, ' ');
    if (!name) return fail('Photo name cannot be empty');
    patch.original_name = name.slice(0, 120);
  }
  if (body.capture_date !== undefined) patch.capture_date = body.capture_date || null;
  if (body.remark !== undefined) patch.remark = body.remark ? String(body.remark).slice(0, 2000) : null;
  if (body.album_id !== undefined) {
    if (body.album_id) {
      const { data: al } = await db().from('albums').select('id').eq('id', body.album_id).eq('space_id', me.space_id).maybeSingle();
      if (!al) return fail('Album not found');
    }
    patch.album_id = body.album_id || null;
  }
  if (body.restore) patch.deleted_at = null;

  const { error } = await db().from('photos').update(patch).eq('id', photo.id);
  if (error) return fail(error.message, 500);
  return ok();
}

// DELETE            -> move to recycle bin
// DELETE ?force=1   -> delete forever
export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const photo = await findPhoto(me, params.id);
  if (!photo) return fail('Photo not found', 404);

  if (new URL(req.url).searchParams.get('force')) {
    await hardDelete([photo]);
  } else {
    await db().from('photos').update({ deleted_at: new Date().toISOString() }).eq('id', photo.id);
  }
  return ok();
}
