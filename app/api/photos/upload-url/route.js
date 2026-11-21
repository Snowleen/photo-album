import { db, ok, fail, readJson, BUCKET } from '@/lib/db';
import { requireUser } from '@/lib/auth';

// Gives the browser a one-time URL to upload a photo straight to storage
// (avoids the 4.5 MB request limit on Vercel's free plan).
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { filename = '', type = '' } = await readJson(req);
  if (!String(type).startsWith('image/')) return fail('Only image files can be uploaded');

  let ext = (String(filename).split('.').pop() || '').toLowerCase();
  if (!/^[a-z0-9]{2,5}$/.test(ext)) ext = String(type).split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'jpg';

  const path = `${me.space_id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return fail(error.message, 500);
  return ok({ path: data.path, token: data.token });
}
