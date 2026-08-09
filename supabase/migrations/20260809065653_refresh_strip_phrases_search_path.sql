-- Applied via the Supabase MCP server (remote version 20260809065653).
-- The function body fully qualifies public.source_configs, so it needs no ambient lookup path.
alter function public.refresh_source_strip_phrases(uuid, uuid, jsonb, uuid)
  set search_path = '';
