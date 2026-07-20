-- ft/63: cost split + frozen search template + onboarding provenance.
-- Splits runs.cost_usd (grok-only) into grok + DeepSeek, adds a source marker to
-- runs and drafts, and stores the frozen search template on agents. Defaults double
-- as backfill for existing rows (pre-existing manual runs read as 'scheduled' —
-- accepted; there is no way to distinguish them retroactively).
-- Applied via the Supabase MCP against project pcgvpypzfwuchyfwdlwe; mirrored here.

-- The drafted x_search calls, frozen at desk save from the onboarding chat's last
-- executed scan. Scheduled/manual runs restamp only the date window and reuse these
-- verbatim instead of re-deriving queries every run. Nullable: a desk saved without a
-- chat scan (legacy, or a direct saveAgent call) has none and falls back to drafting.
alter table public.agents add column search_template jsonb;

-- Cost split. cost_usd was grok-only (summed x_search tool costs); rename it to name
-- that truthfully and add the DeepSeek side (cluster + structure passes). Both nullable:
-- a provider that doesn't expose a dollar estimate persists null (unknown), never a
-- fabricated price. A COGS query is sum(cost_grok) + sum(cost_deepseek).
alter table public.runs rename column cost_usd to cost_grok;
alter table public.runs add column cost_deepseek numeric;

-- Provenance marker for the UI (issue #65) to badge and for COGS slicing. Default
-- 'scheduled' backfills the dispatcher-written history; manual scan-now and onboarding
-- saves set their own value.
alter table public.runs add column source text not null default 'scheduled'
  check (source in ('scheduled','manual','onboarding'));

-- Drafts are DeepSeek-only, so one cost column. Default source 'manual' backfills the
-- dashboard "Draft selected" history; onboarding saves set 'onboarding'.
alter table public.drafts add column cost_deepseek numeric;
alter table public.drafts add column source text not null default 'manual'
  check (source in ('manual','onboarding'));
