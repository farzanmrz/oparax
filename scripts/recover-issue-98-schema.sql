-- Issue #98 recovery runbook — DO NOT APPLY AS A MIGRATION.
--
-- Operator prerequisites:
--   * Take a verified database backup and record the intended recovery point.
--   * Quiesce every writer (web, workers, Railway) and use a privileged SQL role.
--   * Confirm the live schema is exactly the post-contract schema from
--     20260730153001_issue_98_contract_agent_draft_vocabulary.sql.
--   * Rehearse against a restored copy first. If this transaction cannot be
--     completed, ROLLBACK; use the provider's PITR/backup restore procedure
--     for a failed or partially external recovery. No credentials belong here.
--
-- This is the executable inverse of the final contract migration. It is
-- deliberately fail-closed: do not weaken its preflight checks for a schema
-- that has drifted since the contract was applied.

begin;
set local lock_timeout = '5s';

lock table public.agents, public.drafts, public.beat_conflicts, public.corpus_posts,
  public.draft_claims, public.slack_accounts, public.slack_delivery_receipts, public.stories,
  public.story_assignments, public.voice_extraction_runs, public.voice_guides, public.voice_rules
in access exclusive mode;

do $preflight$
declare
  child_table text;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'issue 98 recovery requires PostgreSQL 17 or newer';
  end if;
  if to_regclass('public.agents') is null or to_regclass('public.drafts') is null then
    raise exception 'issue 98 recovery requires canonical agents and drafts tables';
  end if;
  if (select relkind from pg_class where oid = 'public.agents'::regclass) <> 'r'
     or (select relkind from pg_class where oid = 'public.drafts'::regclass) <> 'r' then
    raise exception 'issue 98 recovery requires tables, not compatibility views';
  end if;
  if to_regclass('public.experiments') is not null or to_regclass('public.post_drafts') is not null then
    raise exception 'issue 98 recovery refuses an existing experiments or post_drafts relation';
  end if;
  if to_regprocedure('public.sync_issue_98_agent_id()') is not null then
    raise exception 'issue 98 recovery found pre-existing compatibility function';
  end if;

  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = child_table and column_name = 'agent_id'
    ) or exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = child_table and column_name = 'experiment_id'
    ) then
      raise exception 'issue 98 recovery requires canonical agent_id only on %', child_table;
    end if;
  end loop;
end
$preflight$;

-- PostgreSQL keeps dependency expressions correct across these renames. Object
-- identifiers are not dependencies, so restore their pre-contract names below.
alter table public.agents rename to experiments;
alter table public.drafts rename to post_drafts;

do $rename_columns$
declare
  child_table text;
begin
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'post_drafts', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    execute format('alter table public.%I rename column agent_id to experiment_id', child_table);
  end loop;
end
$rename_columns$;

do $rename_objects$
declare
  item record;
  new_name text;
begin
  for item in
    select r.relname as relation_name, conname
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    where connamespace = 'public'::regnamespace
      and (conname like '%agent%' or conname like 'drafts_%')
  loop
    new_name := replace(replace(replace(item.conname, 'drafts', 'post_drafts'), 'agents', 'experiments'), 'agent', 'experiment');
    execute format('alter table public.%I rename constraint %I to %I', item.relation_name, item.conname, new_name);
  end loop;
  for item in
    select schemaname, indexname
    from pg_indexes
    where schemaname = 'public' and (indexname like '%agent%' or indexname like 'drafts_%')
  loop
    new_name := replace(replace(replace(item.indexname, 'drafts', 'post_drafts'), 'agents', 'experiments'), 'agent', 'experiment');
    execute format('alter index public.%I rename to %I', item.indexname, new_name);
  end loop;
  for item in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and (policyname like '%agent%' or policyname like 'drafts_%')
  loop
    new_name := replace(replace(replace(item.policyname, 'drafts', 'post_drafts'), 'agents', 'experiments'), 'agent', 'experiment');
    execute format('alter policy %I on public.%I rename to %I', item.policyname, item.tablename, new_name);
  end loop;
  for item in
    select event_object_table, trigger_name
    from information_schema.triggers
    where trigger_schema = 'public' and (trigger_name like '%agent%' or trigger_name like 'drafts_%')
  loop
    new_name := replace(replace(replace(item.trigger_name, 'drafts', 'post_drafts'), 'agents', 'experiments'), 'agent', 'experiment');
    execute format('alter trigger %I on public.%I rename to %I', item.trigger_name, item.event_object_table, new_name);
  end loop;
end
$rename_objects$;

-- Restore the expand migration's short-lived compatibility contract exactly.
create view public.agents with (security_invoker = true) as
select * from public.experiments;

create view public.drafts with (security_invoker = true) as
select
  id,
  source_post_id,
  experiment_id as agent_id,
  is_winner,
  judge_verdict,
  created_at,
  model_call_id,
  parent_draft_id,
  feedback,
  posted_at,
  posted_tweet_id,
  posted_url,
  platform,
  story_id,
  synthesis,
  translation,
  judge_review
from public.post_drafts;

