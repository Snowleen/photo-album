import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { name = '' } = await readJson(req);
  if (!String(name).trim()) return fail('Album name is required');
  const { error } = await db()
    .from('albums')
    .update({ name: String(name).trim().slice(0, 100) })
    .eq('id', params.id)
    .eq('space_id', me.space_id);
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
