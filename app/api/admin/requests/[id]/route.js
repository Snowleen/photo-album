import { db, ok, fail } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Reject: the request is deleted.
export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { error } = await db().from('signup_requests').delete().eq('id', params.id);
  if (error) return fail(error.message, 500);
  return ok();
}
