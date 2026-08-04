-- QC round 1, finding #5: add_source_config/remove_source_config were never revoked from
-- PUBLIC, contradicting the original migration's own comment ("Not granted to
-- authenticated/anon") and this repo's established precedent
-- (20260730153002_issue_98_fix_agent_id_sync_updates.sql:127). Postgres grants EXECUTE to
-- PUBLIC by default, and PostgREST auto-exposes public functions as /rest/v1/rpc/<name> —
-- without this revoke, an authenticated reporter could call either function directly,
-- bypassing every validation this slice's server actions build. Both functions are
-- SECURITY INVOKER, so RLS applies as the caller: a direct remove_source_config call on the
-- caller's own desk would silently no-op the source_configs delete (deny-all RLS) while the
-- agents.websites update succeeds — reproducing exactly the orphan-config bug the atomic-RPC
-- design exists to prevent. A direct add_source_config call would let a reporter inject an
-- arbitrary unvalidated URL string straight into agents.websites with zero backing config.
revoke all on function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid
) from public;
revoke all on function public.remove_source_config(uuid, text) from public;
