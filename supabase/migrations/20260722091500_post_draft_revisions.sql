-- ft/67: post_drafts revision columns — inbound email replies (L5) correct a draft by
-- producing a NEW post_drafts row, never mutating the original (a post_drafts row is an
-- immutable pointer to what a specific model call produced — L12).
--
-- parent_draft_id: which draft this revision corrects (self-FK; null for council originals).
-- feedback: the reporter's correction text, verbatim — the input that caused this revision.
-- Draft semantics only: the revision's model output/reasoning/cost live on its own
-- model_calls row via model_call_id, exactly like every other draft row.
--
-- RLS shape UNCHANGED: EXISTS-join through experiments for SELECT, zero authenticated write
-- policies (service-role writes only). Purely additive — no existing column or policy moves.
--
-- Applied via the Supabase MCP against project pcgvpypzfwuchyfwdlwe; mirrored here. Verified
-- after apply: both columns nullable, post_drafts still carries only its EXISTS-join SELECT
-- policy (no authenticated writes), and get_advisors reported no new security lints.

alter table public.post_drafts
  add column parent_draft_id uuid references public.post_drafts (id) on delete set null,
  add column feedback text;

create index post_drafts_parent_draft_id_idx on public.post_drafts (parent_draft_id);
