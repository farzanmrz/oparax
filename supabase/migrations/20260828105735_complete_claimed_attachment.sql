-- Applied via the Supabase MCP server
-- Issue #131 Part B2: terminate a draft claim whose delivery was ATTACHED to an existing story
-- by the grouping stage instead of landing a new winner. Mirrors insert_claimed_winner's
-- owned_claim CTE: the completion happens only under the claim_token fence, and only after the
-- attachment is actually recorded — never write upsert_claimed_exclusion for an attached post
-- (it would poison claim_draft's settled check and miscount Skipped).
create function public.complete_claimed_attachment(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_claim_token uuid,
  p_story_id uuid
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_completed_id uuid;
begin
  -- The attachment must exist for this (post, desk) pair before the claim may terminate. The
  -- assignment can legitimately point at a different story than p_story_id when a concurrent
  -- attach won the story_assignments unique race — any recorded assignment settles the claim.
  if not exists (
    select 1
    from public.story_assignments
    where source_post_id = p_source_post_id
      and agent_id = p_agent_id
  ) then
    return false;
  end if;

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
  returning claim.id into v_completed_id;

  return v_completed_id is not null;
end;
$$;

revoke all on function public.complete_claimed_attachment(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
