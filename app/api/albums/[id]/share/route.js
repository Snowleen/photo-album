import { db, ok, fail, BUCKET } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { newShareToken, shareImagePath } from '@/lib/share';

async function ownAlbum(me, id) {
  const { data } = await db().from('albums').select('id, share_token').eq('id', id).eq('space_id', me.space_id).maybeSingle();
  return data;
}

// POST -> turn sharing on (keeps the same link if already shared).
// Also returns a one-time upload URL for the link-preview picture the browser makes.
export async function POST(_req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const album = await ownAlbum(me, params.id);
  if (!album) return fail('Album not found', 404);

  let token = album.share_token;
  if (!token) {
    token = newShareToken();
    const { error } = await db().from('albums').update({ share_token: token }).eq('id', album.id);
    if (error) return fail(error.message, 500);
  }
  const { data: up } = await db().storage.from(BUCKET).createSignedUploadUrl(shareImagePath(me.space_id, album.id), { upsert: true });
  return ok({ token, preview_upload: up ? { path: up.path, token: up.token } : null });
}

// DELETE -> stop sharing; the old link stops working immediately.
export async function DELETE(_req, { params }) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const album = await ownAlbum(me, params.id);
  if (!album) return fail('Album not found', 404);
  await db().from('albums').update({ share_token: null }).eq('id', album.id);
  await db().storage.from(BUCKET).remove([shareImagePath(me.space_id, album.id)]);
  return ok();
}
