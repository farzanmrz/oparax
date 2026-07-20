-- ft/64: X account link + post-to-X.
-- New owner-scoped x_accounts token store (deny-all RLS: tokens are credentials,
-- read/written ONLY by the service-role client in lib/x/store.ts, scoped by user_id)
-- plus three post-outcome columns on drafts (service-role-stamped after an RLS
-- ownership check — the scanNow trust path). Applied via the Supabase MCP against
-- project pcgvpypzfwuchyfwdlwe; mirrored here.
create table public.x_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  x_user_id text not null,
  handle text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.x_accounts enable row level security;
-- NO policies on purpose: tokens are credentials. Deny-all for anon/authenticated;
-- only the service-role client (lib/x/store.ts) reads or writes, scoped by user_id.

alter table public.drafts add column posted_at timestamptz;
alter table public.drafts add column posted_tweet_id text;
alter table public.drafts add column posted_url text;
