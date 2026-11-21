import { ok, fail } from '@/lib/db';
import { purgeExpired } from '@/lib/photos';

export const dynamic = 'force-dynamic';

// Runs daily (see vercel.json). Permanently deletes photos in the bin for 30+ days.
// Also keeps the free Supabase project active so it doesn't get paused.
export async function GET(req) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return fail('Unauthorized', 401);
  const purged = await purgeExpired();
  return ok({ purged });
}
