-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): item 5 per-desk Slack delivery. `slack_accounts` is a deny-all
-- clone of x_accounts's shape but keyed by experiment_id UNIQUE (per-desk, not per-user) —
-- tokens never leave lib/slack/store.ts. `slack_delivery_receipts` is deny-all with
-- UNIQUE(interaction_id), the idempotency claim for interactive-button callbacks and
-- Send-test (D16 rail).
create table public.slack_accounts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  team_id text not null,
  team_name text not null,
  channel_id text not null,
  channel_name text not null,
  access_token text not null,
  bot_user_id text not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id)
);

create index slack_accounts_experiment_id_idx on public.slack_accounts(experiment_id);

alter table public.slack_accounts enable row level security;
-- deny-all by design: no policies; lib/slack/store.ts (service-role) is the only reader/writer

create table public.slack_delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  interaction_id text not null,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (interaction_id)
);

create index slack_delivery_receipts_experiment_id_idx on public.slack_delivery_receipts(experiment_id);

alter table public.slack_delivery_receipts enable row level security;
-- deny-all by design: no policies
