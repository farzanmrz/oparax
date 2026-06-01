-- Agents data model: replace the slice-1 loop tables (monitors/scans/stories/
-- drafts/posts) with a leaner agents/runs/run_items model. One "Run agent" =
-- scan + draft together (one cost per run); run-as-preview, persist on Save;
-- post per item. Clean cutover — the old tables + their dev rows are dropped.
-- x_connections and the shared handle_updated_at() trigger function are KEPT.

-- 1. Drop the old loop tables (child-first; CASCADE clears policies/indexes/FKs).
drop table if exists public.posts cascade;
drop table if exists public.drafts cascade;
drop table if exists public.stories cascade;
drop table if exists public.scans cascade;
drop table if exists public.monitors cascade;

-- 2. Enums (stable sets → Postgres enums → TS string-literal unions).
-- (Handle case-insensitivity is enforced in app code, not citext — see ADR-0002.)
do $$ begin
  create type public.agent_status as enum ('active', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_source as enum ('manual', 'cron');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_status as enum ('running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_status as enum ('drafted', 'posted', 'failed');
exception when duplicate_object then null; end $$;

-- 3. agents — the saved configuration (replaces monitors).
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monitored_handles text[] not null default '{}'
    check (coalesce(array_length(monitored_handles, 1), 0) <= 20),
  monitoring_description text not null default '',
  drafting_instructions text not null default '',
  example_tweets text[] not null default '{}',
  scan_from date,
  scan_to date,
  status public.agent_status not null default 'active',
  -- FUTURE cron: minutes between auto-scans (null = manual only).
  scan_cadence_minutes int check (scan_cadence_minutes is null or scan_cadence_minutes > 0),
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. runs — one row per "Run agent" (scan + draft together; one combined cost).
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  source public.run_source not null default 'manual',
  status public.run_status not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cost_usd numeric(12, 6) check (cost_usd is null or cost_usd >= 0),
  x_search_count int check (x_search_count is null or x_search_count >= 0),
  item_count int check (item_count is null or item_count >= 0),
  inputs jsonb,
  error_message text
);

-- 5. run_items — one row per result (story + draft + post state).
create table if not exists public.run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  story_title text not null default '',
  story_summary text not null default '',
  source_urls text[] not null default '{}',
  primary_tweet_url text not null default '',
  dedupe_key text not null,
  drafted_text text not null default '',
  final_text text,
  status public.item_status not null default 'drafted',
  x_tweet_id text,
  x_tweet_url text,
  posted_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, dedupe_key)
);

-- Row level security: agents by owner; runs/run_items transitively via agent.
alter table public.agents enable row level security;
alter table public.runs enable row level security;
alter table public.run_items enable row level security;

drop policy if exists agents_owner on public.agents;
create policy agents_owner on public.agents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists runs_owner on public.runs;
create policy runs_owner on public.runs
  for all to authenticated
  using (
    agent_id in (select id from public.agents where user_id = (select auth.uid()))
  )
  with check (
    agent_id in (select id from public.agents where user_id = (select auth.uid()))
  );

drop policy if exists run_items_owner on public.run_items;
create policy run_items_owner on public.run_items
  for all to authenticated
  using (
    agent_id in (select id from public.agents where user_id = (select auth.uid()))
  )
  with check (
    agent_id in (select id from public.agents where user_id = (select auth.uid()))
  );

-- Foreign-key indexes.
create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists runs_agent_id_idx on public.runs (agent_id);
create index if not exists run_items_run_id_idx on public.run_items (run_id);
create index if not exists run_items_agent_id_idx on public.run_items (agent_id);

-- Auto-touch updated_at, reusing the existing public.handle_updated_at().
drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.handle_updated_at();

drop trigger if exists run_items_set_updated_at on public.run_items;
create trigger run_items_set_updated_at
  before update on public.run_items
  for each row execute function public.handle_updated_at();
