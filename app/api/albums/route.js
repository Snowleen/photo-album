import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withUrls } from '@/lib/photos';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);

  const [{ data: albums, error }, { data: photos }] = await Promise.all([
    db()
      .from('albums')
      .select('id, name, created_at, cover_photo_id, cover_crop')
      .eq('space_id', me.space_id)
      .order('created_at', { ascending: false }),
    db()
      .from('photos')
      .select('id, album_id, storage_path')
      .eq('space_id', me.space_id)
      .is('deleted_at', null)
      .not('album_id', 'is', null)
      .order('uploaded_at', { ascending: false }),
  ]);
  if (error) return fail(error.message, 500);

  const stats = {};
  const byId = new Map();
  for (const p of photos || []) {
    byId.set(p.id, p);
    const s = (stats[p.album_id] ||= { count: 0, latest_path: p.storage_path });
    s.count++;
  }

  const rows = albums.map((a) => {
    // Chosen cover only counts while that photo is still in this album and not in the bin.
    const chosen = a.cover_photo_id && byId.get(a.cover_photo_id);
    const valid = chosen && chosen.album_id === a.id;
    return {
      id: a.id,
      name: a.name,
      created_at: a.created_at,
      count: stats[a.id]?.count || 0,
      cover_photo_id: valid ? a.cover_photo_id : null,
      cover_crop: valid ? a.cover_crop : null,
      cover_path: valid ? chosen.storage_path : stats[a.id]?.latest_path || null,
    };
  });
  const out = await withUrls(rows, 'cover_path', 'cover');
  return ok({ albums: out.map(({ cover_path, ...a }) => a) });
}

export async function POST(req) {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);
  const { name = '' } = await readJson(req);
  if (!String(name).trim()) return fail('Album name is required');
  const { data, error } = await db()
    .from('albums')
    .insert({ space_id: me.space_id, name: String(name).trim().slice(0, 100), created_by: me.id })
    .select('id, name')
    .single();
  if (error) return fail(error.message, 500);
  return ok({ album: data });
}
