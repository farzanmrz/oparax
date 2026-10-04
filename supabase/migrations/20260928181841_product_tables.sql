-- Applied via the Supabase MCP server
begin;

create table public.sources (
  id text primary key,
  kind text not null check (kind in ('rss', 'website', 'x_account')),
  target text not null,
  name text not null,
  focus text not null default '',
  lang text not null default 'en',
  description text not null default '',
  items_per_week numeric,
  posts_per_day numeric,
  followers integer,
  recent_titles jsonb not null default '[]',
  x_user_id text,
  etag text,
  last_modified text,
  last_fetched_at timestamptz,
  next_fetch_at timestamptz not null default now(),
  last_item_at timestamptz,
  unreadable_streak integer not null default 0,
  paused_at timestamptz,
  paused_reason text,
  paused_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  handle public.citext not null unique,
  display_handle text not null,
  x_user_id text,
  beat text not null,
  profile jsonb,
  build_state jsonb,
  brief jsonb,
  status text not null check (status in ('building', 'failed', 'live', 'paused')),
  build_step integer not null default 0,
  build_log jsonb not null default '[]',
  build_error text,
  build_tries integer not null default 0,
  build_lease_until timestamptz,
  build_lease_owner text,
  build_started_at timestamptz,
  build_finished_at timestamptz,
  built_by uuid references auth.users(id),
  user_id uuid references auth.users(id),
  tier text not null default 'free' check (tier in ('free', 'hobby', 'creator', 'wire')),
  trial_started_at timestamptz,
  last_viewed_at timestamptz,
  paid_through timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  cancel_at_period_end boolean not null default false,
  last_invoice_id text,
  checkout_session_id text,
  checkout_opened_at timestamptz,
  budget_exhausted_at timestamptz,
  pool_limit integer not null default 300,
  pool_used integer not null default 0,
  pool_period_start timestamptz,
  cadence text not null default 'daily' check (cadence in ('daily', 'every_15m')),
  alert_hour integer not null default 14 check (alert_hour between 0 and 23),
  alert_timezone text,
  last_alert_at timestamptz,
  subscriber_x_user_id text,
  bot_state text not null default 'none' check (bot_state in ('none', 'active', 'paused', 'stopped')),
  bot_code text,
  bot_code_expires_at timestamptz,
  bot_connected_at timestamptz,
  digest_github boolean not null default false,
  digest_product_hunt boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monitor_sources (
  monitor_id uuid references public.monitors(id) on delete cascade,
  source_id text references public.sources(id),
  score numeric,
  why text not null default '',
  added_by text not null check (added_by in ('onboarding', 'person')),
  no_filter boolean not null default false,
  prefilled_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (monitor_id, source_id)
);

create table public.monitor_accounts (
  monitor_id uuid references public.monitors(id) on delete cascade,
  handle public.citext not null,
  x_user_id text,
  name text not null default '',
  score numeric,
  why text not null default '',
  watched boolean not null default false,
  watched_at timestamptz,
  posts_per_day numeric,
  counts_checked_at timestamptz,
  since_id text,
  created_at timestamptz not null default now(),
  primary key (monitor_id, handle)
);

create table public.items (
  id text primary key,
  source_id text not null references public.sources(id),
  source_ids text[] not null default '{}',
  kind text not null check (kind in ('article', 'post')),
  url text not null,
  final_url text,
  title text not null default '',
  text text not null default '',
  published_at timestamptz not null,
  date_source text,
  text_from text,
  outcome text not null check (outcome in ('full', 'short', 'unreadable')),
  unreadable_reason text,
  image text,
  lang text,
  author jsonb,
  created_at timestamptz not null default now()
);

create table public.monitor_items (
  monitor_id uuid,
  item_id text references public.items(id),
  status text not null check (status in ('pending', 'skipped', 'on', 'attached', 'storied', 'failed')),
  stage text not null default 'fit' check (stage in ('fit', 'card', 'group', 'done')),
  fit_score numeric,
  fit_band text check (fit_band in ('on', 'off', 'unsure')),
  story_id uuid,
  card jsonb,
  card_status text check (card_status in ('written', 'no_card', 'write_failed')),
  error text,
  tries integer not null default 0,
  judged_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (monitor_id, item_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid references public.monitors(id) on delete cascade,
  opened_at timestamptz not null,
  last_published_at timestamptz not null,
  last_changed_at timestamptz not null,
  headline text,
  card jsonb,
  fallback_title text not null,
  image text,
  status text not null check (status in ('open', 'written', 'no_card', 'write_failed')),
  version integer not null default 0,
  alerted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.story_items (
  story_id uuid references public.stories(id) on delete cascade,
  item_id text references public.items(id),
  role text not null check (role in ('opened', 'joined', 'attached')),
  join_score numeric,
  adds_score numeric,
  added_at timestamptz not null default now(),
  primary key (story_id, item_id)
);

create table public.card_versions (
  id bigint generated always as identity primary key,
  story_id uuid references public.stories(id) on delete cascade,
  version integer not null,
  card jsonb,
  record jsonb not null,
  created_at timestamptz not null default now(),
  unique (story_id, version)
);

create table public.deliveries (
  monitor_id uuid,
  story_id uuid references public.stories(id) on delete cascade,
  state text not null check (state in ('sending', 'sent', 'failed', 'held')),
  dm_event_id text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  tries integer not null default 1,
  error text,
  primary key (monitor_id, story_id)
);

create table public.dm_events (
  event_id text primary key,
  monitor_id uuid,
  sender_x_user_id text,
  text text,
  received_at timestamptz not null default now(),
  handled text,
  payload jsonb
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processing_until timestamptz,
  processed_at timestamptz,
  error text
);

create table public.cost_ledger (
  id bigint generated always as identity primary key,
  service text not null check (service in ('x', 'gateway', 'jev', 'reservation', 'stripe')),
  kind text not null,
  units integer not null default 1,
  usd numeric(10,6) not null,
  usd_reserved numeric(10,6) not null default 0,
  settled boolean not null default false,
  monitor_id uuid,
  source_id text,
  run_id text,
  external_id text,
  day date not null default (now() at time zone 'utc')::date,
  hour timestamptz not null default date_trunc('hour', now()),
  created_at timestamptz not null default now()
);

create table public.run_claims (
  job text primary key,
  run_id text not null,
  claimed_at timestamptz not null,
  expires_at timestamptz not null
);

create table public.config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  tries integer not null default 0,
  error text
);

create table public.handle_waitlist (
  handle public.citext primary key,
  beat text,
  created_at timestamptz not null default now()
);

create table public.digest_items (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid references public.monitors(id) on delete cascade,
  kind text not null check (kind in ('github_repo', 'product_hunt', 'star_threshold')),
  external_id text not null,
  name text not null,
  url text not null,
  why_now text not null,
  description text not null default '',
  fit_score numeric,
  created_at timestamptz not null default now(),
  unique (monitor_id, kind, external_id)
);

create table public.repo_snapshots (
  repo text not null,
  day date not null,
  stars integer not null,
  observed_at timestamptz not null default now(),
  primary key (repo, day)
);

create table public.followed_repos (
  monitor_id uuid references public.monitors(id) on delete cascade,
  repo text not null,
  threshold integer not null default 3000,
  stars integer,
  crossed_at timestamptz,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (monitor_id, repo)
);

create index sources_next_fetch_at_idx on public.sources (next_fetch_at) where paused_at is null;
create index monitors_status_idx on public.monitors (status);
create index monitors_stripe_customer_id_idx on public.monitors (stripe_customer_id);
create unique index monitors_user_id_idx on public.monitors (user_id) where user_id is not null;
create unique index monitors_x_user_id_idx on public.monitors (x_user_id) where x_user_id is not null;
create index monitor_sources_source_id_idx on public.monitor_sources (source_id);
create index items_source_id_published_at_idx on public.items (source_id, published_at desc);
create index monitor_items_monitor_id_status_idx on public.monitor_items (monitor_id, status);
create index monitor_items_item_id_idx on public.monitor_items (item_id);
create index monitor_items_story_id_idx on public.monitor_items (story_id);
create index stories_monitor_id_last_published_at_idx on public.stories (monitor_id, last_published_at desc);
create index stories_monitor_id_alerted_at_idx on public.stories (monitor_id, alerted_at) where alerted_at is null;
create index story_items_item_id_idx on public.story_items (item_id);
create index deliveries_sent_at_idx on public.deliveries (sent_at);
create index deliveries_story_id_idx on public.deliveries (story_id);
create unique index cost_ledger_service_external_id_day_idx on public.cost_ledger (service, external_id, day) where external_id is not null;
create index cost_ledger_day_idx on public.cost_ledger (day);
create index cost_ledger_monitor_id_day_idx on public.cost_ledger (monitor_id, day);
create index cost_ledger_source_id_day_idx on public.cost_ledger (source_id, day);

-- Server-only tables have no policies; owners can only read the four ownership surfaces.
alter table public.sources enable row level security;
alter table public.monitors enable row level security;
alter table public.monitor_sources enable row level security;
alter table public.monitor_accounts enable row level security;
alter table public.items enable row level security;
alter table public.monitor_items enable row level security;
alter table public.stories enable row level security;
alter table public.story_items enable row level security;
alter table public.card_versions enable row level security;
alter table public.deliveries enable row level security;
alter table public.dm_events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.cost_ledger enable row level security;
alter table public.run_claims enable row level security;
alter table public.config enable row level security;
alter table public.contact_messages enable row level security;
alter table public.handle_waitlist enable row level security;
alter table public.digest_items enable row level security;
alter table public.repo_snapshots enable row level security;
alter table public.followed_repos enable row level security;

create policy monitors_owner_select on public.monitors for select to authenticated
  using (user_id = (select auth.uid()));
create policy monitor_sources_owner_select on public.monitor_sources for select to authenticated
  using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = (select auth.uid())));
