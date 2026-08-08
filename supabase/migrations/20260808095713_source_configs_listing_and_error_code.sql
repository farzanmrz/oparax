-- Applied via the Supabase MCP server
alter table public.source_configs
  drop constraint source_configs_change_detection_check,
  add constraint source_configs_change_detection_check
    check (change_detection in ('sitemap', 'rss', 'serp', 'page-diff', 'listing')),
  add column error_code text,
  add column listing_url text;

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
        error_code = null,
        updated_at = now()
    where id = v_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

drop function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb
);

create function public.add_source_config(
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
  insert into public.source_configs (
    agent_id, url, domain, display_name, change_detection, retrieval,
    prefilter, language, policy_note, full_text_available, sitemap_url,
    feed_url, match_count, sample_size, model_call_id, beat_guidance,
    listing_url, error_code
  ) values (
    p_agent_id, p_url, p_domain, p_display_name, p_change_detection,
    p_retrieval, p_prefilter, p_language, p_policy_note,
    p_full_text_available, p_sitemap_url, p_feed_url, p_match_count,
    p_sample_size, p_model_call_id, p_beat_guidance, p_listing_url, null
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
    beat_guidance = excluded.beat_guidance,
    listing_url = excluded.listing_url, error_code = null, status = 'active',
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

revoke all on function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text
) from public, anon, authenticated;
grant execute on function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb, text
) to postgres, service_role;
