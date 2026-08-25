-- Applied via the Supabase MCP server
alter table public.drafts
  alter column model_call_id drop not null;

alter table public.drafts
  add column draft_requested_at timestamptz null;
