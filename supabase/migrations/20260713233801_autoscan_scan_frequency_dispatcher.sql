-- ft/59: auto-scan dispatcher — scan-frequency reshape + runs/drafts ledger.
-- Delete every test desk except the one we keep, then reshape cadence into the
-- grouped scan_frequency shape and add the dispatcher ledger + observability tables.
-- Applied via the Supabase MCP against project pcgvpypzfwuchyfwdlwe; mirrored here.

delete from public.agents where name <> 'Barça Transfer Desk';
alter table public.agents rename column cadence to scan_frequency;

-- Convert old-shape rows generically (fires → window):
update public.agents a set scan_frequency = jsonb_build_object(
  'timezone', 'Europe/Madrid',
  'groups', jsonb_build_array(jsonb_build_object(
    'days', (select jsonb_agg(distinct (f->>'dayOfWeek')::int order by (f->>'dayOfWeek')::int)
             from jsonb_array_elements(a.scan_frequency->'fires') f),
    'start', (select to_char(min(make_time((f->>'hour')::int,(f->>'minute')::int,0)),'HH24:MI')
              from jsonb_array_elements(a.scan_frequency->'fires') f),
    'end',   (select to_char(max(make_time((f->>'hour')::int,(f->>'minute')::int,0)),'HH24:MI')
              from jsonb_array_elements(a.scan_frequency->'fires') f),
    'everyHours', 1)))
where a.scan_frequency ? 'kind';

-- Ledger. Added with default 'paused' so the legacy row can't fire; flipped to 'active' for new saves.
alter table public.agents add column status text not null default 'paused'
  check (status in ('active','paused'));
alter table public.agents add column next_run_at timestamptz;
alter table public.agents add constraint agents_active_has_next_run
  check (status <> 'active' or next_run_at is not null);
alter table public.agents alter column status set default 'active';
create index agents_due_idx on public.agents (next_run_at) where status = 'active';

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  status text not null default 'running' check (status in ('running','done','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  cost_usd numeric,          -- xAI real dollars (cost_in_usd_ticks / 1e10)
  usage jsonb,               -- DeepSeek/gateway tokens + cost if exposed
  trace jsonb,               -- observability: reasoning, drafted calls, grok subtool trace, clustering, timings
  result jsonb,              -- { items: [...] } — the Scans-tab payload
  error text
);
create index runs_agent_started_idx on public.runs (agent_id, started_at desc);
alter table public.runs enable row level security;
create policy "runs_select_own" on public.runs for select to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));
-- No authenticated write policies: only the service-role dispatcher writes runs.

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  item jsonb not null,       -- news-item snapshot {headline, body, sources}
  text text not null,        -- the drafted post
  usage jsonb,               -- DeepSeek usage for the drafting call
  created_at timestamptz not null default now()
);
create index drafts_agent_created_idx on public.drafts (agent_id, created_at desc);
alter table public.drafts enable row level security;
create policy "drafts_select_own" on public.drafts for select to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));
create policy "drafts_insert_own" on public.drafts for insert to authenticated
  with check (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = (select auth.uid())));
