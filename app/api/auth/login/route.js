import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson } from '@/lib/db';
import { createSession, isSuperadminName } from '@/lib/auth';

export async function POST(req) {
  const { username = '', password = '' } = await readJson(req);
  const name = String(username).trim();
  if (!name || !password) return fail('Please enter username and password');

  if (isSuperadminName(name)) {
    if (password === process.env.SUPERADMIN_PASSWORD) {
      await createSession({ role: 'superadmin' });
      return ok({ role: 'superadmin' });
    }
    return fail('Invalid username or password', 401);
  }

  const { data: user } = await db()
    .from('users')
    .select('id, password_hash, active')
    .eq('username', name.toLowerCase())
    .maybeSingle();
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return fail('Invalid username or password', 401);
  }
  if (!user.active) return fail('This account has been disabled', 403);

  await createSession({ role: 'user', uid: user.id });
  return ok({ role: 'user' });
}
