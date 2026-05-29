-- Slice 1 "manual loop" schema: six new owner-scoped tables added additively
-- alongside the legacy four (workflows/triggers/scan_runs/scan_items), which are
-- left untouched and retired separately in T10. Mirrors docs/SPEC.md §4.

-- 4.1 x_connections — the X token lifecycle Supabase will not manage (SENSITIVE).
-- access_token/refresh_token are app-layer AES-256-GCM encrypted before insert.
create table if not exists public.x_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  x_user_id text not null,
  x_username text not null,
  access_token text not null,
  refresh_token text not null,
  scopes text[] not null default '{}',
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 4.2 monitors — the configured scanner (collapses old workflows + triggers).
create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monitoring_description text not null default '',
  monitored_handles text[] not null default '{}',
  drafting_instructions text not null default '',
  example_tweets text[] not null default '{}',
  scan_from date,
  scan_to date,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint monitors_handles_max_20
    check (coalesce(array_length(monitored_handles, 1), 0) <= 20)
);

-- 4.3 scans — one streaming Grok x_search run.
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  cost_usd numeric,
  x_search_count integer,
  story_count integer,
  raw_output jsonb,
  error_message text
);

-- 4.3 stories — trimmed to the scan's {title, summary, source_urls} output.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  title text not null,
  summary text not null default '',
  source_urls text[] not null default '{}',
  primary_tweet_url text not null default '',
  dedupe_key text not null,
  created_at timestamp with time zone not null default now(),
  unique (scan_id, dedupe_key)
);

-- 4.3 drafts — one generated/edited tweet for a single story.
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'edited', 'posted', 'failed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 4.3 posts — the record of a real tweet that landed on X.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  x_tweet_id text not null,
  x_tweet_url text not null,
  posted_at timestamp with time zone not null default now(),
  status text not null default 'posted',
  error_message text
);

-- Row level security: every loop table is owner-scoped.
alter table public.x_connections enable row level security;
alter table public.monitors enable row level security;
alter table public.scans enable row level security;
alter table public.stories enable row level security;
alter table public.drafts enable row level security;
alter table public.posts enable row level security;

-- Direct ownership (user_id column). (select auth.uid()) is the initplan-cached
-- form the auth_rls_initplan advisor expects.
drop policy if exists x_connections_owner on public.x_connections;
create policy x_connections_owner on public.x_connections
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists monitors_owner on public.monitors;
create policy monitors_owner on public.monitors
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Transitive ownership via monitors.user_id.
drop policy if exists scans_owner on public.scans;
create policy scans_owner on public.scans
  for all
  to authenticated
  using (
    monitor_id in (
      select monitors.id
      from public.monitors
      where monitors.user_id = (select auth.uid())
    )
  )
  with check (
    monitor_id in (
      select monitors.id
      from public.monitors
      where monitors.user_id = (select auth.uid())
    )
  );

drop policy if exists stories_owner on public.stories;
create policy stories_owner on public.stories
  for all
  to authenticated
  using (
    monitor_id in (
      select monitors.id
      from public.monitors
      where monitors.user_id = (select auth.uid())
    )
  )
  with check (
    monitor_id in (
      select monitors.id
      from public.monitors
      where monitors.user_id = (select auth.uid())
    )
  );

-- Transitive ownership via stories -> monitors.
drop policy if exists drafts_owner on public.drafts;
create policy drafts_owner on public.drafts
  for all
  to authenticated
  using (
    story_id in (
      select stories.id
      from public.stories
      join public.monitors on monitors.id = stories.monitor_id
      where monitors.user_id = (select auth.uid())
    )
  )
  with check (
    story_id in (
      select stories.id
      from public.stories
      join public.monitors on monitors.id = stories.monitor_id
      where monitors.user_id = (select auth.uid())
    )
  );

-- Transitive ownership via drafts -> stories -> monitors.
drop policy if exists posts_owner on public.posts;
create policy posts_owner on public.posts
  for all
  to authenticated
  using (
    draft_id in (
      select drafts.id
      from public.drafts
      join public.stories on stories.id = drafts.story_id
      join public.monitors on monitors.id = stories.monitor_id
      where monitors.user_id = (select auth.uid())
    )
  )
  with check (
    draft_id in (
      select drafts.id
      from public.drafts
      join public.stories on stories.id = drafts.story_id
      join public.monitors on monitors.id = stories.monitor_id
      where monitors.user_id = (select auth.uid())
    )
  );

-- Foreign-key indexes (keeps the unindexed_foreign_keys perf advisor clean).
-- x_connections.user_id is covered by its UNIQUE constraint;
-- stories.scan_id is covered by the (scan_id, dedupe_key) UNIQUE index.
create index if not exists monitors_user_id_idx on public.monitors (user_id);
create index if not exists scans_monitor_id_idx on public.scans (monitor_id);
create index if not exists stories_monitor_id_idx on public.stories (monitor_id);
create index if not exists drafts_story_id_idx on public.drafts (story_id);
create index if not exists posts_draft_id_idx on public.posts (draft_id);

-- Auto-touch updated_at on the three mutable tables, reusing the existing
-- public.handle_updated_at() trigger function from the legacy migration.
drop trigger if exists x_connections_set_updated_at on public.x_connections;
create trigger x_connections_set_updated_at
  before update on public.x_connections
  for each row execute function public.handle_updated_at();

drop trigger if exists monitors_set_updated_at on public.monitors;
create trigger monitors_set_updated_at
  before update on public.monitors
  for each row execute function public.handle_updated_at();

drop trigger if exists drafts_set_updated_at on public.drafts;
create trigger drafts_set_updated_at
  before update on public.drafts
  for each row execute function public.handle_updated_at();
