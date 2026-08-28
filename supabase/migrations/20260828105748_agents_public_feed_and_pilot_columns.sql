-- Applied via the Supabase MCP server
-- Issue #131 Part C: public feed identity + trial/plan state on agents. DM state deliberately
-- lives ONLY in dm_connections (one source of truth); the feed page reads it by join.
alter table public.agents
  add column public_handle text unique,
  add column trial_started_at timestamptz,
  add column plan text,
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column created_via text not null default 'owner'
    check (created_via in ('owner', 'pilot'));
