import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

let client;
export function db() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const BUCKET = 'photos';
export const BIN_DAYS = 30;
export const MODES = ['individual', 'couple', 'family', 'pet'];
export const MODE_LIMITS = { individual: 1, couple: 2, family: 10, pet: 10 };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (e) => String(e || '').trim().toLowerCase();

export const ok =(data = { ok: true }) => NextResponse.json(data);
export const fail = (error, status = 400) => NextResponse.json({ error }, { status });

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPERADMIN_USERNAME',
  'SUPERADMIN_PASSWORD',
  'SESSION_SECRET',
];

/** Names (never values) of required settings that are missing on the server. */
export function missingEnv() {
  return REQUIRED_ENV.filter((k) => !process.env[k]);
}

export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}
