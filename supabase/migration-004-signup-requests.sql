-- Migration 004: sign-up requests reviewed by the superadmin.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table signup_requests enable row level security;
grant select, insert, update, delete on signup_requests to service_role;
