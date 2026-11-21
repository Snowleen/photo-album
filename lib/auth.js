import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const COOKIE = 'pa_session';
const SPACE_COOKIE = 'pa_space';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || '');
const cookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE,
});

/**
 * remember = true  -> stays signed in for 30 days, even after closing the browser.
 * remember = false -> cookie is removed when the browser closes (and expires after 12 hours at most).
 */
export async function createSession(payload, remember = true) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(remember ? '30d' : '12h')
    .sign(secret());
  const opts = cookieOpts();
  if (!remember) delete opts.maxAge; // session cookie
  cookies().set(COOKIE, token, opts);
}

export function clearSession() {
  cookies().delete(COOKIE);
  cookies().delete(SPACE_COOKIE);
}

/** Remembers which space the user is currently viewing. */
export function setActiveSpace(spaceId) {
  cookies().set(SPACE_COOKIE, spaceId, cookieOpts());
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

/**
 * Returns the logged-in, active user with all their spaces and the space
 * they are currently viewing (`space` / `space_id`), or null.
 */
export async function requireUser() {
  const s = await getSession();
  if (s?.role !== 'user' || !s.uid) return null;
  const { data } = await db()
    .from('users')
    .select('id, email, display_name, active, memberships(space:spaces(id, name, mode))')
    .eq('id', s.uid)
    .maybeSingle();
  if (!data || !data.active) return null;

  const spaces = (data.memberships || [])
    .map((m) => m.space)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!spaces.length) return null;

  const wanted = cookies().get(SPACE_COOKIE)?.value;
  const space = spaces.find((x) => x.id === wanted) || spaces[0];
  return {
    id: data.id,
    email: data.email,
    display_name: data.display_name,
    spaces,
    space,
    space_id: space.id,
  };
}