grant all on table public.agents, public.drafts to anon, authenticated, service_role;

create function public.sync_issue_98_agent_id()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $sync$
declare
  agent_changed boolean;
  experiment_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.agent_id is null and new.experiment_id is null then
      raise exception 'issue 98 compatibility write requires agent_id or experiment_id';
    elsif new.agent_id is null then
      new.agent_id := new.experiment_id;
    elsif new.experiment_id is null then
      new.experiment_id := new.agent_id;
    elsif new.agent_id <> new.experiment_id then
      raise exception 'issue 98 compatibility IDs differ';
    end if;
  else
    agent_changed := new.agent_id is distinct from old.agent_id;
    experiment_changed := new.experiment_id is distinct from old.experiment_id;

    if agent_changed and not experiment_changed then
      new.experiment_id := new.agent_id;
    elsif experiment_changed and not agent_changed then
      new.agent_id := new.experiment_id;
    end if;

    if new.agent_id is null or new.experiment_id is null then
      raise exception 'issue 98 compatibility write requires agent_id and experiment_id on update';
    elsif new.agent_id <> new.experiment_id then
      raise exception 'issue 98 compatibility IDs differ';
    end if;
  end if;
  return new;
end
$sync$;

revoke all on function public.sync_issue_98_agent_id() from public;
comment on function public.sync_issue_98_agent_id() is
  'Temporary issue-98 compatibility trigger. Remove in the contract migration.';

do $compat$
declare
  child_table text;
  mismatch boolean;
begin
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    execute format('alter table public.%I add column agent_id uuid', child_table);
    execute format(
      'create trigger %I before insert or update of experiment_id, agent_id on public.%I for each row execute function public.sync_issue_98_agent_id()',
      child_table || '_issue_98_agent_id_sync', child_table
    );
    execute format('update public.%I set agent_id = experiment_id', child_table);
    execute format(
      'select exists (select 1 from public.%I where agent_id is distinct from experiment_id)', child_table
    ) into mismatch;
    if mismatch then
      raise exception 'issue 98 recovery compatibility backfill mismatch for %', child_table;
    end if;
  end loop;
end
$compat$;

alter table public.beat_conflicts add constraint beat_conflicts_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.corpus_posts add constraint corpus_posts_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.draft_claims add constraint draft_claims_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.slack_accounts add constraint slack_accounts_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.slack_delivery_receipts add constraint slack_delivery_receipts_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.stories add constraint stories_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.story_assignments add constraint story_assignments_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.voice_extraction_runs add constraint voice_extraction_runs_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.voice_guides add constraint voice_guides_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;
alter table public.voice_rules add constraint voice_rules_agent_id_matches_experiment_id check (agent_id = experiment_id), alter column agent_id set not null;

create index beat_conflicts_agent_id_compat_idx on public.beat_conflicts(agent_id);
create index corpus_posts_agent_id_compat_idx on public.corpus_posts(agent_id);
create index draft_claims_agent_id_compat_idx on public.draft_claims(agent_id);
create index slack_accounts_agent_id_compat_idx on public.slack_accounts(agent_id);
create index slack_delivery_receipts_agent_id_compat_idx on public.slack_delivery_receipts(agent_id);
create index stories_agent_id_compat_idx on public.stories(agent_id);
create index story_assignments_agent_id_compat_idx on public.story_assignments(agent_id);
create index voice_extraction_runs_agent_id_compat_idx on public.voice_extraction_runs(agent_id);
create index voice_guides_agent_id_compat_idx on public.voice_guides(agent_id);
create index voice_rules_agent_id_compat_idx on public.voice_rules(agent_id);

create unique index beat_conflicts_agent_id_source_post_id_compat_key on public.beat_conflicts(agent_id, source_post_id);
create unique index corpus_posts_agent_id_x_post_id_compat_key on public.corpus_posts(agent_id, x_post_id);
create unique index draft_claims_source_post_id_agent_id_compat_key on public.draft_claims(source_post_id, agent_id);
create unique index slack_accounts_agent_id_compat_key on public.slack_accounts(agent_id);
create unique index story_assignments_source_post_id_agent_id_compat_key on public.story_assignments(source_post_id, agent_id);
create unique index voice_extraction_runs_agent_id_compat_key on public.voice_extraction_runs(agent_id);
create unique index voice_guides_agent_id_compat_key on public.voice_guides(agent_id);

comment on view public.agents is 'Temporary issue-98 compatibility view. Remove in the contract migration.';
comment on view public.drafts is 'Temporary issue-98 compatibility view. Remove in the contract migration.';

do $postcondition$
declare
  child_table text;
