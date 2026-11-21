import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';

// PATCH { display_name?, current_password?, new_password? } -> user edits their own profile
export async function PATCH(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const body = await readJson(req);
  const patch = {};

  if (body.display_name !== undefined) {
    const n = String(body.display_name).trim();
    if (!n) return fail('Nickname cannot be empty');
    patch.display_name = n.slice(0, 40);
  }
  if (body.new_password !== undefined) {
    if (String(body.new_password).length < 8) return fail('New password must be at least 8 characters');
    const { data } = await db().from('users').select('password_hash').eq('id', me.id).single();
    if (!data?.password_hash || !(await bcrypt.compare(String(body.current_password || ''), data.password_hash))) {
      return fail('Current password is incorrect');
    }
    patch.password_hash = await bcrypt.hash(String(body.new_password), 10);
  }
  if (!Object.keys(patch).length) return ok();

  const { error } = await db().from('users').update(patch).eq('id', me.id);
  if (error) return fail(error.message, 500);
  return ok();
}