create policy monitor_accounts_owner_select on public.monitor_accounts for select to authenticated
  using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = (select auth.uid())));
create policy followed_repos_owner_select on public.followed_repos for select to authenticated
  using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = (select auth.uid())));

revoke all on table public.sources, public.monitors, public.monitor_sources,
  public.monitor_accounts, public.items, public.monitor_items, public.stories,
  public.story_items, public.card_versions, public.deliveries, public.dm_events,
  public.stripe_events, public.cost_ledger, public.run_claims, public.config,
  public.contact_messages, public.handle_waitlist, public.digest_items,
  public.repo_snapshots, public.followed_repos from public, anon, authenticated;
grant select on table public.monitors, public.monitor_sources, public.monitor_accounts,
  public.followed_repos to authenticated;
grant select, insert, update, delete on table public.sources, public.monitors,
  public.monitor_sources, public.monitor_accounts, public.items, public.monitor_items,
  public.stories, public.story_items, public.card_versions, public.deliveries,
  public.dm_events, public.stripe_events, public.cost_ledger, public.run_claims,
  public.config, public.contact_messages, public.handle_waitlist, public.digest_items,
  public.repo_snapshots, public.followed_repos to service_role;
revoke all on sequence public.card_versions_id_seq, public.cost_ledger_id_seq
  from public, anon, authenticated;
