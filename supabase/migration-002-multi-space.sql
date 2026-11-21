-- Migration 002: one login can belong to several spaces + new "pet" mode.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Existing users keep access to their current space.

create table if not exists memberships (
  user_id uuid not null references users(id) on delete cascade,
  space_id uuid not null references spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, space_id)
);
create index if not exists memberships_space_idx on memberships(space_id);

-- Move each existing user's space into the new memberships table
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'space_id') then
    insert into memberships (user_id, space_id, created_at)
    select id, space_id, created_at from users where space_id is not null
    on conflict do nothing;
    alter table users drop column space_id;
  end if;
end $$;

-- Allow the new "pet" mode
alter table spaces drop constraint if exists spaces_mode_check;
alter table spaces add constraint spaces_mode_check check (mode in ('individual', 'couple', 'family', 'pet'));

alter table memberships enable row level security;
grant select, insert, update, delete on memberships to service_role;
