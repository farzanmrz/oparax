-- Applied via the Supabase MCP server
-- Issue #131 Part D correction: cap counting and release semantics. A definite send failure is
-- RELEASED by the caller deleting its reservation row; a timed-out send whose outcome is
-- unknown is finalized 'failed' by the reconcile sweep but its row REMAINS and keeps counting
-- against the windows (it MAY have delivered — never hand its slot back). So the counts cover
-- every row present in the window, regardless of state.
create or replace function public.reserve_dm_send(
  p_purpose text,
  p_recipient text,
  p_agent_id uuid,
  p_idempotency_key text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('oparax_dm_send_app_cap'));
  perform pg_advisory_xact_lock(hashtext(p_recipient));

  -- An already-consumed idempotency key is a refusal: the send was already attempted.
  if exists (
    select 1 from public.dm_send_ledger where idempotency_key = p_idempotency_key
  ) then
    return null;
  end if;

  -- App-wide: 1,400/24h leaves margin under X's 1,440/24h per app.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where reserved_at > now() - interval '24 hours';
  if v_count >= 1400 then
    return null;
  end if;

  -- Per recipient: 1,440/24h.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where recipient_x_user_id = p_recipient
    and reserved_at > now() - interval '24 hours';
  if v_count >= 1440 then
    return null;
  end if;

  -- Per recipient: 15/15min.
  select count(*)::integer into v_count
  from public.dm_send_ledger
  where recipient_x_user_id = p_recipient
    and reserved_at > now() - interval '15 minutes';
  if v_count >= 15 then
    return null;
  end if;

  insert into public.dm_send_ledger (purpose, agent_id, recipient_x_user_id, idempotency_key)
  values (p_purpose, p_agent_id, p_recipient, p_idempotency_key)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.reserve_dm_send(text, text, uuid, text)
  from public, anon, authenticated;
