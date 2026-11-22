import crypto from 'crypto';
import { db, BUCKET } from './db';
import { withPhotoUrls } from './photos';

export const newShareToken = () => crypto.randomBytes(18).toString('base64url'); // 24 chars, unguessable
export const shareImagePath = (spaceId, albumId) => `${spaceId}/share/${albumId}.jpg`;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Album shared with this link (or null), without loading photos. */
export async function findSharedAlbum(token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  const { data } = await db()
    .from('albums')
    .select('id, name, space_id, cover_photo_id, cover_crop, space:spaces(name, mode)')
    .eq('share_token', token)
    .maybeSingle();
  return data || null;
}

/** Everything the public gallery page needs. */
export async function loadSharedAlbum(token) {
  const album = await findSharedAlbum(token);
  if (!album) return null;
  const { data: rows } = await db()
    .from('photos')
    .select('id, storage_path, original_name, capture_date, remark, uploaded_at')
    .eq('album_id', album.id)
    .is('deleted_at', null)
    .order('capture_date', { ascending: true, nullsFirst: false })
    .order('uploaded_at', { ascending: true });
  const photos = await withPhotoUrls(rows || []);
  const chosen = album.cover_photo_id && photos.find((p) => p.id === album.cover_photo_id);
  const cover = chosen ? { url: chosen.url, crop: album.cover_crop } : photos.length ? { url: photos[photos.length - 1].url, crop: null } : null;
  return {
    album: { id: album.id, name: album.name },
    space: album.space,
    cover,
    photos: photos.map(({ storage_path, ...p }) => p),
  };
}

/** Bytes of the link-preview picture, or null if it hasn't been made. */
export async function shareImage(album) {
  const { data } = await db().storage.from(BUCKET).download(shareImagePath(album.space_id, album.id));
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}
