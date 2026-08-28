-- Applied via the Supabase MCP server
-- Issue #131 Part D: bot DM state. Four tables + the one reservation RPC every bot send of
-- every purpose goes through.

-- One live connection per desk AND per recipient: an incoming "yes" resolves to exactly one
-- pending/active row by sender id.
create table public.dm_connections (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  x_user_id text not null,
  handle text not null,
  state text not null default 'pending'
    check (state in ('pending', 'active', 'stopped', 'trial_expired')),
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agent_id)
);
create unique index dm_connections_one_live_per_recipient
  on public.dm_connections (x_user_id)
  where state in ('pending', 'active');
alter table public.dm_connections enable row level security;

-- Idempotency is PER ATTEMPT (agent, story, source_post) — never per story: a story
-- legitimately gets a suppressed row now and a sent row 40 minutes later. "Alerted recently?"
-- is always a query over recent sent rows, never a constraint.
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  source_post_id uuid not null references public.source_posts(id) on delete cascade,
  draft_id uuid references public.drafts(id) on delete set null,
  sent_at timestamptz,
  status text not null
    check (status in ('sent', 'suppressed_duplicate', 'skipped_cap', 'paused_trial', 'failed')),
  suppress_reason text,
  link_token text unique,
  dm_message_id text,
  created_at timestamptz not null default now(),
  unique (agent_id, story_id, source_post_id)
);
create index alerts_recent_sent on public.alerts (agent_id, status, sent_at);
alter table public.alerts enable row level security;

-- EVERY bot send of every purpose reserves here first; the caller finalizes sent/failed, and
-- the 15-minute reconcile finalizes stale reserved rows as failed (a timed-out send that MAY
-- have delivered stays consumed, never released).
create table public.dm_send_ledger (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('authorize', 'alert', 'payment')),
  agent_id uuid references public.agents(id) on delete set null,
  recipient_x_user_id text not null,
  state text not null default 'reserved' check (state in ('reserved', 'sent', 'failed')),
  idempotency_key text not null unique,
  reserved_at timestamptz not null default now(),
  sent_at timestamptz
);
create index dm_send_ledger_recipient_reserved_at
  on public.dm_send_ledger (recipient_x_user_id, reserved_at);
create index dm_send_ledger_reserved_at on public.dm_send_ledger (reserved_at);
alter table public.dm_send_ledger enable row level security;

-- Per-visitor onboarding attempts. The PARTIAL unique blocks only a second COMPLETED attempt
-- per address per day — a failed attempt must not consume the day (the failure copy promises
-- "try again"); the in-action count check caps total attempts at 3/day.
create table public.onboard_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  day date not null default current_date,
  handle text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);
create unique index onboard_attempts_one_completed_per_day
  on public.onboard_attempts (ip_hash, day)
  where outcome = 'completed';
create index onboard_attempts_ip_day on public.onboard_attempts (ip_hash, day);
alter table public.onboard_attempts enable row level security;

-- The one reservation gate. A per-agent row lock cannot serialize app-wide or per-recipient
-- checks, so this takes pg_advisory_xact_lock on a constant key (app-wide 24h cap) and on
-- hashtext(recipient) (per-user caps), counts within the windows, and inserts reserved or
-- refuses (null). Failed sends release their slot (state <> 'failed' in the counts).
create function public.reserve_dm_send(
  p_purpose text,
  p_recipient text,
  p_agent_id uuid,
  p_idempotency_key text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('oparax_dm_send_app_cap'));
  perform pg_advisory_xact_lock(hashtext(p_recipient));

  -- An already-consumed idempotency key is a refusal: the send was already attempted.
  if exists (
    select 1 from public.dm_send_ledger where idempotency_key = p_idempotency_key
  ) then
    return null;
  end if;

  -- App-wide: 1,400/24h leaves margin under X's 1,440/24h per app.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where reserved_at > now() - interval '24 hours'
    and state <> 'failed';
  if v_count >= 1400 then
    return null;
  end if;

  -- Per recipient: 1,440/24h.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where recipient_x_user_id = p_recipient
    and reserved_at > now() - interval '24 hours'
    and state <> 'failed';
  if v_count >= 1440 then
    return null;
  end if;

  -- Per recipient: 15/15min.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where recipient_x_user_id = p_recipient
    and reserved_at > now() - interval '15 minutes'
    and state <> 'failed';
  if v_count >= 15 then
    return null;
  end if;

  insert into public.dm_send_ledger (purpose, agent_id, recipient_x_user_id, idempotency_key)
  values (p_purpose, p_agent_id, p_recipient, p_idempotency_key)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.reserve_dm_send(text, text, uuid, text)
  from public, anon, authenticated;
