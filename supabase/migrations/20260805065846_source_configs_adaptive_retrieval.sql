alter table public.source_configs
  alter column retrieval drop not null,
  add column beat_guidance jsonb;

-- retrieval is no longer computed at onboarding (left null by default);
-- null means "the poller decides adaptively, per fetch" — a non-null value
-- is a deliberate operator override consumed by poller/src/fetch-body.ts.
-- beat_guidance stores { onBeat: string, offBeat: string }, the model's
-- own title-level disambiguation the onboarding call already produces
-- (lib/sources/onboard-source.ts's sourceOnboardingSchema) but has never
-- persisted until now. policy_note is now permanently null (no robots.txt
-- read means there's no crawl policy left to note) and dead in all but name.

create or replace function public.add_source_config(
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
  p_beat_guidance jsonb default null
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.source_configs (
    agent_id, url, domain, display_name, change_detection, retrieval,
    prefilter, language, policy_note, full_text_available, sitemap_url,
    feed_url, match_count, sample_size, model_call_id, beat_guidance
  ) values (
    p_agent_id, p_url, p_domain, p_display_name, p_change_detection,
    p_retrieval, p_prefilter, p_language, p_policy_note,
    p_full_text_available, p_sitemap_url, p_feed_url, p_match_count,
    p_sample_size, p_model_call_id, p_beat_guidance
  )
  on conflict (agent_id, url) do update set
    domain = excluded.domain, display_name = excluded.display_name,
    change_detection = excluded.change_detection,
    retrieval = excluded.retrieval, prefilter = excluded.prefilter,
    language = excluded.language, policy_note = excluded.policy_note,
    full_text_available = excluded.full_text_available,
    sitemap_url = excluded.sitemap_url, feed_url = excluded.feed_url,
    match_count = excluded.match_count, sample_size = excluded.sample_size,
    model_call_id = excluded.model_call_id,
    beat_guidance = excluded.beat_guidance, status = 'active',
    last_verified_at = now(), updated_at = now()
  returning id into v_id;

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
