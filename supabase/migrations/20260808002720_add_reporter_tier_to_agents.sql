-- Applied via the Supabase MCP server.
alter table public.agents add column reporter_tier text check (reporter_tier in ('standard', 'premium'));
