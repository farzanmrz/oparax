-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): item 1's spend gate. Deny-all, UNIQUE(reporter_handle, utc_day) —
-- an atomic pre-flight claim (D16 rail), not sum-then-check: the loser's INSERT violates the
-- constraint and is rejected before any billable call fires. lib/voice/spend-gate.ts owns
-- reserved_usd (pre-flight) and actual_usd (finalize, success or failure — completed paid
-- work stays metered).
create table public.voice_extraction_claims (
  id uuid primary key default gen_random_uuid(),
  reporter_handle text not null,
  utc_day date not null,
  reserved_usd numeric not null,
  actual_usd numeric null,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_handle, utc_day)
);

alter table public.voice_extraction_claims enable row level security;
-- deny-all by design: no policies; lib/voice/spend-gate.ts (service-role) owns this table
