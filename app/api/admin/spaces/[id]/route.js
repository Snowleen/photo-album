import { db, ok, fail, readJson, MODES, MODE_LIMITS } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { removeFiles, filesFor } from '@/lib/photos';

export async function PATCH(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const body = await readJson(req);
  const patch = {};
  if (body.name !== undefined) {
    if (!String(body.name).trim()) return fail('Name cannot be empty');
    patch.name = String(body.name).trim();
  }
  if (body.mode !== undefined) {
    if (!MODES.includes(body.mode)) return fail('Invalid mode');
    const { count } = await db().from('memberships').select('user_id', { count: 'exact', head: true }).eq('space_id', params.id);
    if ((count || 0) > MODE_LIMITS[body.mode]) {
      return fail(`This space has ${count} users. ${body.mode} mode allows only ${MODE_LIMITS[body.mode]}. Remove users first.`);
    }
    patch.mode = body.mode;
  }
  const { error } = await db().from('spaces').update(patch).eq('id', params.id);
  if (error) return fail(error.message, 500);
  return ok();
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { data: photos } = await db().from('photos').select('storage_path').eq('space_id', params.id);
  await removeFiles(filesFor(photos || []));
  const { data: shareFiles } = await db().storage.from('photos').list(`${params.id}/share`);
  if (shareFiles?.length) await removeFiles(shareFiles.map((f) => `${params.id}/share/${f.name}`));
  const { error } = await db().from('spaces').delete().eq('id', params.id);
  if (error) return fail(error.message, 500);
  return ok();
}
