-- Applied via the Supabase MCP server
create table public.x_handle_checks (
  id uuid primary key default gen_random_uuid(),
  handle text not null,        -- exactly as the X API returned it; display-inert
  handle_lower text not null,  -- app-set handle.toLowerCase(); the case-insensitive identity
  x_user_id text,
  status text not null check (status in ('valid','not_found','suspended')),
  checked_at timestamptz not null default now()
);
create unique index x_handle_checks_handle_lower_idx on public.x_handle_checks (handle_lower);
alter table public.x_handle_checks enable row level security;
-- deny-all: no policies. Service-role only.
