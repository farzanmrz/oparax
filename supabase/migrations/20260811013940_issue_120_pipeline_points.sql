-- Issue 120: preserve the source's claim kind and atomically persist point-based stories.
--
-- Release order is intentionally coupled: deploy the application that calls the replacement
-- insert_claimed_winner signature immediately after this migration commits. The previous
-- signature is deliberately dropped rather than retained as an overload.

do $$
begin
  create type public.publisher_claim_kind as enum (
    'official',
    'insider-sourced',
    'outlet-characterization',
    'aggregator'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.source_posts
  add column publisher_claim_kind public.publisher_claim_kind default 'aggregator';

-- Existing website rows are publisher reporting by default. Explicit source text remains the
-- authoritative attribution signal in the synthesizer, while X remains conservatively
-- aggregator-shaped unless a later slice earns a higher-trust classification.
update public.source_posts
set publisher_claim_kind = 'outlet-characterization'
where source = 'website';

alter table public.source_posts
  alter column publisher_claim_kind set not null;

alter table public.drafts
  add column news_points jsonb null,
  add column on_beat_reason text null,
  add constraint drafts_news_points_nonempty_array check (
    news_points is null
    or (
      jsonb_typeof(news_points) = 'array'
      and jsonb_array_length(news_points) > 0
    )
  );

revoke all on function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text
) from public, anon, authenticated;

drop function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text
);

create function public.insert_claimed_winner(
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
    or exists (
      select 1
      from jsonb_array_elements(p_news_points) as point(value)
      where jsonb_typeof(point.value) <> 'object'
        or jsonb_typeof(point.value -> 'reason') <> 'string'
        or btrim(point.value ->> 'reason') = ''
        or jsonb_typeof(point.value -> 'point') <> 'string'
        or btrim(point.value ->> 'point') = ''
    ) then
    raise exception using
      errcode = '22023',
      message = 'news_points must be a non-empty array of { reason, point } objects';
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

-- Provider context-limit failures are terminal for this exact delivery: preserve the claim
-- fence without writing a story or draft, so worker retries do not rebill unchanged input.
create function public.complete_claimed_no_artifact(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_claim_token uuid
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_completed_id uuid;
begin
  with owned_claim as materialized (
    select id
    from public.draft_claims
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
      and claim_token = p_claim_token
      and completed_at is null
    for update
  )
  update public.draft_claims as claim
  set completed_at = now()
  from owned_claim
  where claim.id = owned_claim.id
    and claim.completed_at is null
  returning claim.id into v_completed_id;

  return v_completed_id is not null;
end;
$$;

revoke all on function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text, jsonb, text
) from public, anon, authenticated;

revoke all on function public.complete_claimed_no_artifact(uuid, uuid, uuid)
  from public, anon, authenticated;
