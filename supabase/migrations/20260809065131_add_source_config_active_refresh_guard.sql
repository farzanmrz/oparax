-- Applied via the Supabase MCP server (remote version 20260809065131).
-- The remote 20260809064326 refresh function opened active updates for legacy strip-phrase
-- backfill. Tighten that exception to the exact active-null rows the poller endpoint selects;
-- ordinary active sources remain immutable through this onboarding RPC.
create or replace function public.add_source_config(
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
  p_listing_url text default null,
  p_strip_phrases jsonb default null
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
      strip_phrases = p_strip_phrases,
      error_code = null,
      status = 'active',
      last_verified_at = now(),
      updated_at = now()
  where id = p_config_id
    and agent_id = p_agent_id
    and url = p_url
    and (
      status = 'pending'
      or (status = 'active' and strip_phrases is null)
    )
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
