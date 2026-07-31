-- Apply only through the Supabase MCP after beta, main, and Railway run the
-- renamed contract. In the same session before this file, the operator must run:
--   set app.issue_98_contract_release_authorization = 'beta-main-railway-ready';
--   set app.issue_98_contract_frozen_baseline = '<JSON manifest>';
-- The manifest must contain an array for every relation in issue_98_contract_relations
-- below. Each entry is {"id": "uuid"}; every non-agent entry also carries the
-- frozen {"agent_id": "uuid"}. It is the immutable pre-expand subset, not a count.
begin;
set local lock_timeout = '5s';

lock table public.experiments, public.post_drafts, public.beat_conflicts, public.corpus_posts,
  public.draft_claims, public.slack_accounts, public.slack_delivery_receipts, public.stories,
  public.story_assignments, public.voice_extraction_runs, public.voice_guides, public.voice_rules
in access exclusive mode;

create temp table issue_98_contract_relations (
  relation_name text primary key,
  has_agent_id boolean not null
) on commit drop;
insert into issue_98_contract_relations values
  ('agents', false), ('drafts', true), ('beat_conflicts', true), ('corpus_posts', true),
  ('draft_claims', true), ('slack_accounts', true), ('slack_delivery_receipts', true),
  ('stories', true), ('story_assignments', true), ('voice_extraction_runs', true),
  ('voice_guides', true), ('voice_rules', true);

create temp table issue_98_contract_baseline (
  relation_name text not null,
  id uuid not null,
  agent_id uuid,
  primary key (relation_name, id)
) on commit drop;

create temp table issue_98_contract_grants as
select table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('experiments', 'post_drafts', 'beat_conflicts', 'corpus_posts',
    'draft_claims', 'slack_accounts', 'slack_delivery_receipts', 'stories',
    'story_assignments', 'voice_extraction_runs', 'voice_guides', 'voice_rules');

create temp table issue_98_contract_rls as
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in ('public.experiments'::regclass, 'public.post_drafts'::regclass,
  'public.beat_conflicts'::regclass, 'public.corpus_posts'::regclass,
  'public.draft_claims'::regclass, 'public.slack_accounts'::regclass,
  'public.slack_delivery_receipts'::regclass, 'public.stories'::regclass,
  'public.story_assignments'::regclass, 'public.voice_extraction_runs'::regclass,
  'public.voice_guides'::regclass, 'public.voice_rules'::regclass);

create temp table issue_98_contract_policies as
select c.relname as table_name, p.polname, p.polpermissive, p.polroles, p.polcmd
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('experiments', 'post_drafts', 'beat_conflicts', 'corpus_posts',
    'draft_claims', 'slack_accounts', 'slack_delivery_receipts', 'stories',
    'story_assignments', 'voice_extraction_runs', 'voice_guides', 'voice_rules');

