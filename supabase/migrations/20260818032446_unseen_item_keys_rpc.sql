-- Applied via the Supabase MCP server

create or replace function public.unseen_item_keys(
  p_source_config_id uuid,
  p_item_keys text[]
)
returns setof text
language sql
stable
set search_path = ''
as $$
  select k
  from unnest(p_item_keys) as k
  where not exists (
    select 1
    from public.source_seen_items s
    where s.source_config_id = p_source_config_id
      and s.item_key = k
  )
$$;

revoke all on function public.unseen_item_keys(uuid, text[]) from public, anon, authenticated;
