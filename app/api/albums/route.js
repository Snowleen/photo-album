import { db, ok, fail, readJson } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withUrls } from '@/lib/photos';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await requireUser();
  if (!me) return fail('Unauthorized', 401);

  const [{ data: albums, error }, { data: photos }] = await Promise.all([
    db().from('albums').select('id, name, created_at').eq('space_id', me.space_id).order('created_at', { ascending: false }),
    db()
      .from('photos')
      .select('album_id, storage_path')
      .eq('space_id', me.space_id)
      .is('deleted_at', null)
      .not('album_id', 'is', null)
      .order('uploaded_at', { ascending: false }),
  ]);
  if (error) return fail(error.message, 500);

  const stats = {};
  for (const p of photos || []) {
    const s = (stats[p.album_id] ||= { count: 0, cover_path: p.storage_path });
    s.count++;
  }
  const rows = albums.map((a) => ({ ...a, count: stats[a.id]?.count || 0, cover_path: stats[a.id]?.cover_path || null }));
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
