alter table public.workflows
  add column if not exists drafting_instructions text not null default '',
  add column if not exists example_tweets text[] not null default '{}';

alter table public.triggers
  add column if not exists next_run_at timestamp with time zone;

alter table public.scan_runs
  add column if not exists new_item_count integer not null default 0,
  add column if not exists source text not null default 'manual',
  add column if not exists error_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scan_runs_source_check'
      and conrelid = 'public.scan_runs'::regclass
  ) then
    alter table public.scan_runs
      add constraint scan_runs_source_check
      check (source in ('create', 'manual', 'scheduled'));
  end if;
end $$;

create table if not exists public.scan_items (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  trigger_id uuid not null references public.triggers(id) on delete cascade,
  first_scan_run_id uuid references public.scan_runs(id) on delete set null,
  last_scan_run_id uuid references public.scan_runs(id) on delete set null,
  dedupe_key text not null,
  title text not null,
  aggregated_context text not null,
  evidence_points text[] not null default '{}',
  primary_tweet_url text not null default '',
  supporting_tweet_urls text[] not null default '{}',
  source_handles text[] not null default '{}',
  source_urls text[] not null default '{}',
  raw_headline jsonb not null default '{}'::jsonb,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  unique (trigger_id, dedupe_key)
);

alter table public.scan_items enable row level security;

drop policy if exists workflows_owner on public.workflows;
create policy workflows_owner on public.workflows
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists triggers_owner on public.triggers;
create policy triggers_owner on public.triggers
  for all
  to authenticated
  using (
    workflow_id in (
      select workflows.id
      from public.workflows
      where workflows.user_id = (select auth.uid())
    )
  )
  with check (
    workflow_id in (
      select workflows.id
      from public.workflows
      where workflows.user_id = (select auth.uid())
    )
  );

drop policy if exists scan_runs_owner on public.scan_runs;
create policy scan_runs_owner on public.scan_runs
  for all
  to authenticated
  using (
    trigger_id in (
      select triggers.id
      from public.triggers
      join public.workflows on workflows.id = triggers.workflow_id
      where workflows.user_id = (select auth.uid())
    )
  )
  with check (
    trigger_id in (
      select triggers.id
      from public.triggers
      join public.workflows on workflows.id = triggers.workflow_id
      where workflows.user_id = (select auth.uid())
    )
  );

drop policy if exists scan_items_owner on public.scan_items;
create policy scan_items_owner on public.scan_items
  for all
  to authenticated
  using (
    workflow_id in (
      select workflows.id
      from public.workflows
      where workflows.user_id = (select auth.uid())
    )
  )
  with check (
    workflow_id in (
      select workflows.id
      from public.workflows
      where workflows.user_id = (select auth.uid())
    )
  );

create index if not exists triggers_active_due_idx
  on public.triggers (next_run_at, created_at)
  where status = 'active' and type = 'x_search';

create index if not exists scan_runs_trigger_started_idx
  on public.scan_runs (trigger_id, started_at desc);

create index if not exists scan_items_workflow_first_run_idx
  on public.scan_items (workflow_id, first_scan_run_id);

create index if not exists scan_items_trigger_last_seen_idx
  on public.scan_items (trigger_id, last_seen_at desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trigger_frequency_interval(
  frequency_amount integer,
  frequency_unit public.trigger_frequency_unit
)
returns interval
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case frequency_unit
    when 'm' then make_interval(mins => frequency_amount)
    when 'h' then make_interval(hours => frequency_amount)
    when 'd' then make_interval(days => frequency_amount)
    when 'w' then make_interval(weeks => frequency_amount)
  end
$$;

update public.triggers
set next_run_at = coalesce(
  next_run_at,
  coalesce(last_run_at, created_at) + public.trigger_frequency_interval(frequency_amount, frequency_unit)
)
where next_run_at is null;

create or replace function public.claim_due_workflow_trigger()
returns table (
  trigger_id uuid,
  workflow_id uuid,
  workflow_name text,
  workflow_description text,
  trigger_config jsonb,
  frequency_amount integer,
  frequency_unit public.trigger_frequency_unit,
  claimed_at timestamp with time zone,
  scheduled_next_run_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  claimed record;
  now_at timestamp with time zone := now();
  next_at timestamp with time zone;
begin
  select
    triggers.id as trigger_id,
    triggers.workflow_id,
    workflows.name as workflow_name,
    workflows.description as workflow_description,
    triggers.config as trigger_config,
    triggers.frequency_amount,
    triggers.frequency_unit
  into claimed
  from public.triggers
  join public.workflows on workflows.id = triggers.workflow_id
  where workflows.status = 'active'
    and triggers.status = 'active'
    and triggers.type = 'x_search'
    and (triggers.next_run_at is null or triggers.next_run_at <= now_at)
  order by triggers.next_run_at nulls first, triggers.created_at
  for update of triggers skip locked
  limit 1;

  if not found then
    return;
  end if;

  next_at := now_at + public.trigger_frequency_interval(
    claimed.frequency_amount,
    claimed.frequency_unit
  );

  update public.triggers
  set next_run_at = next_at
  where id = claimed.trigger_id;

  trigger_id := claimed.trigger_id;
  workflow_id := claimed.workflow_id;
  workflow_name := claimed.workflow_name;
  workflow_description := claimed.workflow_description;
  trigger_config := claimed.trigger_config;
  frequency_amount := claimed.frequency_amount;
  frequency_unit := claimed.frequency_unit;
  claimed_at := now_at;
  scheduled_next_run_at := next_at;
  return next;
end;
$$;

revoke all on function public.claim_due_workflow_trigger() from public, anon, authenticated;
grant execute on function public.claim_due_workflow_trigger() to service_role;
