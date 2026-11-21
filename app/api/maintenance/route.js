import { ok } from '@/lib/db';
import { getMaintenance, publicStatus } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Public: login page and signed-in users check this to show the maintenance notice.
export async function GET() {
  try {
    return ok(publicStatus(await getMaintenance()));
  } catch {
    return ok({ state: 'off' });
  }
}
