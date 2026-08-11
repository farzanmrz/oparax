-- Bound Issue 120's paired news-points payload at the database boundary, matching the
-- synthesizer's Zod contract. Validation failures are terminal exclusions in the application.
create or replace function public.insert_claimed_winner(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_claim_token uuid,
  p_story_id uuid,
  p_platform text,
  p_model_call_id uuid,
  p_news_title text,
  p_news_synthesis text,
  p_translation text,
  p_news_points jsonb,
  p_on_beat_reason text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_draft_id uuid;
begin
  if p_news_points is null
    or jsonb_typeof(p_news_points) <> 'array'
    or jsonb_array_length(p_news_points) = 0
    or jsonb_array_length(p_news_points) > 100
    or exists (
      select 1
      from jsonb_array_elements(p_news_points) as point(value)
      where jsonb_typeof(point.value) <> 'object'
        or jsonb_typeof(point.value -> 'reason') <> 'string'
        or btrim(point.value ->> 'reason') = ''
        or char_length(point.value ->> 'reason') > 2000
        or jsonb_typeof(point.value -> 'point') <> 'string'
        or btrim(point.value ->> 'point') = ''
        or char_length(point.value ->> 'point') > 2000
    ) then
    raise exception using
      errcode = '22023',
      message = 'news_points must contain 1 to 100 { reason, point } objects with non-empty strings of at most 2000 characters';
  end if;

  if p_on_beat_reason is null or btrim(p_on_beat_reason) = '' then
    raise exception using
      errcode = '22023',
      message = 'on_beat_reason must be a non-empty string';
  end if;

  with owned_claim as materialized (
    select id
    from public.draft_claims
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
      and claim_token = p_claim_token
      and completed_at is null
    for update
  ),
  completed_claim as materialized (
    update public.draft_claims as claim
    set completed_at = now()
    from owned_claim
    where claim.id = owned_claim.id
      and claim.completed_at is null
    returning claim.id
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
    news_points,
    on_beat_reason,
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
    p_news_points,
    p_on_beat_reason,
    null
  from completed_claim
  returning id into v_draft_id;

  return v_draft_id;
end;
$$;

revoke all on function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text, jsonb, text
) from public, anon, authenticated;

-- Every terminal no-artifact path now records an excluded_posts row atomically.
drop function public.complete_claimed_no_artifact(uuid, uuid, uuid);
