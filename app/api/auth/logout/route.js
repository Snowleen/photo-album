import { ok } from '@/lib/db';
import { clearSession } from '@/lib/auth';

export async function POST() {
  clearSession();
  return ok();
}
