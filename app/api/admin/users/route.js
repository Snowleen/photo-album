import { db, ok, fail } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// All logins, with the spaces each one can access.
export async function GET() {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { data, error } = await db()
    .from('users')
    .select('id, username, display_name, active, created_at, memberships(space:spaces(id, name, mode))')
    .order('created_at', { ascending: true });
  if (error) return fail(error.message, 500);
  return ok({
    users: data.map(({ memberships, ...u }) => ({
      ...u,
      spaces: (memberships || []).map((m) => m.space).filter(Boolean),
    })),
  });
}
