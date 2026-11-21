import { ok, fail } from '@/lib/db';
import { getSession, requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (s?.role === 'superadmin') return ok({ role: 'superadmin' });
  const me = await requireUser();
  if (!me) return fail('Not logged in', 401);
  return ok({
    role: 'user',
    user: { id: me.id, email: me.email, display_name: me.display_name },
    space: me.space,
    spaces: me.spaces,
  });
}
