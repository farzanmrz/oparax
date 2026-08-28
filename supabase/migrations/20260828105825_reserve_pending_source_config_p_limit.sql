-- Applied via the Supabase MCP server
-- Issue #131 Part F: the website-source reservation RPC gains a p_limit parameter (default 5,
-- the previous hardcoded cap) so the pilot onboarding path can pass its own ceiling for
-- user-demonstrated sources without being routed around — the RPC's agent lock and dedup stay
-- the atomicity story. Dropping the old 4-arg overload avoids ambiguous resolution against the
-- defaulted 5-arg signature.
drop function public.reserve_pending_source_config(uuid, text, text, text);

create function public.reserve_pending_source_config(
  p_agent_id uuid,
  p_url text,
  p_domain text,
  p_display_name text,
  p_limit integer default 5
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

  if v_config_count >= p_limit then
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
        error_code = null,
        updated_at = now()
    where id = v_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.reserve_pending_source_config(uuid, text, text, text, integer)
  from public, anon, authenticated;
