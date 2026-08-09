-- Applied via the Supabase MCP server (remote version 20260809065505).
-- Active legacy-source refreshes must never rerun the broad onboarding persistence update:
-- detection, scope, display, language, and guidance are already established. This narrow RPC
-- consumes only the exact active/null row admitted by the poller-triggered app endpoint.
create function public.refresh_source_strip_phrases(
  p_config_id uuid,
  p_agent_id uuid,
  p_strip_phrases jsonb,
  p_model_call_id uuid
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.source_configs
  set strip_phrases = p_strip_phrases,
      model_call_id = p_model_call_id,
      error_code = null,
      last_verified_at = now(),
      updated_at = now()
  where id = p_config_id
    and agent_id = p_agent_id
    and status = 'active'
    and strip_phrases is null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.refresh_source_strip_phrases(uuid, uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_source_strip_phrases(uuid, uuid, jsonb, uuid)
  to postgres, service_role;
