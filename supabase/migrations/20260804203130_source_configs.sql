-- Applied via the Supabase MCP server
create table public.source_configs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  url text not null,
  domain text not null,
  display_name text,
  change_detection text not null
    check (change_detection in ('sitemap','rss','serp','page-diff')),
  retrieval text not null
    check (retrieval in ('none','feed','direct','unlocker','browser')),
  prefilter jsonb,
  language text,
  policy_note text,
  full_text_available text
    check (full_text_available in ('full','teaser','unknown')),
  sitemap_url text,
  feed_url text,
  match_count integer,
  sample_size integer,
  status text not null default 'active'
    check (status in ('active','failed_validation','stale')),
  model_call_id uuid references public.model_calls(id),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index source_configs_agent_url_idx
  on public.source_configs (agent_id, url);
alter table public.source_configs enable row level security;
-- deny-all: no policies. Service-role (admin client) only, matching
-- corpus_posts / x_accounts / draft_claims.

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
  p_model_call_id uuid
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.source_configs (
    agent_id, url, domain, display_name, change_detection, retrieval,
    prefilter, language, policy_note, full_text_available, sitemap_url,
    feed_url, match_count, sample_size, model_call_id
  ) values (
    p_agent_id, p_url, p_domain, p_display_name, p_change_detection,
    p_retrieval, p_prefilter, p_language, p_policy_note,
    p_full_text_available, p_sitemap_url, p_feed_url, p_match_count,
    p_sample_size, p_model_call_id
  )
  on conflict (agent_id, url) do update set
    domain = excluded.domain, display_name = excluded.display_name,
    change_detection = excluded.change_detection,
    retrieval = excluded.retrieval, prefilter = excluded.prefilter,
    language = excluded.language, policy_note = excluded.policy_note,
    full_text_available = excluded.full_text_available,
    sitemap_url = excluded.sitemap_url, feed_url = excluded.feed_url,
    match_count = excluded.match_count, sample_size = excluded.sample_size,
    model_call_id = excluded.model_call_id, status = 'active',
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

create or replace function public.remove_source_config(
  p_agent_id uuid,
  p_url text
) returns void
language plpgsql
as $$
begin
  delete from public.source_configs
  where agent_id = p_agent_id and url = p_url;

  update public.agents
  set websites = (
    select coalesce(jsonb_agg(w), '[]'::jsonb)
    from jsonb_array_elements_text(coalesce(websites, '[]'::jsonb)) as w
    where w <> p_url
  )
  where id = p_agent_id;
end;
$$;
