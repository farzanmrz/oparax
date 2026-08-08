-- A dismissed pending source can be re-reserved for the same URL while its original
-- onboarding work is still running. Activate only the exact reservation that completed;
-- never let an older completion update the replacement row selected by (agent_id, url).
drop function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text
);

create function public.add_source_config(
  p_config_id uuid,
  p_agent_id uuid,
  p_url text,
  p_domain text,
  p_display_name text,
  p_change_detection text,
  p_retrieval text,
  p_prefilter jsonb,
  p_language text,
  p_policy_note text,
  p_full_text_available text,
  p_sitemap_url text,
  p_feed_url text,
  p_match_count integer,
  p_sample_size integer,
  p_model_call_id uuid,
  p_beat_guidance jsonb default null,
  p_listing_url text default null
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.source_configs
  set domain = p_domain,
      display_name = p_display_name,
      change_detection = p_change_detection,
      retrieval = p_retrieval,
      prefilter = p_prefilter,
      language = p_language,
      policy_note = p_policy_note,
      full_text_available = p_full_text_available,
      sitemap_url = p_sitemap_url,
      feed_url = p_feed_url,
      match_count = p_match_count,
      sample_size = p_sample_size,
      model_call_id = p_model_call_id,
      beat_guidance = p_beat_guidance,
      listing_url = p_listing_url,
      error_code = null,
      status = 'active',
      last_verified_at = now(),
      updated_at = now()
  where id = p_config_id
    and agent_id = p_agent_id
    and url = p_url
    and status = 'pending'
  returning id into v_id;

  if v_id is null then
    return null;
  end if;

  update public.agents
  set websites = (
    select coalesce(jsonb_agg(distinct w), '[]'::jsonb)
    from jsonb_array_elements_text(
      coalesce(websites, '[]'::jsonb) || to_jsonb(p_url)
    ) as w
  )
  where id = p_agent_id;

  return v_id;
end;
$$;

revoke all on function public.add_source_config(
  uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text
) from public, anon, authenticated;
grant execute on function public.add_source_config(
  uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text
) to postgres, service_role;
