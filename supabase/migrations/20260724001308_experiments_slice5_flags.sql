-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): experiments += reporter_verified_at (D14), auto_post_master +
-- auto_post_sources (item 6), websites (item 2). Backfills reporter_verified_at = now() for
-- every existing row so no currently-working desk loses voice_guides access once
-- voice_guides_verified_gate.sql lands.
alter table public.experiments
  add column reporter_verified_at timestamptz null,
  add column auto_post_master boolean not null default false,
  add column auto_post_sources jsonb not null default '{}',
  add column websites jsonb not null default '[]';

update public.experiments set reporter_verified_at = now() where reporter_verified_at is null;
