import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const body = await readJson(req);
  const patch = {};
  if (body.display_name !== undefined) patch.display_name = String(body.display_name).trim();
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.password !== undefined) {
    if (String(body.password).length < 6) return fail('Password must be at least 6 characters');
    patch.password_hash = await bcrypt.hash(String(body.password), 10);
  }
  const { error } = await db().from('users').update(patch).eq('id', params.id);
  if (error) return fail(error.message, 500);
  return ok();
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { error } = await db().from('users').delete().eq('id', params.id);
  if (error) return fail(error.message, 500);
  return ok();
}
