-- Applied via the Supabase MCP server.
-- Remote migration: issue_98_fix_agent_id_sync_updates (version 20260730223821).
--
-- The issue-98 expand migration must already be applied. This only corrects
-- public.sync_issue_98_agent_id()'s UPDATE behavior; it does not alter data.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Prevent concurrent DDL while the ten compatibility triggers are checked and
-- their shared trigger function is replaced. Ordinary reads and writes remain
-- available, and the lock is held only for this short transaction.
lock table
  public.beat_conflicts,
  public.corpus_posts,
  public.draft_claims,
  public.slack_accounts,
  public.slack_delivery_receipts,
  public.stories,
  public.story_assignments,
  public.voice_extraction_runs,
  public.voice_guides,
  public.voice_rules
in share update exclusive mode;

do $preflight$
declare
  child_table text;
  expected_trigger text;
  trigger_count integer;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'issue 98 correction requires PostgreSQL 17 or newer';
  end if;

  if to_regprocedure('public.sync_issue_98_agent_id()') is null then
    raise exception 'issue 98 correction requires sync_issue_98_agent_id()';
  end if;

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
    if to_regclass('public.' || child_table) is null then
      raise exception 'issue 98 correction requires public.%', child_table;
    end if;

    if not exists (
      select 1
      from pg_attribute
      where attrelid = ('public.' || child_table)::regclass
        and attname in ('agent_id', 'experiment_id')
        and atttypid = 'uuid'::regtype
        and not attisdropped
      group by attrelid
      having count(*) = 2
    ) then
      raise exception 'issue 98 correction requires UUID agent_id and experiment_id on public.%', child_table;
    end if;

    expected_trigger := child_table || '_issue_98_agent_id_sync';
    select count(*)
    into trigger_count
    from pg_trigger
    where tgrelid = ('public.' || child_table)::regclass
      and tgname = expected_trigger
      and not tgisinternal
      and tgfoid = 'public.sync_issue_98_agent_id()'::regprocedure
      and tgtype = 23;

    if trigger_count <> 1 then
      raise exception 'issue 98 correction requires BEFORE INSERT OR UPDATE trigger % on public.%', expected_trigger, child_table;
    end if;
  end loop;
end
$preflight$;

create or replace function public.sync_issue_98_agent_id()
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

savepoint issue_98_agent_id_sync_fixture;

do $fixture$
declare
  id_a uuid := '11111111-1111-1111-1111-111111111111';
  id_b uuid := '22222222-2222-2222-2222-222222222222';
  id_c uuid := '33333333-3333-3333-3333-333333333333';
  id_d uuid := '44444444-4444-4444-4444-444444444444';
  id_e uuid := '55555555-5555-5555-5555-555555555555';
  saw_expected_failure boolean;
begin
  create temporary table issue_98_agent_id_sync_fixture (
    label text primary key,
    agent_id uuid,
    experiment_id uuid
  ) on commit drop;

  create trigger issue_98_agent_id_sync_fixture_trigger
    before insert or update of agent_id, experiment_id
    on issue_98_agent_id_sync_fixture
    for each row execute function public.sync_issue_98_agent_id();

  insert into issue_98_agent_id_sync_fixture (label, agent_id, experiment_id)
  values ('insert-agent', null, id_a), ('insert-experiment', id_b, null);

  if exists (
    select 1
    from issue_98_agent_id_sync_fixture
    where (label = 'insert-agent' and (agent_id, experiment_id) <> (id_a, id_a))
       or (label = 'insert-experiment' and (agent_id, experiment_id) <> (id_b, id_b))
  ) then
    raise exception 'issue 98 fixture: one-sided insert did not synchronize';
  end if;

  insert into issue_98_agent_id_sync_fixture (label, agent_id, experiment_id)
  values
    ('only-agent', id_a, id_a),
    ('only-experiment', id_a, id_a),
    ('both-same', id_a, id_a);

  update issue_98_agent_id_sync_fixture set agent_id = id_b where label = 'only-agent';
  update issue_98_agent_id_sync_fixture set experiment_id = id_c where label = 'only-experiment';
  update issue_98_agent_id_sync_fixture set agent_id = id_d, experiment_id = id_d where label = 'both-same';

  if exists (
    select 1
    from issue_98_agent_id_sync_fixture
    where (label = 'only-agent' and (agent_id, experiment_id) <> (id_b, id_b))
       or (label = 'only-experiment' and (agent_id, experiment_id) <> (id_c, id_c))
       or (label = 'both-same' and (agent_id, experiment_id) <> (id_d, id_d))
  ) then
    raise exception 'issue 98 fixture: update synchronization failed';
  end if;

  saw_expected_failure := false;
  begin
    insert into issue_98_agent_id_sync_fixture (label, agent_id, experiment_id)
    values ('both-different', id_a, id_a);
    update issue_98_agent_id_sync_fixture
    set agent_id = id_b, experiment_id = id_c
    where label = 'both-different';
  exception
    when raise_exception then
      saw_expected_failure := sqlerrm = 'issue 98 compatibility IDs differ';
  end;
  if not saw_expected_failure then
    raise exception 'issue 98 fixture: mismatched changed IDs were accepted';
  end if;

  alter table issue_98_agent_id_sync_fixture disable trigger issue_98_agent_id_sync_fixture_trigger;
  insert into issue_98_agent_id_sync_fixture (label, agent_id, experiment_id)
  values ('unchanged-mismatch', id_d, id_e);
  alter table issue_98_agent_id_sync_fixture enable trigger issue_98_agent_id_sync_fixture_trigger;

  saw_expected_failure := false;
  begin
    update issue_98_agent_id_sync_fixture
    set agent_id = agent_id
    where label = 'unchanged-mismatch';
  exception
    when raise_exception then
      saw_expected_failure := sqlerrm = 'issue 98 compatibility IDs differ';
  end;
  if not saw_expected_failure then
    raise exception 'issue 98 fixture: unchanged mismatch was accepted';
  end if;
end
$fixture$;

rollback to savepoint issue_98_agent_id_sync_fixture;

do $postflight$
begin
  if (select prosecdef from pg_proc where oid = 'public.sync_issue_98_agent_id()'::regprocedure) then
    raise exception 'issue 98 correction must retain security invoker semantics';
  end if;
  if not exists (
    select 1
    from pg_proc
    where oid = 'public.sync_issue_98_agent_id()'::regprocedure
      and proconfig @> array['search_path=pg_catalog']
  ) then
    raise exception 'issue 98 correction requires search_path = pg_catalog';
  end if;
  if has_function_privilege('public', 'public.sync_issue_98_agent_id()'::regprocedure, 'execute') then
    raise exception 'issue 98 correction must revoke PUBLIC execute';
  end if;
end
$postflight$;

select pg_notify('pgrst', 'reload schema');
commit;
-- Applied via the Supabase MCP server
