-- Applied via the Supabase MCP server

create or replace function public.claim_story_draft(
  p_draft_id uuid,
  p_stale_cutoff timestamptz
) returns boolean
language plpgsql
as $$
declare
  v_updated int;
begin
  update public.drafts
  set draft_requested_at = now()
  where id = p_draft_id
    and is_winner
    and model_call_id is null
    and (draft_requested_at is null or draft_requested_at < p_stale_cutoff);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.claim_story_draft from public, anon, authenticated;

create or replace function public.attach_story_draft(
  p_draft_id uuid,
  p_model_call_id uuid
) returns boolean
language plpgsql
as $$
declare
  v_updated int;
begin
  update public.drafts
  set model_call_id = p_model_call_id
  where id = p_draft_id
    and is_winner
    and model_call_id is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.attach_story_draft from public, anon, authenticated;
