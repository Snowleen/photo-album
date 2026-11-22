import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { purgeExpired, withPhotoUrls } from '@/lib/photos';

export const dynamic = 'force-dynamic';

const FIELDS =
  'id, storage_path, original_name, mime, capture_date, remark, album_id, uploaded_at, deleted_at, uploaded_by, uploader:users!photos_uploaded_by_fkey(display_name)';

// GET /api/photos?view=bin            -> recycle bin
// GET /api/photos?album=<id>          -> photos in one album
// GET /api/photos                     -> all photos
export async function GET(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const sp = new URL(req.url).searchParams;
  // Old bin items are cleaned nightly by the cron job; also tidy up when the bin itself is opened.
  if (sp.get('view') === 'bin') await purgeExpired(me.space_id);

  let q = db().from('photos').select(FIELDS).eq('space_id', me.space_id);
  if (sp.get('view') === 'bin') {
    q = q.not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  } else {
    q = q.is('deleted_at', null).order('uploaded_at', { ascending: false });
    if (sp.get('album')) q = q.eq('album_id', sp.get('album'));
  }
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  const photos = await withPhotoUrls(data);
  return ok({ photos: photos.map(({ storage_path, ...p }) => p) });
}

// Called after the file has been uploaded to storage, to save its details.
export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { path, original_name, mime, capture_date, remark, album_id } = await readJson(req);

  if (typeof path !== 'string' || !path.startsWith(`${me.space_id}/`) || path.includes('..')) return fail('Invalid file');
  if (album_id) {
    const { data: al } = await db().from('albums').select('id').eq('id', album_id).eq('space_id', me.space_id).maybeSingle();
    if (!al) return fail('Album not found');
  }
  const { data, error } = await db()
    .from('photos')
    .insert({
      space_id: me.space_id,
      uploaded_by: me.id,
      storage_path: path,
      original_name: original_name || null,
      mime: mime || null,
      capture_date: capture_date || null,
      remark: remark ? String(remark).slice(0, 2000) : null,
      album_id: album_id || null,
    })
    .select('id')
    .single();
  if (error) return fail(error.message, 500);
  return ok({ id: data.id });
}
