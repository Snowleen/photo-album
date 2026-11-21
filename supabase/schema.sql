-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists pgcrypto;

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('individual', 'couple', 'family')),
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  uploaded_by uuid references users(id) on delete set null,
  album_id uuid references albums(id) on delete set null,
  storage_path text not null unique,
  original_name text,
  mime text,
  capture_date date,
  remark text,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists photos_space_idx on photos(space_id, deleted_at, uploaded_at desc);
create index if not exists photos_album_idx on photos(album_id);
create index if not exists users_space_idx on users(space_id);
create index if not exists albums_space_idx on albums(space_id);

-- Lock tables: only the server (service role key) can read/write them.
alter table spaces enable row level security;
alter table users  enable row level security;
alter table albums enable row level security;
alter table photos enable row level security;

-- Private storage bucket for the photo files (50 MB per file max).
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 52428800)
on conflict (id) do nothing;
