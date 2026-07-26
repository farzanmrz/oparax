-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): item 7 voice rules editing. Mirrors voice_guides's shape exactly
-- — reporter_handle-keyed, EXISTS-join-through-experiments, select-only, NO owner_id
-- (a rule is paid once per reporter, shared across every desk that reporter appears in),
-- service-role writes via lib/voice/rules.ts.
create table public.voice_rules (
  id uuid primary key default gen_random_uuid(),
  reporter_handle text not null,
  rule text not null,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  provenance_model_call_id uuid null references public.model_calls(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index voice_rules_reporter_handle_idx on public.voice_rules(reporter_handle);

alter table public.voice_rules enable row level security;

create policy voice_rules_select_via_experiment on public.voice_rules
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.reporter_handle = voice_rules.reporter_handle
      and e.owner_id = (select auth.uid())
  ));
