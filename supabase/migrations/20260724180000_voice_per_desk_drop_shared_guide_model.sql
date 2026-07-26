-- Deletes the shared-per-reporter voice model outright (owner decision, not a reduction).
-- A voice guide and its rules now belong to ONE desk. Extraction always runs fresh; nothing
-- is deduped across users, capped per day, or reserved ahead of time.
--
-- What this removes and why it was wrong to have: extraction was paid once per
-- `reporter_handle` and shared across every desk on that reporter, which forced a global
-- unique key, an EXISTS-join RLS shape that let any signed-in user read any guide, a
-- once-per-reporter-per-UTC-day atomic claim, and a per-handle daily lookup cap. That is a
-- cost optimization for a scenario that does not happen — two users extracting the same
-- reporter — and it cost four pipeline gates, a table, and an undiagnosable failure mode.
--
-- NOTE on ordering: each old SELECT policy references the reporter_handle column it joins on,
-- so the policy must be dropped BEFORE the column, not after.

-- 1. voice_guides: reporter_handle -> experiment_id --------------------------------------
alter table public.voice_guides
  add column experiment_id uuid references public.experiments(id) on delete cascade;

update public.voice_guides g
set experiment_id = (
  select e.id from public.experiments e
  where lower(e.reporter_handle) = lower(g.reporter_handle)
  order by e.created_at asc
  limit 1
);

-- A guide with no owning desk can no longer be addressed by anything; it was only reachable
-- through the handle join being removed here.
delete from public.voice_guides where experiment_id is null;

drop policy if exists voice_guides_select_via_experiment on public.voice_guides;

alter table public.voice_guides
  alter column experiment_id set not null,
  drop column reporter_handle;

create unique index voice_guides_experiment_id_key on public.voice_guides(experiment_id);

-- Ownership is now structural rather than inferred through a shared handle, so the
-- reporter_verified_at condition the old policy carried is dropped with it: a guide is
-- readable exactly by the owner of the desk it belongs to.
create policy voice_guides_select_via_experiment on public.voice_guides
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.id = voice_guides.experiment_id
      and e.owner_id = (select auth.uid())
  ));

-- 2. voice_rules: reporter_handle -> experiment_id ---------------------------------------
alter table public.voice_rules
  add column experiment_id uuid references public.experiments(id) on delete cascade;

update public.voice_rules r
set experiment_id = (
  select e.id from public.experiments e
  where lower(e.reporter_handle) = lower(r.reporter_handle)
  order by e.created_at asc
  limit 1
);

delete from public.voice_rules where experiment_id is null;

drop policy if exists voice_rules_select_via_experiment on public.voice_rules;

alter table public.voice_rules
  alter column experiment_id set not null,
  drop column reporter_handle;

create index voice_rules_experiment_id_idx on public.voice_rules(experiment_id);

create policy voice_rules_select_via_experiment on public.voice_rules
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.id = voice_rules.experiment_id
      and e.owner_id = (select auth.uid())
  ));

-- 3. voice_extraction_claims -> voice_extraction_runs ------------------------------------
-- The claims table existed to ration spend: UNIQUE(reporter_handle, utc_day) as an atomic
-- once-per-reporter-per-day claim, plus a reserved_usd worst-case hold. All of that is gone.
-- What remains is the only part that earned its keep: a progress record the create screen can
-- read while extraction streams. One row per desk, overwritten by each new run.
drop table public.voice_extraction_claims;

create table public.voice_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null unique references public.experiments(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  stage text null,
  progress_note text null,
  reasoning_partial text null,
  cost_usd numeric null,
  error_code text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_extraction_runs enable row level security;
-- deny-all by design: no policies. lib/voice/extraction-run.ts (service-role) owns this table;
-- the browser reads it only through an ownership-proving server action.

create trigger voice_extraction_runs_set_updated_at
  before update on public.voice_extraction_runs
  for each row execute function extensions.moddatetime(updated_at);
