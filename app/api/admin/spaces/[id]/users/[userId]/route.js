import { db, ok, fail } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Remove a login from a space (the login itself and its photos are kept).
export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { error } = await db().from('memberships').delete().eq('space_id', params.id).eq('user_id', params.userId);
  if (error) return fail(error.message, 500);
  return ok();
}
