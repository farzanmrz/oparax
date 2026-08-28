-- Applied via the Supabase MCP server
-- Issue #131 Part B: receipt ledger for XAA webhook deliveries. Every inbound event lands here
-- BEFORE the 200 is returned; processing claims the row and stamps a terminal state, and the
-- 15-minute reconcile sweep reprocesses stale pending/processing rows.
create table public.x_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  x_post_id text,
  sender_x_user_id text,
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'processed', 'excluded', 'failed')),
  reason text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index x_webhook_events_state_created_at on public.x_webhook_events (state, created_at);

alter table public.x_webhook_events enable row level security;
-- Service-role only: no policies, so anon/authenticated see nothing.
