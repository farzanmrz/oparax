-- ft/66: model_calls — the universal per-model-call ledger.
--
-- The invariant this table exists to enforce (see decisions.md L12): EVERY model call,
-- at every stage, records its OUTPUT and its REASONING TRACE, whether one model runs or
-- five. Recording a token count without the trace is not compliance — it proves that
-- thinking happened, not what it concluded.
--
-- Shape follows L4's own argument, extended from drafting to every stage: council members
-- are ROWS, not a json blob, so per-model cost, the retirement rule, and "why did this
-- win" each stay ONE query. Extraction has the same shape the moment the council lands
-- (primary + three analysts + falsify = five calls per reporter), so a provenance blob on
-- voice_guides would have rebuilt exactly the anti-pattern L4 rejected.
--
-- Applied via the Supabase MCP against project pcgvpypzfwuchyfwdlwe; mirrored here.

create table public.model_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  stage text not null,                      -- voice_extraction | drafting | judge | scan | …
  role text not null default 'primary',     -- primary | analyst | judge | falsify | revision
  model text not null,
  output text,                              -- what the model returned, verbatim
  reasoning text,                           -- the thinking trace, verbatim
  usage jsonb,                              -- incl. thinking/reasoning token counts
  cost_usd numeric,
  generation_id text,
  ref_kind text,                            -- reporter_handle | source_post | …
  ref_id text,
  created_at timestamptz not null default now()
);
-- stage+model covers the retirement rule ("which models never win?"); ref covers
-- "every call that produced this artifact".
create index model_calls_owner_id_idx on public.model_calls (owner_id);
create index model_calls_stage_model_idx on public.model_calls (stage, model);
create index model_calls_ref_idx on public.model_calls (ref_kind, ref_id);
alter table public.model_calls enable row level security;
create policy "model_calls_select_own" on public.model_calls
  for select to authenticated using ((select auth.uid()) = owner_id);
-- No authenticated write policies: only the service-role client writes model_calls —
-- a browser must not be able to forge or erase the record of what a model produced.

-- post_drafts slims to draft-specific semantics. The model's output, reasoning, usage and
-- cost move to its model_calls row, so there is exactly ONE home for "what did a model
-- return". Free to restructure: the table has zero rows (nothing has been drafted yet).
alter table public.post_drafts
  drop column model,
  drop column text,
  drop column cost_usd,
  drop column usage,
  drop column reasoning,
  add column model_call_id uuid not null references public.model_calls (id) on delete cascade;
create index post_drafts_model_call_id_idx on public.post_drafts (model_call_id);
