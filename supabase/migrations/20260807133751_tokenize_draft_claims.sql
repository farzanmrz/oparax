-- Applied via the Supabase MCP server
alter table public.draft_claims
  add column claim_token uuid not null default gen_random_uuid();

drop function public.claim_draft(uuid, uuid, timestamptz);

create function public.claim_draft(
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

revoke all on function public.claim_draft(uuid, uuid, timestamptz, uuid)
  from public, anon, authenticated;