do $preflight$
declare
  child_table text;
  required_index text;
  required_unique_index text;
  expected_unique_columns text;
  mismatch boolean;
  baseline jsonb := current_setting('app.issue_98_contract_frozen_baseline', true)::jsonb;
  relation_spec record;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'issue 98 contract requires PostgreSQL 17 or newer';
  end if;
  if current_setting('app.issue_98_contract_release_authorization', true)
       is distinct from 'beta-main-railway-ready' then
    raise exception 'issue 98 contract requires explicit beta/main/Railway readiness authorization';
  end if;
  if baseline is null or jsonb_typeof(baseline) <> 'object' then
    raise exception 'issue 98 contract requires an operator-supplied frozen baseline manifest';
  end if;
  if to_regclass('public.agents') is null or to_regclass('public.drafts') is null
     or (select relkind from pg_class where oid = 'public.agents'::regclass) <> 'v'
     or (select relkind from pg_class where oid = 'public.drafts'::regclass) <> 'v'
     or not coalesce((select 'security_invoker=true' = any(reloptions)
                       from pg_class where oid = 'public.agents'::regclass), false)
     or not coalesce((select 'security_invoker=true' = any(reloptions)
                       from pg_class where oid = 'public.drafts'::regclass), false) then
    raise exception 'issue 98 contract requires security-invoker compatibility views';
  end if;
  if not exists (select 1 from pg_rewrite r join pg_depend d on d.objid = r.oid
                where r.ev_class = 'public.agents'::regclass and d.refobjid = 'public.experiments'::regclass)
     or not exists (select 1 from pg_rewrite r join pg_depend d on d.objid = r.oid
                    where r.ev_class = 'public.drafts'::regclass and d.refobjid = 'public.post_drafts'::regclass)
     or not exists (select 1 from pg_attribute
                    where attrelid = 'public.drafts'::regclass and attname = 'agent_id' and not attisdropped) then
    raise exception 'issue 98 contract compatibility views have an unexpected definition';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.experiments'::regclass and relkind = 'r')
     or not exists (select 1 from pg_class where oid = 'public.post_drafts'::regclass and relkind = 'r') then
    raise exception 'issue 98 contract requires ordinary source tables';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.sync_issue_98_agent_id()'::regprocedure
                 and prosecdef is false and proconfig @> array['search_path=pg_catalog'])
     or has_function_privilege('anon', 'public.sync_issue_98_agent_id()'::regprocedure, 'execute')
     or has_function_privilege('authenticated', 'public.sync_issue_98_agent_id()'::regprocedure, 'execute') then
    raise exception 'issue 98 contract requires the locked-down compatibility sync function';
  end if;

  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    if not exists (select 1 from pg_attribute
                   where attrelid = format('public.%I', child_table)::regclass
                     and attname = 'experiment_id' and attnotnull and not attisdropped)
       or not exists (select 1 from pg_attribute
                      where attrelid = format('public.%I', child_table)::regclass
                        and attname = 'agent_id' and attnotnull and atttypid = 'uuid'::regtype
                        and not attisdropped)
       or not exists (select 1 from pg_constraint
                      where conrelid = format('public.%I', child_table)::regclass
                        and conname = child_table || '_agent_id_matches_experiment_id'
                        and contype = 'c' and convalidated
                        and pg_get_constraintdef(oid) = 'CHECK ((agent_id = experiment_id))')
       or not exists (select 1 from pg_trigger
                      where tgrelid = format('public.%I', child_table)::regclass
                        and tgname = child_table || '_issue_98_agent_id_sync'
                        and tgenabled = 'O'
                        and tgfoid = 'public.sync_issue_98_agent_id()'::regprocedure) then
      raise exception 'issue 98 contract requires complete compatibility aliases on %', child_table;
    end if;
    required_index := child_table || '_agent_id_compat_idx';
    if not exists (select 1 from pg_class c join pg_index i on i.indexrelid = c.oid
                   where c.relnamespace = 'public'::regnamespace and c.relname = required_index
                     and i.indisvalid and i.indisunique is false
                     and pg_get_indexdef(i.indexrelid) like '%(agent_id)%') then
      raise exception 'issue 98 contract requires compatibility index %', required_index;
    end if;
  end loop;
  foreach required_unique_index in array array[
    'beat_conflicts_agent_id_source_post_id_compat_key',
    'corpus_posts_agent_id_x_post_id_compat_key',
    'draft_claims_source_post_id_agent_id_compat_key',
    'slack_accounts_agent_id_compat_key',
    'story_assignments_source_post_id_agent_id_compat_key',
    'voice_extraction_runs_agent_id_compat_key',
    'voice_guides_agent_id_compat_key'
  ] loop
    expected_unique_columns := case required_unique_index
      when 'beat_conflicts_agent_id_source_post_id_compat_key' then '(agent_id, source_post_id)'
      when 'corpus_posts_agent_id_x_post_id_compat_key' then '(agent_id, x_post_id)'
      when 'draft_claims_source_post_id_agent_id_compat_key' then '(source_post_id, agent_id)'
      when 'slack_accounts_agent_id_compat_key' then '(agent_id)'
      when 'story_assignments_source_post_id_agent_id_compat_key' then '(source_post_id, agent_id)'
      when 'voice_extraction_runs_agent_id_compat_key' then '(agent_id)'
      when 'voice_guides_agent_id_compat_key' then '(agent_id)'
    end;
    if not exists (select 1 from pg_class c join pg_index i on i.indexrelid = c.oid
                   where c.relnamespace = 'public'::regnamespace and c.relname = required_unique_index
                     and i.indisvalid and i.indisunique
                     and pg_get_indexdef(i.indexrelid) like '%' || expected_unique_columns || '%') then
      raise exception 'issue 98 contract requires compatibility unique target %', required_unique_index;
    end if;
  end loop;

  for relation_spec in select * from issue_98_contract_relations loop
    if jsonb_typeof(baseline -> relation_spec.relation_name) <> 'array' then
      raise exception 'issue 98 frozen baseline is missing % array', relation_spec.relation_name;
    end if;
    if relation_spec.relation_name = 'agents' then
      if exists (select 1 from jsonb_array_elements(baseline -> relation_spec.relation_name) entry
                 where jsonb_typeof(entry) <> 'object' or not (entry ? 'id')) then
        raise exception 'issue 98 frozen agents entries require id';
      end if;
      if exists (select 1 from jsonb_array_elements(baseline -> relation_spec.relation_name) entry
                 where not exists (select 1 from public.experiments e where e.id = (entry ->> 'id')::uuid)) then
        raise exception 'issue 98 frozen agent ID is absent';
      end if;
    else
      if exists (select 1 from jsonb_array_elements(baseline -> relation_spec.relation_name) entry
                 where jsonb_typeof(entry) <> 'object' or not (entry ? 'id') or not (entry ? 'agent_id')) then
        raise exception 'issue 98 frozen % entries require id and agent_id', relation_spec.relation_name;
      end if;
      execute format(
        'select exists (select 1 from jsonb_array_elements($1 -> %L) entry where not exists (select 1 from public.%I t where t.id = (entry ->> ''id'')::uuid and %I = (entry ->> ''agent_id'')::uuid))',
        relation_spec.relation_name,
        case when relation_spec.relation_name = 'drafts' then 'post_drafts' else relation_spec.relation_name end,
        'experiment_id'
      ) using baseline into mismatch;
      if mismatch then
        raise exception 'issue 98 frozen % ID or relationship changed', relation_spec.relation_name;
      end if;
    end if;
  end loop;
