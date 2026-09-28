-- Applied via the Supabase MCP server
create or replace function public.attach_sightings(
  p_source text,
  p_monitor_ids uuid[],
  p_new_item_ids text[],
  p_seen_item_ids text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.monitor_items (monitor_id, item_id, status)
  select monitor_id, item_id, 'pending'
  from unnest(p_monitor_ids) as monitors(monitor_id)
  cross join unnest(p_new_item_ids) as new_items(item_id)
  on conflict do nothing;

  update public.items
  set source_ids = array(select distinct unnest(source_ids || p_source))
  where id = any(p_seen_item_ids);
end;
$$;

revoke execute on function public.attach_sightings(text, uuid[], text[], text[]) from public, anon, authenticated;
grant execute on function public.attach_sightings(text, uuid[], text[], text[]) to service_role;

