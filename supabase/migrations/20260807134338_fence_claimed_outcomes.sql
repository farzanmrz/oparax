-- Applied via the Supabase MCP server
create function public.insert_claimed_winner(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_claim_token uuid,
  p_story_id uuid,
  p_platform text,
  p_model_call_id uuid,
  p_news_title text,
  p_news_synthesis text,
  p_translation text
) returns uuid
language plpgsql
as $$
declare
  v_draft_id uuid;
begin
  with owned_claim as materialized (
    select 1
    from public.draft_claims
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
      and claim_token = p_claim_token
    for update
  )
  insert into public.drafts (
    source_post_id,
    agent_id,
    story_id,
    platform,
    model_call_id,
    is_winner,
    judge_verdict,
    news_title,
    news_synthesis,
    translation,
    judge_review
  )
  select
    p_source_post_id,
    p_agent_id,
    p_story_id,
    p_platform,
    p_model_call_id,
    true,
    null,
    p_news_title,
    p_news_synthesis,
    p_translation,
    null
  from owned_claim
  returning id into v_draft_id;

  return v_draft_id;
end;
$$;

create function public.upsert_claimed_exclusion(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_claim_token uuid,
  p_on_beat_reason text,
  p_excluded_at timestamptz
) returns uuid
language plpgsql
as $$
declare
  v_exclusion_id uuid;
begin
  with owned_claim as materialized (
    select 1
    from public.draft_claims
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
      and claim_token = p_claim_token
    for update
  )
  insert into public.excluded_posts (
    agent_id,
    source_post_id,
    on_beat_reason,
    excluded_at
  )
  select
    p_agent_id,
    p_source_post_id,
    p_on_beat_reason,
    p_excluded_at
  from owned_claim
  on conflict (agent_id, source_post_id) do update
  set on_beat_reason = excluded.on_beat_reason,
      excluded_at = excluded.excluded_at
  returning id into v_exclusion_id;

  return v_exclusion_id;
end;
$$;

revoke all on function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text
) from public, anon, authenticated;

revoke all on function public.upsert_claimed_exclusion(
  uuid, uuid, uuid, text, timestamptz
) from public, anon, authenticated;
