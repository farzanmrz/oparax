-- lib/voice/extraction-run.ts's startRun did a PostgREST PATCH whose .or() filter referenced
-- `status` while the same request's SET body also wrote `status` -- confirmed live (both via
-- the real REST API and via raw SQL, which showed the column genuinely exists) that PostgREST
-- throws 42703 "column ... does not exist" on that exact shape, not a schema problem. This
-- silently broke the one-run-at-a-time atomic claim for EVERY desk's voice extraction.
--
-- Fix: move the conditional claim into a plpgsql RPC, matching this codebase's own existing
-- pattern for atomic conditional writes (add_source_config, remove_source_config,
-- reserve_pending_source_config) -- a single UPDATE ... WHERE inside real SQL sidesteps
-- PostgREST's filter parser entirely.
create or replace function public.reclaim_extraction_run(
  p_agent_id uuid,
  p_stale_cutoff timestamptz
) returns boolean
language plpgsql
as $$
declare
  v_updated int;
begin
  update public.voice_extraction_runs
  set status = 'running',
      stage = 'starting',
      progress_note = null,
      reasoning_partial = null,
      error_code = null,
      cost_usd = null,
      started_at = now(),
      finished_at = null,
      updated_at = now()
  where agent_id = p_agent_id
    and (status <> 'running' or updated_at < p_stale_cutoff);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.reclaim_extraction_run from public, anon, authenticated;
