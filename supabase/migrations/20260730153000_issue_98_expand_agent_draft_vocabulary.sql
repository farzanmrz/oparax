-- Applied via the Supabase MCP server.
--
-- Issue #98, phase 1: provide a short-lived, security-invoker compatibility
-- contract while every deployed consumer moves from experiments/post_drafts to
-- agents/drafts. The contract migration removes the compatibility machinery.

begin;
set local lock_timeout = '5s';

lock table
  public.agents,
  public.beat_conflicts,
  public.corpus_posts,
  public.draft_claims,
  public.drafts,
  public.experiments,
  public.post_drafts,
  public.runs,
  public.slack_accounts,
  public.slack_delivery_receipts,
  public.stories,
  public.story_assignments,
  public.voice_extraction_runs,
  public.voice_guides,
  public.voice_rules
in access exclusive mode;

do $preflight$
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'issue 98 requires PostgreSQL 17 or newer';
  end if;
  if (select count(*) from public.experiments) <> 2 then
    raise exception 'issue 98 preflight: expected 2 experiments';
  end if;
  if (select count(*) from public.post_drafts) <> 591 then
    raise exception 'issue 98 preflight: expected 591 post_drafts';
  end if;
  if (select count(*) from public.agents) <> 0
     or (select count(*) from public.runs) <> 0
     or (select count(*) from public.drafts) <> 0 then
    raise exception 'issue 98 preflight: retired tables are no longer empty';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.experiments'::regclass and relkind = 'r')
     or not exists (select 1 from pg_class where oid = 'public.post_drafts'::regclass and relkind = 'r') then
    raise exception 'issue 98 preflight: canonical source tables are not ordinary tables';
  end if;
end
$preflight$;

-- These are retired, independently audited zero-row tables. RESTRICT is
-- intentional: any unexpected dependency aborts the complete transaction.
drop table public.runs restrict;
drop table public.drafts restrict;
drop table public.agents restrict;

-- Both views remain automatically updatable. security_invoker keeps the base
-- tables' existing RLS policies and grants as the authorization boundary.
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
set search_path = pg_catalog
as $sync$
begin
  if new.agent_id is null and new.experiment_id is null then
    raise exception 'issue 98 compatibility write requires agent_id or experiment_id';
  elsif new.agent_id is null then
    new.agent_id := new.experiment_id;
  elsif new.experiment_id is null then
    new.experiment_id := new.agent_id;
  elsif new.agent_id <> new.experiment_id then
    raise exception 'issue 98 compatibility IDs differ';
  end if;
  return new;
end
$sync$;

revoke all on function public.sync_issue_98_agent_id() from public, anon, authenticated;
comment on function public.sync_issue_98_agent_id() is
  'Temporary issue-98 compatibility trigger. Remove in the contract migration.';

do $compat$
declare
  child_table text;
  mismatch boolean;
begin
  foreach child_table in array array[
    'beat_conflicts',
    'corpus_posts',
    'draft_claims',
    'slack_accounts',
    'slack_delivery_receipts',
    'stories',
    'story_assignments',
    'voice_extraction_runs',
    'voice_guides',
    'voice_rules'
  ] loop
    execute format('alter table public.%I add column agent_id uuid', child_table);
    execute format(
      'create trigger %I before insert or update of experiment_id, agent_id on public.%I for each row execute function public.sync_issue_98_agent_id()',
      child_table || '_issue_98_agent_id_sync', child_table
    );
    execute format('update public.%I set agent_id = experiment_id', child_table);
    execute format(
      'select exists (select 1 from public.%I where agent_id is distinct from experiment_id)',
      child_table
    ) into mismatch;
    if mismatch then
      raise exception 'issue 98 compatibility backfill mismatch for %', child_table;
    end if;
  end loop;
end
$compat$;

-- Keep the alias non-null and equality-bound for the compatibility interval.
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
select pg_notify('pgrst', 'reload schema');
commit;
