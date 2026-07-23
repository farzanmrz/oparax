-- D16 hardening (decisions.md) + post-outcome columns for the new UI's Post-to-X path.
-- Applied via the claude.ai Supabase connector 2026-07-22 (migration name: d16_dedup_and_post_outcome).
--
-- 1. post_drafts gains the post-outcome columns the desk UI stamps after a real post
--    (the old `drafts` table carried these; the council-era `post_drafts` did not).
-- 2. draft_claims: atomic dedup for the council — INSERT with a unique (source_post_id,
--    experiment_id) replaces draft-pipeline's non-atomic select-then-insert guard, so two
--    concurrent deliveries of the same post pay exactly one council run. Deny-all RLS
--    (service-role only), the x_accounts/source_posts shape.
-- 3. unmatched_deliveries: un-owned counter for deliveries whose author matches no
--    experiment — usage_events.owner_id is NOT NULL, so these were invisible to the
--    80%-of-cap stream alarm (D16a). Deny-all RLS.
-- 4. Partial unique index makes applyCorrection's email-reply idempotency atomic (D16b).

alter table public.post_drafts
  add column posted_at timestamptz,
  add column posted_tweet_id text,
  add column posted_url text;

create table public.draft_claims (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.source_posts(id) on delete cascade,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_post_id, experiment_id)
);
create index draft_claims_experiment_id_idx on public.draft_claims (experiment_id);
alter table public.draft_claims enable row level security;

create table public.unmatched_deliveries (
  id uuid primary key default gen_random_uuid(),
  x_post_id text not null,
  author_handle text not null,
  created_at timestamptz not null default now()
);
alter table public.unmatched_deliveries enable row level security;

create unique index usage_events_email_reply_ref_id_uidx
  on public.usage_events (ref_id) where kind = 'email_reply_received';
