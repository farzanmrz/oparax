-- Applied via the Supabase MCP server
begin;

drop table if exists
  public.agents,
  public.alerts,
  public.beat_conflicts,
  public.dm_connections,
  public.dm_send_ledger,
  public.draft_claims,
  public.drafts,
  public.excluded_posts,
  public.model_calls,
  public.onboard_attempts,
  public.source_configs,
  public.source_posts,
  public.source_seen_items,
  public.stories,
  public.story_assignments,
  public.unmatched_deliveries,
  public.usage_events,
  public.x_accounts,
  public.x_handle_checks,
  public.x_webhook_events
restrict;

drop function if exists public.add_source_config(uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text, jsonb) restrict;
drop function if exists public.attach_or_create_story(uuid, uuid, text, uuid, uuid[]) restrict;
drop function if exists public.claim_draft(uuid, uuid, timestamp with time zone, uuid) restrict;
drop function if exists public.claim_strip_phrase_refresh_attempt(uuid) restrict;
drop function if exists public.complete_claimed_attachment(uuid, uuid, uuid, uuid) restrict;
drop function if exists public.delete_account() restrict;
drop function if exists public.detect_spend_anomalies(timestamp with time zone, integer, numeric) restrict;
drop function if exists public.insert_claimed_winner(uuid, uuid, uuid, uuid, text, text, text, jsonb, text) restrict;
drop function if exists public.record_seen_item(uuid, text, boolean) restrict;
drop function if exists public.refresh_source_strip_phrases(uuid, uuid, jsonb, uuid) restrict;
drop function if exists public.remove_source_config(uuid, text) restrict;
drop function if exists public.reserve_dm_send(text, text, uuid, text) restrict;
drop function if exists public.reserve_pending_source_config(uuid, text, text, text, integer) restrict;
drop function if exists public.unseen_item_keys(uuid, text[]) restrict;
drop function if exists public.upsert_claimed_exclusion(uuid, uuid, uuid, text, timestamp with time zone) restrict;

drop type if exists public.publisher_claim_kind restrict;

do $$
declare
  survivor_count integer;
begin
  select count(*)
  into survivor_count
  from (
    select c.oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'S')
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
    union all
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
    union all
    select t.oid
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typrelid = 0
      and t.typtype in ('b', 'd', 'e', 'r')
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_type'::regclass
          and d.objid = t.oid
          and d.deptype = 'e'
      )
    union all
    select 1
    from pg_policies
    where schemaname = 'public'
    union all
    select t.oid
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
  ) survivors;

  if survivor_count <> 0 then
    raise exception 'Legacy public objects survived teardown: %', survivor_count;
  end if;
end
$$;

commit;