end
$preflight$;

-- Capture the fresh locked baseline after validating the immutable pre-expand subset.
insert into issue_98_contract_baseline(relation_name, id)
select 'agents', id from public.experiments;
insert into issue_98_contract_baseline(relation_name, id, agent_id)
select 'drafts', id, experiment_id from public.post_drafts;

do $baseline$
declare child_table text;
begin
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    execute format('insert into issue_98_contract_baseline(relation_name, id, agent_id) select %L, id, experiment_id from public.%I', child_table, child_table);
  end loop;
end
$baseline$;

drop view public.drafts;
drop view public.agents;

drop index public.beat_conflicts_agent_id_source_post_id_compat_key;
drop index public.corpus_posts_agent_id_x_post_id_compat_key;
drop index public.draft_claims_source_post_id_agent_id_compat_key;
drop index public.slack_accounts_agent_id_compat_key;
drop index public.story_assignments_source_post_id_agent_id_compat_key;
drop index public.voice_extraction_runs_agent_id_compat_key;
drop index public.voice_guides_agent_id_compat_key;

do $cleanup$
declare child_table text;
begin
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    execute format('drop trigger %I on public.%I', child_table || '_issue_98_agent_id_sync', child_table);
    execute format('alter table public.%I drop constraint %I', child_table, child_table || '_agent_id_matches_experiment_id');
    execute format('drop index public.%I', child_table || '_agent_id_compat_idx');
    execute format('alter table public.%I drop column agent_id', child_table);
  end loop;
end
$cleanup$;

drop function public.sync_issue_98_agent_id();

alter table public.experiments rename to agents;
alter table public.post_drafts rename to drafts;

do $rename_columns$
declare child_table text;
begin
  foreach child_table in array array[
    'beat_conflicts', 'corpus_posts', 'draft_claims', 'drafts', 'slack_accounts',
    'slack_delivery_receipts', 'stories', 'story_assignments',
    'voice_extraction_runs', 'voice_guides', 'voice_rules'
  ] loop
    execute format('alter table public.%I rename column experiment_id to agent_id', child_table);
  end loop;
end
$rename_columns$;

