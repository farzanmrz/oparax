-- Applied via the Supabase MCP server
alter table public.draft_claims
  add column completed_at timestamptz null;

create or replace function public.claim_draft(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_stale_cutoff timestamptz,
  p_claim_token uuid
) returns boolean
language plpgsql
as $$
declare
  v_claimed_id uuid;
begin
  if exists (
    select 1
    from public.drafts
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
      and is_winner = true
  ) or exists (
    select 1
    from public.excluded_posts
    where agent_id = p_agent_id
      and source_post_id = p_source_post_id
  ) then
    return false;
  end if;

  insert into public.draft_claims (
    agent_id,
    source_post_id,
    claim_token
  ) values (
    p_agent_id,
    p_source_post_id,
    p_claim_token
  )
  on conflict (source_post_id, agent_id) do update
  set created_at = now(),
      claim_token = excluded.claim_token
  where public.draft_claims.created_at < p_stale_cutoff
    and public.draft_claims.completed_at is null
    and not exists (
      select 1
      from public.drafts
      where agent_id = p_agent_id
        and source_post_id = p_source_post_id
        and is_winner = true
    )
    and not exists (
      select 1
      from public.excluded_posts
      where agent_id = p_agent_id
        and source_post_id = p_source_post_id
    )
  returning id into v_claimed_id;

  return v_claimed_id is not null;
end;
$$;

create or replace function public.insert_claimed_winner(
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
  from completed_claim
  returning id into v_draft_id;

  return v_draft_id;
end;
$$;

create or replace function public.upsert_claimed_exclusion(
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
  from completed_claim
  on conflict (agent_id, source_post_id) do update
  set on_beat_reason = excluded.on_beat_reason,
      excluded_at = excluded.excluded_at
  returning id into v_exclusion_id;

  return v_exclusion_id;
end;
$$;

revoke all on function public.claim_draft(uuid, uuid, timestamptz, uuid)
  from public, anon, authenticated;

revoke all on function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text
) from public, anon, authenticated;

revoke all on function public.upsert_claimed_exclusion(
  uuid, uuid, uuid, text, timestamptz
) from public, anon, authenticated;
