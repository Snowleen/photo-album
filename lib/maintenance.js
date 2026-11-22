import { db } from './db';

const KEY = 'maintenance';

/** Stored record: { enabled, message, start_at, end_at, last_kick_at } (ISO dates). */
export async function getMaintenance() {
  const { data } = await db().from('settings').select('value').eq('key', KEY).maybeSingle();
  try {
    return JSON.parse(data?.value || '{}') || {};
  } catch {
    return {};
  }
}

// Short in-memory cache for the check that runs on every signed-in request.
let cached = null;
let cachedAt = 0;
const CACHE_MS = 15000;

/** Same as getMaintenance, but reuses the last answer for up to 15 seconds. */
export async function getMaintenanceCached() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
  cached = await getMaintenance();
  cachedAt = Date.now();
  return cached;
}

export async function saveMaintenance(record) {
  cached = null; // this server instance sees the change immediately
  const { error } = await db()
    .from('settings')
    .upsert({ key: KEY, value: JSON.stringify(record), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** 'off' | 'scheduled' | 'active' | 'ended' */
export function maintenanceState(m, now = Date.now()) {
  if (!m?.enabled || !m.start_at) return 'off';
  const start = Date.parse(m.start_at);
  const end = m.end_at ? Date.parse(m.end_at) : Infinity;
  if (now < start) return 'scheduled';
  if (now < end) return 'active';
  return 'ended';
}

/**
 * Sessions created before this moment are no longer valid (everyone was signed out
 * when a maintenance window started). Returns ms timestamp or 0.
 */
export function kickAfter(m, now = Date.now()) {
  let t = m?.last_kick_at ? Date.parse(m.last_kick_at) : 0;
  if (m?.enabled && m.start_at && Date.parse(m.start_at) <= now) t = Math.max(t, Date.parse(m.start_at));
  return t || 0;
}

/** What the public status endpoint returns. */
export function publicStatus(m) {
  const state = maintenanceState(m);
  if (state !== 'scheduled' && state !== 'active') return { state: 'off' };
  return { state, message: m.message || '', start_at: m.start_at, end_at: m.end_at || null };
}
