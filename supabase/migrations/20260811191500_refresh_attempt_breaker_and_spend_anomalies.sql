-- Applied via the Supabase MCP server (remote version 20260811191500).
-- Defense-in-depth against the 2026-08-09 runaway: a legacy active source whose
-- strip-phrase refresh never persisted a terminal marker was re-run by the poller every
-- tick for three days, at full agentic-resolver cost. The immediate hole is closed in
-- lib/sources/onboard-source.ts (refresh-mode failures now write strip_phrases = []), but
-- that fix only covers the failure branches that exist TODAY. This breaker bounds the loop
-- structurally, so any future branch that forgets a terminal write costs 3 attempts, never
-- three days.
alter table public.source_configs
  add column if not exists refresh_attempts integer not null default 0;

comment on column public.source_configs.refresh_attempts is
  'Strip-phrase refresh attempts spent on this row. Incremented BEFORE the work (see '
  'claim_strip_phrase_refresh_attempt) so a hard-killed invocation still burns its attempt — '
  'counting after the work would let a crash loop forever. Only meaningful while '
  'status=active AND strip_phrases IS NULL; a successful refresh leaves that set anyway.';

-- Atomically burn one attempt and report the new count. Returns NULL when the row is not a
-- live refresh target at all, which the caller treats as "nothing to do" (409), exactly like
-- the route's existing precondition. The increment and the eligibility check are one
-- statement so two concurrent ticks can never both read attempt 3 and both proceed.
create or replace function public.claim_strip_phrase_refresh_attempt(p_config_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  update public.source_configs
  set refresh_attempts = refresh_attempts + 1,
      updated_at = now()
  where id = p_config_id
    and status = 'active'
    and strip_phrases is null
  returning refresh_attempts into v_attempts;

  return v_attempts;
end;
$$;

revoke all on function public.claim_strip_phrase_refresh_attempt(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_strip_phrase_refresh_attempt(uuid)
  to postgres, service_role;

-- The runaway was trivially visible in the ledger the whole time (one ref_id, hundreds of
-- calls, $69) and invisible in any provider-side total, which only knows team-wide spend.
-- This is the query that would have caught it on day one, as an RPC so the read stays in
-- SQL and the caller stays a thin reporter.
create or replace function public.detect_spend_anomalies(
  p_since timestamptz,
  p_min_calls integer default 50,
  p_min_cost numeric default 5
)
returns table (stage text, ref_id text, calls bigint, total_cost numeric, first_call timestamptz, last_call timestamptz)
language sql
stable
set search_path = ''
as $$
  select
    mc.stage,
    mc.ref_id,
    count(*) as calls,
    round(coalesce(sum(mc.cost_usd), 0)::numeric, 4) as total_cost,
    min(mc.created_at) as first_call,
    max(mc.created_at) as last_call
  from public.model_calls mc
  where mc.created_at >= p_since
  group by mc.stage, mc.ref_id
  having count(*) >= p_min_calls
      or coalesce(sum(mc.cost_usd), 0) >= p_min_cost
  order by coalesce(sum(mc.cost_usd), 0) desc nulls last;
$$;

revoke all on function public.detect_spend_anomalies(timestamptz, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.detect_spend_anomalies(timestamptz, integer, numeric)
  to postgres, service_role;
