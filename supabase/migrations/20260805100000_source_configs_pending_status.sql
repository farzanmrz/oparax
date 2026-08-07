-- Applied via the Supabase MCP server
alter table public.source_configs
  drop constraint if exists source_configs_status_check,
  add constraint source_configs_status_check
    check (status in ('pending', 'active', 'failed_validation', 'stale'));

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
begin
  insert into public.source_configs (
    agent_id, url, domain, display_name, status,
    change_detection, retrieval
  ) values (
    p_agent_id, p_url, p_domain, p_display_name, 'pending',
    'sitemap', null
  )
  on conflict (agent_id, url) do update set
    status = 'pending', updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.reserve_pending_source_config from public, anon, authenticated;
