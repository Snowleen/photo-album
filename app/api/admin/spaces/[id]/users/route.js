import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson, MODE_LIMITS } from '@/lib/db';
import { requireAdmin, isSuperadminName } from '@/lib/auth';

export async function POST(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { username = '', password = '', display_name = '' } = await readJson(req);
  const uname = String(username).trim().toLowerCase();

  if (!/^[a-z0-9._-]{3,32}$/.test(uname)) return fail('Username: 3-32 characters, letters/numbers/._- only');
  if (isSuperadminName(uname)) return fail('That username is reserved');
  if (String(password).length < 6) return fail('Password must be at least 6 characters');

  const { data: space } = await db().from('spaces').select('id, mode').eq('id', params.id).maybeSingle();
  if (!space) return fail('Space not found', 404);

  const { count } = await db().from('users').select('id', { count: 'exact', head: true }).eq('space_id', space.id);
  const limit = MODE_LIMITS[space.mode];
  if ((count || 0) >= limit) return fail(`${space.mode} mode allows maximum ${limit} user${limit > 1 ? 's' : ''}`);

  const { data: exists } = await db().from('users').select('id').eq('username', uname).maybeSingle();
  if (exists) return fail('Username already taken');

  const { error } = await db().from('users').insert({
    space_id: space.id,
    username: uname,
    display_name: String(display_name).trim() || uname,
    password_hash: await bcrypt.hash(String(password), 10),
  });
  if (error) return fail(error.message, 500);
  return ok();
}
