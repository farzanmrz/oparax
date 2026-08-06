-- QC round 1, finding #3: reserve_pending_source_config (20260805100000_source_configs_pending_status.sql)
-- set `status = 'pending'` unconditionally in its ON CONFLICT branch. Re-onboarding a URL that is
-- already tracked -- which handleAddWebsite does not guard against, and which a trailing slash or a
-- re-typed site produces -- therefore knocked a live source out of the `status = 'active'` filter that
-- both poller/src/db.ts's fetchActiveSourceConfigs and lib/agent/draft-pipeline.ts read from. If the
-- fresh onboarding attempt then failed, the row was left permanently dark while the UI still listed
-- the website as tracked.
--
-- Only reservations over a NOT-yet-active row may claim 'pending'; an active row keeps its status.
-- Every other column and the returned id are unchanged.
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
    status = case
      when source_configs.status = 'active' then source_configs.status
      else 'pending'
    end,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.reserve_pending_source_config(uuid, text, text, text)
  from public, anon, authenticated;
