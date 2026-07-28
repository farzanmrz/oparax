-- Applied via the Supabase MCP server.
create table public.beat_conflicts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  source_post_id uuid not null references public.source_posts (id) on delete cascade,
  ground_on_beat boolean not null,
  ground_reason text not null,
  judge_on_beat boolean not null,
  judge_reason text not null,
  status text not null default 'unresolved'
    check (status in ('unresolved', 'resolved_on_beat', 'resolved_off_beat')),
  created_at timestamptz not null default now(),
  unique (experiment_id, source_post_id)
);

create index beat_conflicts_experiment_idx on public.beat_conflicts (experiment_id);

alter table public.beat_conflicts enable row level security;

create policy beat_conflicts_select_via_experiment on public.beat_conflicts
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.id = beat_conflicts.experiment_id
      and e.owner_id = (select auth.uid())
  ));
