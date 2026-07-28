-- Applied via the Supabase MCP server.
alter table public.post_drafts
  add column synthesis text,
  add column translation text,
  add column judge_review jsonb;
