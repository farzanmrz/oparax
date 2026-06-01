-- Drop the legacy workflows module's database objects, now that the legacy
-- code (app/dashboard/workflows, app/api/{scan,draft,cron/workflow-scans},
-- lib/workflow-*) has been removed. The slice-1 loop tables (x_connections,
-- monitors, scans, stories, drafts, posts) and the shared handle_updated_at()
-- trigger function are intentionally KEPT.
--
-- Drop order respects FK constraints (CASCADE also clears their indexes/policies):
--   scan_items -> scan_runs -> triggers -> workflows.

drop table if exists public.scan_items cascade;
drop table if exists public.scan_runs cascade;
drop table if exists public.triggers cascade;
drop table if exists public.workflows cascade;

-- Legacy stored functions (only ever used by the workflow cron).
drop function if exists public.claim_due_workflow_trigger();
drop function if exists public.trigger_frequency_interval(integer, public.trigger_frequency_unit);

-- Legacy enum, no longer referenced by any retained table or function.
drop type if exists public.trigger_frequency_unit;

-- NOTE: public.handle_updated_at() is deliberately retained — it backs the
-- updated_at triggers on x_connections, monitors, and drafts.