begin
  if (select relkind from pg_class where oid = 'public.experiments'::regclass) <> 'r'
     or (select relkind from pg_class where oid = 'public.post_drafts'::regclass) <> 'r'
     or (select relkind from pg_class where oid = 'public.agents'::regclass) <> 'v'
     or (select relkind from pg_class where oid = 'public.drafts'::regclass) <> 'v' then
    raise exception 'issue 98 recovery postcondition: expected base tables and compatibility views';
  end if;
  if not exists (
    select 1 from pg_class c join pg_options_to_table(c.reloptions) o on true
    where c.oid = 'public.agents'::regclass and o.option_name = 'security_invoker' and o.option_value = 'true'
  ) or not exists (
    select 1 from pg_class c join pg_options_to_table(c.reloptions) o on true
    where c.oid = 'public.drafts'::regclass and o.option_name = 'security_invoker' and o.option_value = 'true'
  ) then
    raise exception 'issue 98 recovery postcondition: compatibility views must be security invoker';
  end if;
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = child_table and column_name = 'agent_id' and is_nullable = 'NO'
    ) or not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', child_table)::regclass
        and conname = child_table || '_agent_id_matches_experiment_id'
    ) or not exists (
      select 1 from information_schema.triggers
      where trigger_schema = 'public' and event_object_table = child_table
        and trigger_name = child_table || '_issue_98_agent_id_sync'
    ) then
      raise exception 'issue 98 recovery postcondition: compatibility alias incomplete for %', child_table;
    end if;
  end loop;
  if (select count(*) from pg_indexes where schemaname = 'public' and indexname like '%_agent_id_compat_idx') <> 10
     or (select count(*) from pg_indexes where schemaname = 'public' and indexname like '%_compat_key') <> 7 then
    raise exception 'issue 98 recovery postcondition: compatibility index set is incomplete';
  end if;
end
$postcondition$;

select pg_notify('pgrst', 'reload schema');
commit;

-- OPTIONAL, separately guarded retired-table reconstruction.
--
-- This is mutually exclusive with the compatibility views above: the retired
-- tables have the same agents/drafts names. It is disabled unless the operator
-- explicitly executes `set app.issue_98_recreate_retired_tables = 'on';` in
-- this SQL session. Enabling it intentionally replaces the two views, so use
-- it only for a forensic rehearsal/legacy-code recovery after taking another
-- backup. It recreates the zero-row schema exactly; it never restores rows.
do $optional_retired_tables$
begin
  if current_setting('app.issue_98_recreate_retired_tables', true) is distinct from 'on' then
    return;
  end if;

  if (select relkind from pg_class where oid = 'public.agents'::regclass) <> 'v'
     or (select relkind from pg_class where oid = 'public.drafts'::regclass) <> 'v' then
    raise exception 'issue 98 optional retired-table recreation requires compatibility views';
  end if;

  drop view public.drafts;
  drop view public.agents;

  create table public.agents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 120),
    beat text not null check (char_length(beat) > 0),
    handles text[] not null check (cardinality(handles) between 1 and 20),
    drafting_instructions text not null check (char_length(drafting_instructions) > 0),
    account_tier text not null check (account_tier in ('standard', 'premium')),
    scan_frequency jsonb not null,
    setup_session_id text,
    setup_transcript jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    status text not null default 'active' check (status in ('active', 'paused')),
    next_run_at timestamptz,
    search_template jsonb,
    constraint agents_active_has_next_run check (status <> 'active' or next_run_at is not null)
  );
  create index agents_user_id_idx on public.agents (user_id);
  create index agents_due_idx on public.agents (next_run_at) where status = 'active';
  alter table public.agents enable row level security;
  create policy "agents_select_own" on public.agents for select to authenticated using ((select auth.uid()) = user_id);
  create policy "agents_insert_own" on public.agents for insert to authenticated with check ((select auth.uid()) = user_id);
  create policy "agents_update_own" on public.agents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  create policy "agents_delete_own" on public.agents for delete to authenticated using ((select auth.uid()) = user_id);
  create trigger agents_set_updated_at before update on public.agents for each row execute function extensions.moddatetime(updated_at);

  create table public.runs (
    id uuid primary key default gen_random_uuid(),
    agent_id uuid not null references public.agents (id) on delete cascade,
    status text not null default 'running' check (status in ('running', 'done', 'failed')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    cost_grok numeric,
    usage jsonb,
    trace jsonb,
    result jsonb,
    error text,
    cost_deepseek numeric,
    source text not null default 'scheduled' check (source in ('scheduled', 'manual', 'onboarding'))
  );
  create index runs_agent_started_idx on public.runs (agent_id, started_at desc);
  alter table public.runs enable row level security;
  create policy "runs_select_own" on public.runs for select to authenticated using (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));

  create table public.drafts (
    id uuid primary key default gen_random_uuid(),
    agent_id uuid not null references public.agents (id) on delete cascade,
    item jsonb not null,
    text text not null,
    usage jsonb,
    created_at timestamptz not null default now(),
    posted_at timestamptz,
    posted_tweet_id text,
    posted_url text,
    cost_deepseek numeric,
    source text not null default 'manual' check (source in ('manual', 'onboarding'))
  );
  create index drafts_agent_created_idx on public.drafts (agent_id, created_at desc);
  alter table public.drafts enable row level security;
  create policy "drafts_select_own" on public.drafts for select to authenticated using (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));
  create policy "drafts_insert_own" on public.drafts for insert to authenticated with check (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));

  select pg_notify('pgrst', 'reload schema');
end
$optional_retired_tables$;
