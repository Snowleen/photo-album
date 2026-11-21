import { db, ok, fail, readJson, MODES } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { data, error } = await db()
    .from('spaces')
    .select(
      'id, name, mode, created_at, members:memberships(created_at, user:users(id, email, username, display_name, active, password_hash)), photos:photos!photos_space_id_fkey(count)'
    )
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({
    spaces: data.map(({ members, photos, ...s }) => ({
      ...s,
      users: [...(members || [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => m.user)
        .filter(Boolean)
        .map(({ password_hash, ...u }) => ({ ...u, pending: !password_hash })),
      photo_count: photos?.[0]?.count ?? 0,
    })),
  });
}

export async function POST(req) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const { name = '', mode = '' } = await readJson(req);
  if (!String(name).trim()) return fail('Please give the album space a name');
  if (!MODES.includes(mode)) return fail('Invalid mode');
  const { data, error } = await db().from('spaces').insert({ name: String(name).trim(), mode }).select().single();
  if (error) return fail(error.message, 500);
  return ok({ space: data });
}
