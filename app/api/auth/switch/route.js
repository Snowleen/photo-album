import { ok, fail, readJson } from '@/lib/db';
import { requireUser, setActiveSpace } from '@/lib/auth';

// Switch the space (album) the logged-in user is viewing.
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { space_id } = await readJson(req);
  if (!me.spaces.some((s) => s.id === space_id)) return fail('You do not have access to that album', 403);
  setActiveSpace(space_id);
  return ok();
}
