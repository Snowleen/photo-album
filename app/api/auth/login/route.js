import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson, missingEnv, normEmail } from '@/lib/db';
import { createSession, isSuperadminName } from '@/lib/auth';

export async function POST(req) {
  const missing = missingEnv();
  if (missing.length) {
    return fail(
      `Server setup incomplete — missing: ${missing.join(', ')}. Add them in Vercel (Settings, Environment Variables), then redeploy.`,
      500
    );
  }

  try {
    const { email = '', password = '' } = await readJson(req);
    const id = String(email).trim();
    if (!id || !password) return fail('Please enter your email and password');

    // The superadmin keeps signing in with the fixed username.
    if (isSuperadminName(id)) {
      if (password === process.env.SUPERADMIN_PASSWORD) {
        await createSession({ role: 'superadmin' });
        return ok({ role: 'superadmin' });
      }
      return fail('Invalid email or password', 401);
    }

    const { data: user, error } = await db()
      .from('users')
      .select('id, password_hash, active')
      .eq('email', normEmail(id))
      .maybeSingle();
    if (error) return fail(`Database error: ${error.message}`, 500);
    if (user && !user.password_hash) {
      return fail('This account has no password yet. Please ask your administrator.', 403);
    }
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return fail('Invalid email or password', 401);
    }
    if (!user.active) return fail('This account has been disabled', 403);

    const { count } = await db()
      .from('memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (!count) return fail('Your account has not been added to any album yet. Please contact the administrator.', 403);

    await createSession({ role: 'user', uid: user.id });
    return ok({ role: 'user' });
  } catch (e) {
    return fail(`Server error: ${e.message}`, 500);
  }
}
