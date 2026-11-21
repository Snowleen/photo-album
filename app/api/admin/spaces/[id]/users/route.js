import bcrypt from 'bcryptjs';
import { db, ok, fail, readJson, MODE_LIMITS, EMAIL_RE, normEmail } from '@/lib/db';
import { requireAdmin, isSuperadminName } from '@/lib/auth';

// Add a member to a space.
//   { user_id }                          -> add an existing login
//   { email, password, display_name? }   -> create a new login and add it
export async function POST(req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const body = await readJson(req);

  const { data: space } = await db().from('spaces').select('id, mode').eq('id', params.id).maybeSingle();
  if (!space) return fail('Space not found', 404);

  const { count } = await db().from('memberships').select('user_id', { count: 'exact', head: true }).eq('space_id', space.id);
  const limit = MODE_LIMITS[space.mode];
  if ((count || 0) >= limit) return fail(`${space.mode} mode allows maximum ${limit} member${limit > 1 ? 's' : ''}`);

  let userId = body.user_id;
  if (userId) {
    const { data: u } = await db().from('users').select('id').eq('id', userId).maybeSingle();
    if (!u) return fail('Login not found', 404);
    const { data: m } = await db().from('memberships').select('user_id').eq('user_id', userId).eq('space_id', space.id).maybeSingle();
    if (m) return fail('This login is already in this space');
  } else {
    const email = normEmail(body.email);
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email)) return fail('Please enter a valid email address');
    if (isSuperadminName(email)) return fail('That name is reserved');
    if (password.length < 6) return fail('Password must be at least 6 characters');
    const { data: exists } = await db().from('users').select('id').eq('email', email).maybeSingle();
    if (exists) return fail('This email already has a login — use the "Existing login" tab to add it to this space');

    const { data: created, error } = await db()
      .from('users')
      .insert({
        email,
        display_name: String(body.display_name || '').trim().slice(0, 40) || email.split('@')[0],
        password_hash: await bcrypt.hash(password, 10),
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 500);
    userId = created.id;
  }

  const { error } = await db().from('memberships').insert({ user_id: userId, space_id: space.id });
  if (error) return fail(error.message, 500);
  return ok();
}
