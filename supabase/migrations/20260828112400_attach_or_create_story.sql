-- Applied via the Supabase MCP server
-- Issue #131 Part B2: the grouping stage's atomic match-or-create. PostgREST gives every call
-- its own transaction, so a pg_advisory_xact_lock cannot be held ACROSS the model judgment —
-- instead the lock serializes the mutation, and the "unseen" handshake closes the remaining
-- window: when the caller judged against a story set that has since grown (two posts of one
-- new story arriving in parallel), the RPC returns the unseen story ids instead of creating a
-- duplicate, and the caller re-judges against exactly those before calling again.
create function public.attach_or_create_story(
  p_agent_id uuid,
  p_source_post_id uuid,
  p_summary text,
  p_match_story_id uuid,
  p_known_story_ids uuid[]
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_story_id uuid;
  v_unseen uuid[];
begin
  perform pg_advisory_xact_lock(hashtext(p_agent_id::text));

  -- A match the caller judged: attach to it (the same-post unique makes a duplicate attach a
  -- no-op; on conflict the winner's story stands).
  if p_match_story_id is not null and exists (
    select 1 from public.stories where id = p_match_story_id and agent_id = p_agent_id
  ) then
    insert into public.story_assignments (source_post_id, agent_id, story_id)
    values (p_source_post_id, p_agent_id, p_match_story_id)
    on conflict (source_post_id, agent_id) do nothing;

    select story_id into v_story_id
    from public.story_assignments
    where source_post_id = p_source_post_id and agent_id = p_agent_id;

    return jsonb_build_object('outcome', 'attached', 'story_id', v_story_id);
  end if;

  -- No match: refuse to create while recent stories exist that the caller never judged.
  select coalesce(array_agg(id), '{}') into v_unseen
  from public.stories
  where agent_id = p_agent_id
    and created_at > now() - interval '10 minutes'
    and id <> all (coalesce(p_known_story_ids, '{}'));
  if array_length(v_unseen, 1) > 0 then
    return jsonb_build_object('outcome', 'unseen', 'story_ids', to_jsonb(v_unseen));
  end if;

  -- Create + claim, same race semantics the old assignToStory had: on a same-post conflict the
  -- concurrent winner's story stands and the fresh story row is deleted as an orphan.
  insert into public.stories (agent_id, summary)
  values (p_agent_id, p_summary)
  returning id into v_story_id;

  begin
    insert into public.story_assignments (source_post_id, agent_id, story_id)
    values (p_source_post_id, p_agent_id, v_story_id);
  exception when unique_violation then
    delete from public.stories where id = v_story_id;
    select story_id into v_story_id
    from public.story_assignments
    where source_post_id = p_source_post_id and agent_id = p_agent_id;
    return jsonb_build_object('outcome', 'attached', 'story_id', v_story_id);
  end;

  return jsonb_build_object('outcome', 'created', 'story_id', v_story_id);
end;
$$;

revoke all on function public.attach_or_create_story(uuid, uuid, text, uuid, uuid[])
  from public, anon, authenticated;