do $rename_objects$
declare item record; new_name text;
begin
  for item in select r.relname as relation_name, conname from pg_constraint c join pg_class r on r.oid = c.conrelid where connamespace = 'public'::regnamespace and (conname like '%experiment%' or conname like 'experiments_%' or conname like 'post_drafts_%') loop
    new_name := replace(replace(replace(item.conname, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent');
    execute format('alter table public.%I rename constraint %I to %I', item.relation_name, item.conname, new_name);
  end loop;
  for item in select schemaname, indexname from pg_indexes where schemaname = 'public' and (indexname like '%experiment%' or indexname like 'experiments_%' or indexname like 'post_drafts_%') loop
    new_name := replace(replace(replace(item.indexname, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent');
    execute format('alter index public.%I rename to %I', item.indexname, new_name);
  end loop;
  for item in select tablename, policyname from pg_policies where schemaname = 'public' and (policyname like '%experiment%' or policyname like 'experiments_%' or policyname like 'post_drafts_%') loop
    new_name := replace(replace(replace(item.policyname, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent');
    execute format('alter policy %I on public.%I rename to %I', item.policyname, item.tablename, new_name);
  end loop;
  for item in select event_object_table, trigger_name from information_schema.triggers where trigger_schema = 'public' and (trigger_name like '%experiment%' or trigger_name like 'experiments_%' or trigger_name like 'post_drafts_%') loop
    new_name := replace(replace(replace(item.trigger_name, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent');
    execute format('alter trigger %I on public.%I rename to %I', item.trigger_name, item.event_object_table, new_name);
  end loop;
end
$rename_objects$;

do $postconditions$
declare relation_spec record; relation_name text; mismatch boolean; current_count bigint;
begin
  if to_regclass('public.experiments') is not null or to_regclass('public.post_drafts') is not null
     or to_regprocedure('public.sync_issue_98_agent_id()') is not null
     or (select relkind from pg_class where oid = 'public.agents'::regclass) <> 'r'
     or (select relkind from pg_class where oid = 'public.drafts'::regclass) <> 'r' then
    raise exception 'issue 98 contract did not leave canonical base tables only';
  end if;
  for relation_spec in select * from issue_98_contract_relations loop
    relation_name := relation_spec.relation_name;
    if relation_spec.has_agent_id and not exists (select 1 from pg_attribute where attrelid = format('public.%I', relation_name)::regclass and attname = 'agent_id' and attnotnull and not attisdropped) then
      raise exception 'issue 98 contract missing canonical %.agent_id', relation_name;
    end if;
    if exists (select 1 from pg_attribute where attrelid = format('public.%I', relation_name)::regclass and attname = 'experiment_id' and not attisdropped) then
      raise exception 'issue 98 contract left stale %.experiment_id', relation_name;
    end if;
    if relation_spec.has_agent_id then
      execute format('select exists (select 1 from issue_98_contract_baseline b left join public.%I t on t.id = b.id and t.agent_id = b.agent_id where b.relation_name = %L and t.id is null)', relation_name, relation_name) into mismatch;
    else
      execute format('select exists (select 1 from issue_98_contract_baseline b left join public.%I t on t.id = b.id where b.relation_name = %L and t.id is null)', relation_name, relation_name) into mismatch;
    end if;
    if mismatch then
      raise exception 'issue 98 contract lost a fresh-baseline ID or relationship';
    end if;
    execute format('select count(*) from public.%I', relation_name) into current_count;
    if current_count <> (select count(*) from issue_98_contract_baseline b where b.relation_name = relation_spec.relation_name) then
      raise exception 'issue 98 contract changed fresh-baseline row count for %', relation_spec.relation_name;
    end if;
  end loop;
  if exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relname ~ '(experiment|post_drafts|compat|issue_98)')
     or exists (select 1 from pg_constraint where connamespace = 'public'::regnamespace and conname ~ '(experiment|post_drafts|compat|issue_98)')
     or exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace and p.polname ~ '(experiment|post_drafts|compat|issue_98)')
     or exists (select 1 from pg_trigger where tgname ~ '(experiment|post_drafts|compat|issue_98)')
     or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname ~ '(experiment|post_drafts|compat|issue_98)') then
    raise exception 'issue 98 contract left compatibility or stale object names';
  end if;
  if exists (select 1 from issue_98_contract_rls b join pg_class c on c.relname = replace(replace(b.relname, 'experiments', 'agents'), 'post_drafts', 'drafts') and c.relnamespace = 'public'::regnamespace where (c.relrowsecurity, c.relforcerowsecurity) is distinct from (b.relrowsecurity, b.relforcerowsecurity))
     or exists ((select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts'), grantee, privilege_type, is_grantable from issue_98_contract_grants) except (select table_name, grantee, privilege_type, is_grantable from information_schema.role_table_grants where table_schema = 'public'))
     or exists ((select table_name, grantee, privilege_type, is_grantable from information_schema.role_table_grants where table_schema = 'public' and table_name in (select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts') from issue_98_contract_grants)) except (select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts'), grantee, privilege_type, is_grantable from issue_98_contract_grants)) then
    raise exception 'issue 98 contract changed RLS or table grants';
  end if;
  if exists ((select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts'), replace(replace(replace(polname, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent'), polpermissive, polroles, polcmd from issue_98_contract_policies) except (select c.relname, p.polname, p.polpermissive, p.polroles, p.polcmd from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace))
     or exists ((select c.relname, p.polname, p.polpermissive, p.polroles, p.polcmd from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace and c.relname in (select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts') from issue_98_contract_policies)) except (select replace(replace(table_name, 'experiments', 'agents'), 'post_drafts', 'drafts'), replace(replace(replace(polname, 'post_drafts', 'drafts'), 'experiments', 'agents'), 'experiment', 'agent'), polpermissive, polroles, polcmd from issue_98_contract_policies)) then
    raise exception 'issue 98 contract changed policy posture';
  end if;
  if (select count(*) from pg_policy where polrelid = 'public.agents'::regclass) <> 4
     or (select count(*) from pg_policy where polrelid = 'public.drafts'::regclass) <> 2
     or exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace and (p.polname like '%experiment%' or pg_get_expr(p.polqual, p.polrelid) like '%experiment%' or pg_get_expr(p.polwithcheck, p.polrelid) like '%experiment%')) then
    raise exception 'issue 98 contract policy posture is not canonical';
  end if;
end
$postconditions$;

select pg_notify('pgrst', 'reload schema');
commit;
