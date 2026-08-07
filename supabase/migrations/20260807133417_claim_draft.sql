-- Applied via the Supabase MCP server
create or replace function public.claim_draft(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_stale_cutoff timestamptz
) returns boolean
language plpgsql
as $$
declare
  v_claimed_id uuid;
begin
  insert into public.draft_claims (
    agent_id,
    source_post_id
  ) values (
    p_agent_id,
    p_source_post_id
  )
  on conflict (source_post_id, agent_id) do update
  set created_at = now()
  where public.draft_claims.created_at < p_stale_cutoff
  returning id into v_claimed_id;

  return v_claimed_id is not null;
end;
$$;

revoke all on function public.claim_draft from public, anon, authenticated;
