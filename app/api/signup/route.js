import { db, ok, fail, readJson, EMAIL_RE, normEmail } from '@/lib/db';
import { isSuperadminName } from '@/lib/auth';

const MAX_PENDING = 300; // stops the table being flooded by bots

// Public: someone asks for an account. The superadmin reviews it in the Requests tab.
export async function POST(req) {
  const body = await readJson(req);
  if (body.website) return ok(); // hidden "honeypot" field — only bots fill it in

  const email = normEmail(body.email);
  const name = String(body.display_name || '').trim().slice(0, 40);
  const note = String(body.note || '').trim().slice(0, 500);
  if (!name) return fail('Please tell us your name');
  if (!EMAIL_RE.test(email) || isSuperadminName(email)) return fail('Please enter a valid email address');

  const { data: user } = await db().from('users').select('id').eq('email', email).maybeSingle();
  if (user) return fail('This email already has an account. Please sign in instead.');
  const { data: existing } = await db().from('signup_requests').select('id').eq('email', email).maybeSingle();
  if (existing) return fail('A request for this email is already waiting for approval.');

  const { count } = await db().from('signup_requests').select('id', { count: 'exact', head: true });
  if ((count || 0) >= MAX_PENDING) return fail('Sign-ups are temporarily closed. Please try again later.', 429);

  const { error } = await db().from('signup_requests').insert({ email, display_name: name, note: note || null });
  if (error) return fail('Could not send your request. Please try again.', 500);
  return ok();
}
