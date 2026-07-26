-- Applied via the claude.ai Supabase connector.
-- Slice 5 continuation (T1): adds progress/streaming columns to voice_extraction_claims so
-- extraction can stream status (stage/progress_note/reasoning_partial) and stamp lifecycle
-- timestamps + a failure code. The table already has updated_at (not null default now()) from
-- 20260724001340_voice_extraction_claims.sql, reused as-is for the per-write stamp rather than
-- adding a second column. Deny-all RLS is unchanged — no policy added.
alter table public.voice_extraction_claims
  add column stage text null,
  add column progress_note text null,
  add column reasoning_partial text null,
  add column started_at timestamptz null,
  add column finished_at timestamptz null,
  add column error_code text null;
