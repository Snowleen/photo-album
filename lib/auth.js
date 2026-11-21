import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const COOKIE = 'pa_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || '');

export async function createSession(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export function isSuperadminName(username) {
  const sa = process.env.SUPERADMIN_USERNAME;
  return !!sa && String(username).trim().toLowerCase() === sa.toLowerCase();
}

export async function requireAdmin() {
  const s = await getSession();
  return s?.role === 'superadmin' ? s : null;
}

/** Returns the logged-in, active user with their space, or null. */
export async function requireUser() {
  const s = await getSession();
  if (s?.role !== 'user' || !s.uid) return null;
  const { data } = await db()
    .from('users')
    .select('id, username, display_name, active, space_id, space:spaces!users_space_id_fkey(id, name, mode)')
    .eq('id', s.uid)
    .maybeSingle();
  if (!data || !data.active || !data.space) return null;
  return data;
}
