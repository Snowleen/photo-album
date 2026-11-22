-- Migration 006: shareable album links.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

alter table albums add column if not exists share_token text unique;  -- null = not shared
