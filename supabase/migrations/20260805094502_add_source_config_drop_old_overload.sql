-- QC round 1, finding #1: 20260805065846_source_configs_adaptive_retrieval.sql used
-- `create or replace function` while ADDING a parameter (p_beat_guidance). Postgres keys
-- function identity on the argument type list, so that created a SECOND overload instead of
-- replacing the original -- leaving the old 15-arg version (correctly PUBLIC-revoked by
-- 20260804215939_source_configs_revoke_public.sql) AND a new, un-revoked 16-arg version both
-- live. Confirmed against pg_proc: the 16-arg row carried a leading `=X/postgres` PUBLIC
-- entry. That reopened exactly the hole 20260804215939 was written to close -- a direct
-- /rest/v1/rpc/add_source_config call injecting an arbitrary unvalidated URL into
-- agents.websites (the function is SECURITY INVOKER, so the source_configs insert no-ops
-- under deny-all RLS while the agents.websites update succeeds) with no backing config.
--
-- Drop the now-genuinely-dead 15-arg overload -- nothing in this codebase calls it anymore,
-- lib/sources/onboard-source.ts passes all 16 named args -- and lock down the 16-arg one.
drop function if exists public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid
);

-- Revoking from PUBLIC alone is not sufficient here: Supabase's default privileges on the
-- public schema also hand anon and authenticated their OWN explicit execute grants, which a
-- `from public` revoke does not touch (20260804215939 left both roles granted on the 15-arg
-- function for this reason). The finding's whole premise is an *authenticated* caller, so
-- name those roles too. service_role keeps its grant -- onboard-source.ts calls this RPC
-- through the admin client.
revoke all on function public.add_source_config(
  uuid, text, text, text, text, text, jsonb, text, text, text, text, text, integer, integer, uuid, jsonb
) from public, anon, authenticated;
