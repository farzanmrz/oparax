-- Applied via the Supabase MCP server
create or replace function public.reserve_pending_source_config(
  p_agent_id uuid,
  p_url text,
  p_domain text,
  p_display_name text
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_status text;
  v_config_count integer;
begin
  perform 1
  from public.agents
  where id = p_agent_id
  for update;

  select id, status
  into v_id, v_status
  from public.source_configs
  where agent_id = p_agent_id and url = p_url;

  if v_id is not null and v_status in ('active', 'pending') then
    return null;
  end if;

  select count(*)::integer
  into v_config_count
  from public.source_configs
  where agent_id = p_agent_id
    and status in ('active', 'pending');

  if v_config_count >= 5 then
    raise exception 'source_limit_reached'
      using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.source_configs (
      agent_id, url, domain, display_name, status,
      change_detection, retrieval
    ) values (
      p_agent_id, p_url, p_domain, p_display_name, 'pending',
      'sitemap', null
    )
    returning id into v_id;
  else
    update public.source_configs
    set status = 'pending',
        updated_at = now()
    where id = v_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.reserve_pending_source_config(uuid, text, text, text)
  from public, anon, authenticated;
