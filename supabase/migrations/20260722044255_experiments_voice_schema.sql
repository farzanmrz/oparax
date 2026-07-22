-- ft/66: experiments + voice schema — slice 1 (five tables).
-- Three RLS shapes with existing precedent: owner-scoped 4-policy (experiments),
-- owner-select + service-role-write (usage_events), EXISTS-join-through-experiments
-- (voice_guides on reporter_handle, post_drafts on experiment_id); deny-all (source_posts).
-- No stories/story_id (the clustering extension point is deliberately additive later — a
-- nullable FK to a nonexistent table is worse than the later migration).
-- Applied via the Supabase MCP against project pcgvpypzfwuchyfwdlwe; mirrored here.

-- experiments — owner-scoped, agents-style 4-policy. Not overloaded onto agents: agents
-- carry scan_frequency/search_template, which experiments have no concept of.
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  beat text not null check (char_length(beat) > 0),
  tracked_handles text[] not null default '{}',
  reporter_handle text not null check (char_length(reporter_handle) > 0),
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiments_owner_id_idx on public.experiments (owner_id);
create index experiments_reporter_handle_idx on public.experiments (reporter_handle);
alter table public.experiments enable row level security;
create policy "experiments_select_own" on public.experiments
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "experiments_insert_own" on public.experiments
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "experiments_update_own" on public.experiments
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "experiments_delete_own" on public.experiments
  for delete to authenticated using ((select auth.uid()) = owner_id);
create extension if not exists moddatetime with schema extensions;
create trigger experiments_set_updated_at
  before update on public.experiments
  for each row execute function extensions.moddatetime(updated_at);

-- voice_guides — global, UNIQUE per reporter_handle (the unique key encodes the economics:
-- extraction is paid once per reporter; keying by experiment would re-pay it per experiment).
-- No owner_id column. Written ONLY by the service-role client (like runs/x_accounts): no
-- insert/update/delete policies. One read policy — an owner may read a guide for a reporter
-- they run an experiment on.
create table public.voice_guides (
  id uuid primary key default gen_random_uuid(),
  reporter_handle text not null unique,
  guide_raw text not null,
  guide_deploy text not null,
  measured_facts text not null,
  provenance jsonb,            -- thinking tokens, usage, gateway generationId (audit trail)
  cost_usd numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.voice_guides enable row level security;
create policy "voice_guides_select_via_experiment" on public.voice_guides
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.reporter_handle = voice_guides.reporter_handle
      and e.owner_id = (select auth.uid())));
create trigger voice_guides_set_updated_at
  before update on public.voice_guides
  for each row execute function extensions.moddatetime(updated_at);

-- source_posts — global, deduped by x_post_id (shared stream rules mean overlapping
-- tracking; store once, join through drafts). RLS-enabled DENY-ALL: NO policies on purpose,
-- deny-all for anon/authenticated, read/written only by the service-role client. A browser
-- read policy is deferred to the Voice-section UI design (mirrors x_accounts).
create table public.source_posts (
  id uuid primary key default gen_random_uuid(),
  x_post_id text not null unique,
  author_handle text not null,
  text text not null,
  posted_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
alter table public.source_posts enable row level security;

-- post_drafts — one row per council member per post (+ a judge row), so the retirement rule,
-- per-model cost, and "why did this win" are each ONE query. No owner column; RLS joins
-- through experiment_id -> experiments.owner_id (the runs/drafts pattern). No insert policy:
-- drafts are written by the service-role council.
create table public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.source_posts (id) on delete cascade,
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  model text not null,
  text text not null,
  cost_usd numeric,
  usage jsonb,
  reasoning text,
  is_winner boolean not null default false,
  judge_verdict jsonb,
  created_at timestamptz not null default now()
);
create index post_drafts_experiment_id_idx on public.post_drafts (experiment_id);
create index post_drafts_source_post_id_idx on public.post_drafts (source_post_id);
alter table public.post_drafts enable row level security;
create policy "post_drafts_select_via_experiment" on public.post_drafts
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.id = post_drafts.experiment_id
      and e.owner_id = (select auth.uid())));

-- usage_events — the metering ledger, stamped from birth by every touch point (model calls,
-- stream deliveries, notifications). Owner-select only; zero write policies, so only the
-- service-role client writes and a browser cannot forge or zero its own spend.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  units numeric,
  cost_usd numeric,
  ref_id text,
  created_at timestamptz not null default now()
);
create index usage_events_owner_id_idx on public.usage_events (owner_id);
alter table public.usage_events enable row level security;
create policy "usage_events_select_own" on public.usage_events
  for select to authenticated using ((select auth.uid()) = owner_id);
