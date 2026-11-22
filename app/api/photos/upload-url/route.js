import { db, ok, fail, readJson, BUCKET } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { thumbPathFor } from '@/lib/photos';

// Gives the browser one-time URLs to upload a photo (and its small preview)
// straight to storage — avoids the 4.5 MB request limit on Vercel's free plan.
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { filename = '', type = '', thumb = false } = await readJson(req);
  if (!String(type).startsWith('image/')) return fail('Only image files can be uploaded');

  let ext = (String(filename).split('.').pop() || '').toLowerCase();
  if (!/^[a-z0-9]{2,5}$/.test(ext)) ext = String(type).split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'jpg';

  const path = `${me.space_id}/${crypto.randomUUID()}.${ext}`;
  const bucket = db().storage.from(BUCKET);
  const [main, small] = await Promise.all([
    bucket.createSignedUploadUrl(path),
    thumb ? bucket.createSignedUploadUrl(thumbPathFor(path)) : Promise.resolve(null),
  ]);
  if (main.error) return fail(main.error.message, 500);
  return ok({
    path: main.data.path,
    token: main.data.token,
    thumb_path: small?.data?.path || null,
    thumb_token: small?.data?.token || null,
  });
}