grant usage, select on sequence public.card_versions_id_seq, public.cost_ledger_id_seq to service_role;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();
create trigger monitors_updated_at before update on public.monitors
  for each row execute function public.set_updated_at();
create trigger config_updated_at before update on public.config
  for each row execute function public.set_updated_at();

create function public.reserve_build(p_monitor uuid, p_usd numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget numeric;
begin
  if p_monitor is null or p_usd is null or p_usd < 0 or p_usd = 'NaN'::numeric then
    return false;
  end if;
  select (value #>> '{}')::numeric into v_budget
  from public.config where key = 'anon_budget_usd' for update;
  if not found then
    return false;
  end if;
  -- A retried build keeps its original allocation, including across UTC midnight.
  if exists (
    select 1 from public.cost_ledger
    where service = 'reservation' and external_id = p_monitor::text
  ) then
    return true;
  end if;
  insert into public.cost_ledger
    (service, kind, monitor_id, external_id, usd, usd_reserved, settled)
  select 'reservation', 'build', p_monitor, p_monitor::text, p_usd, p_usd, true
  where (
    select coalesce(sum(usd), 0) from public.cost_ledger
    where service = 'reservation' and day = (now() at time zone 'utc')::date
  ) + p_usd <= v_budget;
  return found;
end;
$$;

create function public.release_build(p_monitor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Match reservation lock order so release cannot race a replacement allocation.
  perform 1 from public.config where key = 'anon_budget_usd' for update;
  perform 1 from public.monitors where id = p_monitor for update;
  with released as (
    delete from public.cost_ledger
    where service = 'reservation' and monitor_id = p_monitor
  )
  delete from public.monitors where id = p_monitor;
end;
$$;

create function public.reserve_cost(
  p_service text, p_kind text, p_usd numeric, p_monitor uuid, p_source text, p_run text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_allocation numeric;
  v_spent numeric;
  v_id bigint;
begin
  if p_usd is null or p_usd < 0 or p_usd = 'NaN'::numeric then
    return null;
  end if;
  if p_monitor is not null then
    select tier into v_tier from public.monitors where id = p_monitor for update;
    if not found then
      return null;
    end if;
    if v_tier = 'free' then
      select
        coalesce(sum(usd) filter (where service = 'reservation'), 0),
        coalesce(sum(case when settled then usd else usd_reserved end)
          filter (where service <> 'reservation'), 0)
      into v_allocation, v_spent
      from public.cost_ledger where monitor_id = p_monitor;
      if v_spent + p_usd > v_allocation then
        return null;
      end if;
    end if;
  end if;
  insert into public.cost_ledger
    (service, kind, usd, usd_reserved, settled, monitor_id, source_id, run_id)
  values (p_service, p_kind, p_usd, p_usd, false, p_monitor, p_source, p_run)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.debit_posts(p_monitor uuid, p_item_ids text[])
returns table (attached text[], remaining integer, paused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
  v_count integer;
begin
  select pool_limit, pool_used into v_limit, v_used
  from public.monitors where id = p_monitor for update;
  if not found then
    return query select '{}'::text[], 0, true;
    return;
  end if;
  -- Deduplicate before limiting so repeated ids do not consume another post's place.
  with candidates as materialized (
    select input.item_id, min(input.position) as position
    from unnest(p_item_ids) with ordinality as input(item_id, position)
    where input.item_id is not null and not exists (
      select 1 from public.monitor_items mi
      where mi.monitor_id = p_monitor and mi.item_id = input.item_id
    )
    group by input.item_id
    order by min(input.position)
    limit greatest(v_limit - v_used, 0)
  ), inserted as (
    insert into public.monitor_items (monitor_id, item_id, status)
    select p_monitor, c.item_id, 'pending' from candidates c
    on conflict (monitor_id, item_id) do nothing
    returning item_id
  )
  select coalesce(array_agg(i.item_id order by c.position), '{}'::text[])
  into attached from inserted i join candidates c using (item_id);
  v_count = cardinality(attached);
  update public.monitors set pool_used = pool_used + v_count where id = p_monitor;
  remaining = greatest(v_limit - v_used - v_count, 0);
  paused = v_used + v_count >= v_limit;
  return next;
end;
$$;

create function public.claim_run(p_job text, p_run_id text, p_ttl_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ttl_seconds is null or p_ttl_seconds <= 0 then
    return false;
  end if;
  insert into public.run_claims (job, run_id, claimed_at, expires_at)
  values (p_job, p_run_id, now(), now() + make_interval(secs => p_ttl_seconds))
  on conflict (job) do update
    set run_id = excluded.run_id, claimed_at = excluded.claimed_at, expires_at = excluded.expires_at
    where public.run_claims.expires_at <= now();
  return found;
end;
$$;

create function public.release_run(p_job text, p_run_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.run_claims where job = p_job and run_id = p_run_id;
$$;

create function public.claim_build(p_monitor uuid, p_run_id text, p_lease_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_run_id is null or p_lease_seconds is null or p_lease_seconds <= 0 then
    return false;
  end if;
  -- Renewal must still work on the second attempt; only a new lease consumes a try.
  update public.monitors
  set status = 'building',
      build_lease_until = now() + make_interval(secs => p_lease_seconds),
      build_lease_owner = p_run_id,
      build_tries = build_tries + case
        when build_lease_owner = p_run_id and build_lease_until > now() then 0 else 1 end
  where id = p_monitor and status in ('building', 'failed')
    and (
      (build_lease_owner = p_run_id and build_lease_until > now())
      or (build_tries < 2 and (build_lease_until is null or build_lease_until <= now()))
    );
  return found;
end;
$$;

create function public.user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke execute on function public.reserve_build(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.release_build(uuid) from public, anon, authenticated;
revoke execute on function public.reserve_cost(text, text, numeric, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.debit_posts(uuid, text[]) from public, anon, authenticated;
revoke execute on function public.claim_run(text, text, integer) from public, anon, authenticated;
revoke execute on function public.release_run(text, text) from public, anon, authenticated;
revoke execute on function public.claim_build(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.reserve_build(uuid, numeric) to service_role;
grant execute on function public.release_build(uuid) to service_role;
grant execute on function public.reserve_cost(text, text, numeric, uuid, text, text) to service_role;
grant execute on function public.debit_posts(uuid, text[]) to service_role;
grant execute on function public.claim_run(text, text, integer) to service_role;
grant execute on function public.release_run(text, text) to service_role;
grant execute on function public.claim_build(uuid, text, integer) to service_role;
grant execute on function public.user_id_by_email(text) to service_role;

insert into public.config (key, value) values
  ('kill_switch', 'false'),
  ('anon_budget_usd', '200'),
  ('x_balance', '{"console": null, "checked_at": null, "status": "unknown"}'),
  ('bot', '{"x_user_id": null, "handle": null}'),
  ('stripe_prices', '{}');

commit;
