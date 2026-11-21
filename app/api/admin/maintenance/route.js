import { ok, fail, readJson } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getMaintenance, saveMaintenance, maintenanceState, kickAfter } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const m = await getMaintenance();
  return ok({ ...m, state: maintenanceState(m) });
}

// PUT { enabled: true, message, start_at, end_at }   -> turn on / schedule
// PUT { enabled: false }                             -> turn off (or cancel a scheduled one)
// PUT { action: 'end' }                              -> end an active maintenance now
export async function PUT(req) {
  if (!(await requireAdmin())) return fail('Unauthorized', 401);
  const body = await readJson(req);
  const old = await getMaintenance();
  const now = Date.now();
  // Remember the last time everyone was signed out, so those old sessions stay invalid.
  const last_kick = kickAfter(old, now);
  const base = last_kick ? { last_kick_at: new Date(last_kick).toISOString() } : {};

  if (body.action === 'end') {
    if (maintenanceState(old) !== 'active') return fail('Maintenance is not running right now');
    await saveMaintenance({ ...old, ...base, end_at: new Date(now).toISOString() });
    return ok();
  }

  if (!body.enabled) {
    await saveMaintenance({ ...base, enabled: false, message: old.message || '' });
    return ok();
  }

  const message = String(body.message || '').trim().slice(0, 1000);
  const start = Date.parse(body.start_at);
  const end = Date.parse(body.end_at);
  if (!message) return fail('Please type the message users will see');
  if (!Number.isFinite(start) || !Number.isFinite(end)) return fail('Please choose a start time and duration');
  if (end <= start) return fail('The end time must be after the start time');
  if (end <= now) return fail('This maintenance window is already over — choose a later time');

  await saveMaintenance({
    ...base,
    enabled: true,
    message,
    start_at: new Date(Math.max(start, now - 1000)).toISOString(),
    end_at: new Date(end).toISOString(),
  });
  return ok();
}
