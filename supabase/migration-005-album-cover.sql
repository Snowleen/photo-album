-- Migration 005: choose an album cover photo and the part of it that is shown.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

alter table albums add column if not exists cover_photo_id uuid references photos(id) on delete set null;
alter table albums add column if not exists cover_crop jsonb;  -- { x, y, w, h } as fractions of the photo (0..1)
