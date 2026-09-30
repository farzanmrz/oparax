-- Applied via the Supabase MCP server
begin;

do $$
declare
  v_old jsonb;
  v_new jsonb;
  v_old_found boolean;
  v_new_found boolean;
  v_monitors bigint;
begin
  lock table public.config in share row exclusive mode;
  perform 1 from public.config
  where key in ('anon_budget_usd', 'build_budget_usd')
  order by key for update;
  lock table public.monitors in access exclusive mode;

  select value into v_old from public.config where key = 'anon_budget_usd';
  v_old_found := found;
  select value into v_new from public.config where key = 'build_budget_usd';
  v_new_found := found;
  select count(*) into v_monitors from public.monitors;

  if v_monitors <> 0 then
    raise exception 'signup_first premise conflict: public.monitors contains % rows', v_monitors;
  end if;
  if not v_old_found and not v_new_found then
    raise exception 'signup_first premise conflict: both build budget config keys are missing';
  end if;
  if (v_old_found and jsonb_typeof(v_old) is distinct from 'number')
     or (v_new_found and jsonb_typeof(v_new) is distinct from 'number') then
    raise exception 'signup_first premise conflict: build budget config value is not numeric';
  end if;
  if v_old_found and v_new_found
     and (v_old #>> '{}')::numeric is distinct from (v_new #>> '{}')::numeric then
    raise exception 'signup_first premise conflict: build budget config values differ';
  end if;

  if v_old_found and v_new_found then
    delete from public.config where key = 'anon_budget_usd';
  elsif v_old_found then
    update public.config
    set key = 'build_budget_usd', updated_at = now()
    where key = 'anon_budget_usd';
  end if;
end;
$$;

alter table public.monitors
  alter column user_id set not null,
  drop constraint monitors_status_check,
  add constraint monitors_status_check check (status in ('building', 'failed', 'live')),
  add constraint monitors_x_user_id_digits_check
    check (x_user_id is null or x_user_id ~ '^[0-9]+$'),
  add constraint monitors_unconfirmed_identity_check check (
    x_user_id is not null or (
      status in ('building', 'failed')
      and build_step = 0
      and profile is null
      and brief is null
      and build_finished_at is null
      and trial_started_at is null
      and subscriber_x_user_id is null
      and bot_state = 'none'
    )
  ),
  add constraint monitors_subscriber_identity_check check (
    subscriber_x_user_id is null or
    (x_user_id is not null and subscriber_x_user_id = x_user_id)
  ),
  add constraint monitors_completion_check check (
    (status in ('building', 'failed')
      and build_finished_at is null
      and trial_started_at is null)
    or
    (status = 'live'
      and x_user_id is not null
      and build_finished_at is not null
      and trial_started_at is not null
      and build_finished_at = trial_started_at)
  ),
  drop column built_by,
  drop column last_viewed_at,
  drop column bot_code,
  drop column bot_code_expires_at;

create function public.guard_monitor_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'monitor user ownership is immutable';
  end if;
  if old.x_user_id is not null and new.x_user_id is distinct from old.x_user_id then
    raise exception 'monitor X identity is immutable once set';
  end if;
  if old.build_finished_at is not null
     and new.build_finished_at is distinct from old.build_finished_at then
    raise exception 'monitor completion time is immutable once set';
  end if;
  if old.trial_started_at is not null
     and new.trial_started_at is distinct from old.trial_started_at then
    raise exception 'monitor trial time is immutable once set';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_monitor_identity() from public, anon, authenticated;
grant execute on function public.guard_monitor_identity() to service_role;
create trigger monitors_identity_guard
  before update on public.monitors
  for each row execute function public.guard_monitor_identity();

alter table public.handle_waitlist
  drop constraint handle_waitlist_pkey,
  add column id uuid not null default gen_random_uuid(),
  add column user_id uuid,
  add column handle_source text not null default 'legacy';

alter table public.handle_waitlist
  add constraint handle_waitlist_pkey primary key (id),
  add constraint handle_waitlist_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null,
  add constraint handle_waitlist_handle_source_check
    check (handle_source in ('legacy', 'x_identity', 'typed')),
  add constraint handle_waitlist_legacy_check
    check ((user_id is null) = (handle_source = 'legacy')),
  add constraint handle_waitlist_user_handle_key unique (user_id, handle);

-- User deletion clears ownership; legacy source keeps the row compatible with the null-owner check.
create function public.normalize_deleted_waitlist_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.user_id is not null and new.user_id is null then
    new.handle_source := 'legacy';
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_deleted_waitlist_owner() from public, anon, authenticated;
grant execute on function public.normalize_deleted_waitlist_owner() to service_role;
create trigger handle_waitlist_owner_deleted
  before update on public.handle_waitlist
  for each row execute function public.normalize_deleted_waitlist_owner();

create function public.admit_build(
  p_user_id uuid,
  p_handle text,
  p_display_handle text,
  p_beat text,
  p_alert_timezone text,
  p_run_id text,
  p_lease_seconds integer,
  p_x_user_id text default null
)
returns table (outcome text, monitor_id uuid, handle text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_budget numeric;
  v_monitor_id uuid;
  v_handle text;
  v_now timestamptz;
begin
  if p_user_id is null or p_handle is null or p_display_handle is null
     or p_beat is null or p_run_id is null or p_run_id = ''
     or p_lease_seconds is null or p_lease_seconds <= 0
     or p_handle is distinct from lower(p_handle)
     or p_handle !~ '^[a-z0-9_]{1,15}$'
     or lower(p_display_handle) is distinct from p_handle
     or p_display_handle !~ '^[A-Za-z0-9_]{1,15}$'
     or char_length(p_beat) > 300 or char_length(btrim(p_beat)) = 0
     or (p_x_user_id is not null and p_x_user_id !~ '^[0-9]+$') then
    raise exception 'invalid build admission input';
  end if;

  select (value #>> '{}')::numeric into v_budget
  from public.config where key = 'build_budget_usd' for update;
  if not found or v_budget is null then
    return query select 'closed'::text, null::uuid, null::text;
    return;
  end if;

  select id, monitors.handle::text into v_monitor_id, v_handle
  from public.monitors
  where user_id = p_user_id
  for update;
  if found then
    return query select 'existing'::text, v_monitor_id, v_handle;
    return;
  end if;

  if p_x_user_id is not null and exists (
    select 1 from public.monitors m
    where m.x_user_id = p_x_user_id and m.user_id is distinct from p_user_id
  ) then
    return query select 'ownership_conflict'::text, null::uuid, null::text;
    return;
  end if;
  if exists (
    select 1 from public.monitors m
    where m.handle = p_handle::public.citext and m.user_id is distinct from p_user_id
  ) then
    return query select 'handle_conflict'::text, null::uuid, null::text;
    return;
  end if;

  if (select coalesce(sum(usd), 0) from public.cost_ledger where service = 'reservation') + 3 > v_budget then
    return query select 'closed'::text, null::uuid, null::text;
    return;
  end if;

  v_now := clock_timestamp();
  insert into public.monitors (
    handle, display_handle, x_user_id, beat, status, build_step, build_log,
    build_tries, build_lease_until, build_lease_owner, build_started_at,
    user_id, tier, alert_timezone
  ) values (
    p_handle, p_display_handle, p_x_user_id, p_beat, 'building', 0, '[]'::jsonb,
    1, v_now + make_interval(secs => p_lease_seconds), p_run_id, v_now,
    p_user_id, 'free', p_alert_timezone
  ) returning id, monitors.handle::text into v_monitor_id, v_handle;

  insert into public.cost_ledger (
    service, kind, monitor_id, external_id, run_id, usd, usd_reserved, settled
  ) values (
    'reservation', 'build', v_monitor_id, v_monitor_id::text, p_run_id, 3, 3, true
  );

  return query select 'admitted'::text, v_monitor_id, v_handle;
end;
$$;

create function public.confirm_build_identity(
  p_monitor uuid,
  p_run_id text,
  p_x_user_id text,
  p_display_handle text,
  p_build_state jsonb
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_handle text;
  v_stored_x_user_id text;
  v_status text;
  v_lease_owner text;
  v_lease_until timestamptz;
  v_build_step integer;
  v_build_finished_at timestamptz;
  v_trial_started_at timestamptz;
  v_profile jsonb;
  v_profile_id text;
  v_profile_handle text;
  v_now timestamptz;
begin
  perform 1 from public.config where key = 'build_budget_usd' for update;
  if not found then
    raise exception 'build budget config row is missing';
  end if;

  select m.handle::text, m.x_user_id, m.status, m.build_lease_owner,
         m.build_lease_until, m.build_step, m.build_finished_at, m.trial_started_at
  into v_handle, v_stored_x_user_id, v_status, v_lease_owner,
       v_lease_until, v_build_step, v_build_finished_at, v_trial_started_at
  from public.monitors m where m.id = p_monitor for update;
  v_now := clock_timestamp();
  if not found or v_status is distinct from 'building'
     or p_run_id is null or v_lease_owner is distinct from p_run_id
     or v_lease_until is null or v_lease_until <= v_now
     or v_build_finished_at is not null or v_trial_started_at is not null then
    return 'lease_lost';
  end if;

  v_profile := p_build_state -> 'profile';
  v_profile_id := v_profile ->> 'id';
  v_profile_handle := v_profile ->> 'handle';
  if jsonb_typeof(p_build_state) is distinct from 'object'
     or jsonb_typeof(v_profile) is distinct from 'object'
     or p_x_user_id is null or p_x_user_id !~ '^[0-9]+$'
     or v_profile_id is null or v_profile_id !~ '^[0-9]+$'
     or v_profile_id is distinct from p_x_user_id
     or p_display_handle is null
     or lower(p_display_handle) is distinct from v_handle
     or v_profile_handle is null then
    return 'identity_mismatch';
  end if;
  if left(v_profile_handle, 1) = '@' then
    v_profile_handle := substring(v_profile_handle from 2);
  end if;
  if lower(v_profile_handle) is distinct from v_handle
     or lower(v_profile_handle) is distinct from lower(p_display_handle) then
    return 'identity_mismatch';
  end if;
  if v_stored_x_user_id is not null
     and v_stored_x_user_id is distinct from p_x_user_id then
    return 'identity_mismatch';
  end if;
  if exists (
    select 1 from public.monitors m
    where m.x_user_id = p_x_user_id and m.id is distinct from p_monitor
  ) then
    return 'ownership_conflict';
  end if;

  if v_build_step >= 1 and v_stored_x_user_id = p_x_user_id then
    return 'confirmed';
  end if;

  update public.monitors as m
  set x_user_id = p_x_user_id,
      display_handle = p_display_handle,
      profile = v_profile,
      build_state = p_build_state,
      build_step = 1,
      build_log = build_log || jsonb_build_array(jsonb_build_object(
        'step', 1,
        'message', 'Profile identity confirmed',
        'at', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ))
  where id = p_monitor;
  return 'confirmed';
end;
$$;

create function public.release_build(p_monitor uuid, p_run_id text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tier text;
  v_paid_through timestamptz;
  v_stripe_subscription_id text;
  v_status text;
  v_lease_owner text;
  v_finished_at timestamptz;
  v_trial_started_at timestamptz;
  v_allocation numeric;
  v_spent numeric;
  v_remaining numeric;
  v_keep numeric;
  v_row record;
begin
  perform 1 from public.config where key = 'build_budget_usd' for update;
  if not found then
    return false;
  end if;

  select status, build_lease_owner, build_finished_at, trial_started_at,
         tier, paid_through, stripe_subscription_id
  into v_status, v_lease_owner, v_finished_at, v_trial_started_at,
       v_tier, v_paid_through, v_stripe_subscription_id
  from public.monitors where id = p_monitor for update;
  if not found or p_run_id is null or v_lease_owner is distinct from p_run_id
     or v_status not in ('building', 'failed')
     or v_finished_at is not null or v_trial_started_at is not null
     or v_tier is distinct from 'free' or v_paid_through is not null
     or v_stripe_subscription_id is not null then
    return false;
  end if;

  perform id from public.cost_ledger where monitor_id = p_monitor order by id for update;
  select coalesce(sum(usd), 0) into v_allocation
  from public.cost_ledger where monitor_id = p_monitor and service = 'reservation';
  select coalesce(sum(case when settled then usd else greatest(usd, usd_reserved) end), 0) into v_spent
  from public.cost_ledger where monitor_id = p_monitor and service <> 'reservation';
  if v_allocation <= 0 or v_spent > v_allocation then
    return false;
  end if;

  v_remaining := v_spent;
  for v_row in
    select id, usd from public.cost_ledger
    where monitor_id = p_monitor and service = 'reservation'
    order by id
  loop
    v_keep := least(v_row.usd, v_remaining);
    if v_keep > 0 then
      update public.cost_ledger
      set usd = v_keep, usd_reserved = v_keep, settled = true
      where id = v_row.id;
      v_remaining := v_remaining - v_keep;
    else
      delete from public.cost_ledger where id = v_row.id;
    end if;
  end loop;

  delete from public.monitors where id = p_monitor;
  return found;
end;
$$;

create function public.expire_unconfirmed_build(p_monitor uuid, p_run_id text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_x_user_id text;
  v_status text;
  v_lease_owner text;
  v_lease_until timestamptz;
  v_finished_at timestamptz;
  v_trial_started_at timestamptz;
begin
  perform 1 from public.config where key = 'build_budget_usd' for update;
  if not found then
    return false;
  end if;
  select x_user_id, status, build_lease_owner, build_lease_until,
         build_finished_at, trial_started_at
  into v_x_user_id, v_status, v_lease_owner, v_lease_until,
       v_finished_at, v_trial_started_at
  from public.monitors where id = p_monitor for update;
  if not found or v_x_user_id is not null
     or v_status not in ('building', 'failed')
     or v_lease_owner is distinct from p_run_id
     or (v_status = 'building' and (v_lease_until is null or v_lease_until > clock_timestamp()))
     or v_finished_at is not null or v_trial_started_at is not null then
    return false;
  end if;
  return public.release_build(p_monitor, p_run_id);
end;
$$;

drop function public.release_build(uuid);
drop function public.reserve_build(uuid, numeric);

create or replace function public.claim_build(p_monitor uuid, p_run_id text, p_lease_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_run_id is null or p_lease_seconds is null or p_lease_seconds <= 0 then
    return false;
  end if;
  update public.monitors as m
  set status = 'building',
      build_lease_until = now() + make_interval(secs => p_lease_seconds),
      build_lease_owner = p_run_id,
      build_tries = build_tries + case
        when build_lease_owner = p_run_id and build_lease_until > now() then 0 else 1 end
  where m.id = p_monitor and m.status in ('building', 'failed')
    and m.x_user_id is not null and m.x_user_id ~ '^[0-9]+$'
    and exists (
      select 1 from public.cost_ledger cl
      where cl.monitor_id = m.id and cl.service = 'reservation'
      group by cl.monitor_id having sum(cl.usd) > 0
    )
    and (
      (build_lease_owner = p_run_id and build_lease_until > now())
      or (build_tries < 2 and (build_lease_until is null or build_lease_until <= now()))
    );
  return found;
end;
$$;

create function public.complete_build(
  p_monitor uuid,
  p_run_id text,
  p_x_user_id text,
  p_profile jsonb,
  p_brief jsonb,
  p_new_sources jsonb,
  p_monitor_sources jsonb,
  p_accounts jsonb
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_handle text;
  v_stored_x_user_id text;
  v_status text;
  v_lease_owner text;
  v_lease_until timestamptz;
  v_finished_at timestamptz;
  v_trial_started_at timestamptz;
  v_profile_id text;
  v_profile_handle text;
  v_source jsonb;
  v_monitor_source jsonb;
  v_account jsonb;
  v_now timestamptz;
begin
  select handle::text, x_user_id, status, build_lease_owner,
         build_lease_until, build_finished_at, trial_started_at
  into v_handle, v_stored_x_user_id, v_status, v_lease_owner,
       v_lease_until, v_finished_at, v_trial_started_at
  from public.monitors where id = p_monitor for update;
  v_now := clock_timestamp();
  if not found or v_status is distinct from 'building'
     or p_run_id is null or v_lease_owner is distinct from p_run_id
     or v_lease_until is null or v_lease_until <= v_now
     or v_finished_at is not null or v_trial_started_at is not null then
    return 'lease_lost';
  end if;

  v_profile_id := p_profile ->> 'id';
  v_profile_handle := p_profile ->> 'handle';
  if jsonb_typeof(p_profile) is distinct from 'object'
     or p_x_user_id is null or p_x_user_id !~ '^[0-9]+$'
     or v_stored_x_user_id is null or v_stored_x_user_id is distinct from p_x_user_id
     or v_profile_id is null or v_profile_id !~ '^[0-9]+$'
     or v_profile_id is distinct from p_x_user_id
     or v_profile_handle is null then
    return 'identity_mismatch';
  end if;
  if left(v_profile_handle, 1) = '@' then
    v_profile_handle := substring(v_profile_handle from 2);
  end if;
  if lower(v_profile_handle) is distinct from v_handle then
    return 'identity_mismatch';
  end if;
  if jsonb_typeof(p_brief) is distinct from 'object'
     or jsonb_typeof(p_new_sources) is distinct from 'array'
     or jsonb_typeof(p_monitor_sources) is distinct from 'array'
     or jsonb_typeof(p_accounts) is distinct from 'array' then
    raise exception 'invalid completion payload shape';
  end if;

  for v_source in select value from jsonb_array_elements(p_new_sources) order by value ->> 'id'
  loop
    if jsonb_typeof(v_source) is distinct from 'object'
       or v_source ->> 'id' is null or v_source ->> 'kind' is distinct from 'x_account'
       or v_source ->> 'target' is null or v_source ->> 'name' is null then
      raise exception 'invalid new source payload';
    end if;
    insert into public.sources (id, kind, target, name)
    values (v_source ->> 'id', 'x_account', v_source ->> 'target', v_source ->> 'name')
    on conflict (id) do nothing;
  end loop;

  for v_monitor_source in
    select value from jsonb_array_elements(p_monitor_sources) order by value ->> 'source_id'
  loop
    if jsonb_typeof(v_monitor_source) is distinct from 'object'
       or v_monitor_source ->> 'source_id' is null
       or v_monitor_source ->> 'score' is null
       or v_monitor_source ->> 'why' is null then
      raise exception 'invalid monitor source payload';
    end if;
    insert into public.monitor_sources (monitor_id, source_id, score, why, added_by)
    values (p_monitor, v_monitor_source ->> 'source_id',
            (v_monitor_source ->> 'score')::numeric, v_monitor_source ->> 'why', 'onboarding')
    on conflict (monitor_id, source_id) do nothing;
  end loop;

  for v_account in select value from jsonb_array_elements(p_accounts) order by value ->> 'handle'
  loop
    if jsonb_typeof(v_account) is distinct from 'object'
       or v_account ->> 'handle' is null or v_account ->> 'name' is null
       or v_account ->> 'score' is null or v_account ->> 'why' is null
       or (v_account ->> 'x_user_id' is not null and (v_account ->> 'x_user_id') !~ '^[0-9]+$') then
      raise exception 'invalid account payload';
    end if;
    insert into public.monitor_accounts (
      monitor_id, handle, name, x_user_id, score, why, watched, watched_at
    ) values (
      p_monitor, v_account ->> 'handle', v_account ->> 'name', v_account ->> 'x_user_id',
      (v_account ->> 'score')::numeric, v_account ->> 'why', true, v_now
    ) on conflict (monitor_id, handle) do nothing;
  end loop;

  update public.monitors
  set status = 'live',
      profile = p_profile,
      brief = p_brief,
      build_step = 3,
      build_finished_at = v_now,
      trial_started_at = v_now,
      pool_period_start = v_now,
      build_error = null,
      build_lease_until = null,
      build_lease_owner = null
  where id = p_monitor;
  return 'completed';
end;
$$;

create function public.apply_bot_command(
  p_event_id text,
  p_sender_x_user_id text,
  p_command text
)
returns table (changed boolean, monitor_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_sender text;
  v_handled text;
  v_event_monitor uuid;
  v_monitor_id uuid;
  v_command text := lower(btrim(p_command));
  v_changed boolean := false;
begin
  select sender_x_user_id, handled, dm_events.monitor_id
  into v_event_sender, v_handled, v_event_monitor
  from public.dm_events where event_id = p_event_id for update;
  if not found then
    return query select false, null::uuid;
    return;
  end if;
  if v_handled is not null then
    return query select false, v_event_monitor;
    return;
  end if;

  if p_sender_x_user_id is not null and p_sender_x_user_id ~ '^[0-9]+$'
     and v_event_sender = p_sender_x_user_id then
    if v_command = 'start' then
      select id into v_monitor_id from public.monitors
      where status = 'live' and x_user_id = p_sender_x_user_id for update;
      if found then
        update public.monitors
        set subscriber_x_user_id = p_sender_x_user_id,
            bot_state = 'active',
            bot_connected_at = coalesce(bot_connected_at, now())
        where id = v_monitor_id
          and (bot_state is distinct from 'active'
            or subscriber_x_user_id is distinct from p_sender_x_user_id
            or bot_connected_at is null);
        v_changed := found;
      end if;
    elsif v_command in ('stop', 'pause', 'resume') then
      select id into v_monitor_id from public.monitors
      where subscriber_x_user_id = p_sender_x_user_id for update;
      if found then
        if v_command = 'stop' then
          update public.monitors set bot_state = 'stopped'
          where id = v_monitor_id and bot_state is distinct from 'stopped';
        elsif v_command = 'pause' then
          update public.monitors set bot_state = 'paused'
          where id = v_monitor_id and bot_state not in ('paused', 'stopped');
        else
          update public.monitors set bot_state = 'active'
          where id = v_monitor_id and bot_state = 'paused';
        end if;
        v_changed := found;
      end if;
    end if;
  end if;

  update public.dm_events
  set handled = case when v_command in ('start', 'stop', 'pause', 'resume') then v_command else 'ignored' end,
      monitor_id = v_monitor_id
  where event_id = p_event_id;
  return query select v_changed, v_monitor_id;
end;
$$;

revoke all on function public.admit_build(uuid, text, text, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.confirm_build_identity(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.release_build(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_unconfirmed_build(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_build(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_build(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.apply_bot_command(text, text, text) from public, anon, authenticated;
grant execute on function public.admit_build(uuid, text, text, text, text, text, integer, text) to service_role;
grant execute on function public.confirm_build_identity(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.release_build(uuid, text) to service_role;
grant execute on function public.expire_unconfirmed_build(uuid, text) to service_role;
grant execute on function public.claim_build(uuid, text, integer) to service_role;
grant execute on function public.complete_build(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.apply_bot_command(text, text, text) to service_role;

commit;
