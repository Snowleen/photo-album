import { db, ok, fail } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { data, error } = await db()
    .from('signup_requests')
    .select('id, email, display_name, note, created_at')
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ requests: data });
}
