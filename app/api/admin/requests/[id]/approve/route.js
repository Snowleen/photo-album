import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Approve: create a normal login with the given password, then remove the request.
// The new login is not in any space yet — add it from a space's "+ Add member → Existing login".
export async function POST(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { password = '' } = await readJson(req);
  if (String(password).length < 6) return fail('Password must be at least 6 characters');

  const { data: request } = await db().from('signup_requests').select('*').eq('id', params.id).maybeSingle();
  if (!request) return fail('This request no longer exists', 404);

  const { data: exists } = await db().from('users').select('id').eq('email', request.email).maybeSingle();
  if (exists) {
    await db().from('signup_requests').delete().eq('id', request.id);
    return fail('This email already has a login. The request has been removed.');
  }

  const { data: user, error } = await db()
    .from('users')
    .insert({ email: request.email, display_name: request.display_name, password_hash: await bcrypt.hash(String(password), 10) })
    .select('id, email, display_name')
    .single();
  if (error) return fail(error.message, 500);

  await db().from('signup_requests').delete().eq('id', request.id);
  return ok({ user });
}
