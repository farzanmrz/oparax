-- The first app-owned table: a reporter's saved desk. Fields mirror the
-- desk-completion contract in eve/agent/instructions.md. Deliberately absent
-- until their backing features exist: status, next_run_at, stat counters.
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: public.delete_account() deletes auth.users and relies
  -- on FKs to sweep app rows.
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  beat text not null check (char_length(beat) > 0),
  -- Verified bare X handles (no @), correctly cased. cardinality (not
  -- array_length) so an empty array fails instead of NULL-passing the check.
  handles text[] not null check (cardinality(handles) between 1 and 20),
  drafting_instructions text not null check (char_length(drafting_instructions) > 0),
  account_tier text not null check (account_tier in ('standard', 'premium')),
  -- The exact validated Schedule shape from eve/agent/lib/cadence.ts:
  -- {kind:"interval",everyMinutes} | {kind:"weekly",fires:[{dayOfWeek,hour,minute}]}
  cadence jsonb not null,
  -- eve session cursor (Vercel Workflow retains sessions ~7 days; nullable).
  setup_session_id text,
  -- Full client-side chat message array at save time.
  setup_transcript jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS filters on user_id; every query hits this index.
create index agents_user_id_idx on public.agents (user_id);

alter table public.agents enable row level security;

-- Owner-only, one policy per operation; (select auth.uid()) so the planner
-- runs it once per statement, not per row.
create policy "agents_select_own" on public.agents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "agents_insert_own" on public.agents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "agents_update_own" on public.agents
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "agents_delete_own" on public.agents
  for delete to authenticated using ((select auth.uid()) = user_id);

create extension if not exists moddatetime with schema extensions;
create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function extensions.moddatetime(updated_at);
