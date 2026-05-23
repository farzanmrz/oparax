alter table public.scan_items
  add column if not exists published_at timestamp with time zone;

update public.scan_items
set published_at = to_timestamp(
  (
    (
      (
        substring(
          primary_tweet_url
          from '(?:x|twitter)\.com/[^/[:space:]]+/status/([0-9]+)'
        )::bigint >> 22
      ) + 1288834974657
    )::numeric / 1000
  )
)
where published_at is null
  and primary_tweet_url ~ '(?:x|twitter)\.com/[^/[:space:]]+/status/[0-9]+';

create index if not exists scan_items_workflow_published_at_idx
  on public.scan_items (workflow_id, published_at desc)
  where published_at is not null;

drop function if exists public.claim_due_workflow_trigger();

create function public.claim_due_workflow_trigger()
returns table (
  trigger_id uuid,
  workflow_id uuid,
  workflow_name text,
  workflow_description text,
  trigger_config jsonb,
  frequency_amount integer,
  frequency_unit public.trigger_frequency_unit,
  last_run_at timestamp with time zone,
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
    triggers.frequency_unit,
    triggers.last_run_at
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
  last_run_at := claimed.last_run_at;
  claimed_at := now_at;
  scheduled_next_run_at := next_at;
  return next;
end;
$$;

revoke all on function public.claim_due_workflow_trigger() from public, anon, authenticated;
grant execute on function public.claim_due_workflow_trigger() to service_role;
