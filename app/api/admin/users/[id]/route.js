import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson, EMAIL_RE, normEmail } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// PATCH { email?, password?, active? }
export async function PATCH(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const body = await readJson(req);
  const patch = {};
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.password !== undefined) {
    if (String(body.password).length < 6) return fail('Password must be at least 6 characters');
    patch.password_hash = await bcrypt.hash(String(body.password), 10);
  }
  if (body.email !== undefined) {
    const email = normEmail(body.email);
    if (!EMAIL_RE.test(email)) return fail('Please enter a valid email address');
    const { data: taken } = await db().from('users').select('id').eq('email', email).neq('id', params.id).maybeSingle();
    if (taken) return fail('Another login already uses this email');
    patch.email = email;
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
