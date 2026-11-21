-- Migration 003: email login, invitations, password reset, email settings.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

alter table users add column if not exists email text;
alter table users alter column username drop not null;
alter table users alter column password_hash drop not null;   -- empty until the invite is accepted
create unique index if not exists users_email_unique on users(email);

-- One-time links for invitations and password resets (only a hash is stored)
create table if not exists auth_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('invite', 'reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_tokens_user_idx on auth_tokens(user_id);

-- App settings edited from the superadmin panel (e.g. Resend API key)
create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table auth_tokens enable row level security;
alter table settings    enable row level security;
grant select, insert, update, delete on auth_tokens, settings to service_role;
