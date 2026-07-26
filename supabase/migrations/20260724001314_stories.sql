-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): item 3 clustering. `stories` is EXISTS-join-through-experiments,
-- select-only (service-role writes via lib/agent/cluster.ts); `story_assignments` is
-- deny-all with UNIQUE(source_post_id) — the atomic claim that makes "attach-or-create"
-- race-safe (D16 rail).
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stories_experiment_id_idx on public.stories(experiment_id);

alter table public.stories enable row level security;

create policy stories_select_via_experiment on public.stories
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.id = stories.experiment_id
      and e.owner_id = (select auth.uid())
  ));

create table public.story_assignments (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.source_posts(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_post_id)
);

create index story_assignments_story_id_idx on public.story_assignments(story_id);

alter table public.story_assignments enable row level security;
-- deny-all by design: no policies; lib/agent/cluster.ts (service-role) owns this table
