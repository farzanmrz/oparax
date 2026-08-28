-- Applied via the Supabase MCP server
-- Issue #131 teardown, migration 1: voice/drafting storage and dead RPCs.
drop table if exists public.voice_rules;
drop table if exists public.voice_guides;
drop table if exists public.voice_extraction_runs;
drop table if exists public.corpus_posts;

drop function if exists public.reclaim_extraction_run(uuid, timestamptz);
drop function if exists public.attach_story_draft(uuid, uuid);
drop function if exists public.claim_story_draft(uuid, timestamptz);
