-- Applied via the Supabase MCP server.
alter table public.x_accounts
  add column tier text check (tier in ('standard', 'premium'));
