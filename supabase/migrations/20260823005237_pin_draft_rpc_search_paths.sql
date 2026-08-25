-- Applied via the Supabase MCP server

alter function public.claim_story_draft(uuid, timestamptz)
  set search_path = '';

alter function public.attach_story_draft(uuid, uuid)
  set search_path = '';
