---
paths:
  - "lib/agent/**"
  - "app/api/ingest/**"
  - "app/api/email/inbound/**"
---

# The desk agent

Prompt-writing conventions and drift guards for `lib/sysprompts/*.md` live in
`.claude/rules/sysprompts.md`. This file is the TypeScript and architecture side.

## What actually runs

Every draft originates from an inbound delivery at `POST /api/ingest`. There is no
scan dispatcher, no polling, and no scan-frequency scheduler anywhere in the app.

- **`draft-ground.ts`'s `groundSourcePost`** — one vision-capable Qwen 3.7 Flash call
  per delivery, translating + filtering + synthesizing + drafting in one pass.
- **`draft-judge.ts`'s `judgeGroundVerdict`** — Qwen 3.7 Flash on every usable ground
  verdict, receiving the original media so it independently checks visual claims,
  synthesis, translation, beat and draft. Its usable output is final; a transport or
  schema failure fails open to the ledgered ground verdict.
- **`draft-council-run.ts`** survives only for `reviseDraft`, called from
  `applyCorrection`. **`EMAIL_DELIVERY_ENABLED` gates only the OUTBOUND draft email**
  — the inbound webhook always calls `applyCorrection` on a correction. That path is
  dormant because `RESEND_*` is unprovisioned, not because of the flag.
- **`cluster.ts`** — dormant behind `CLUSTERING_ENABLED = false`.

`/agents/new` inserts straight into `experiments`: no typed handle field, no
assistant. `createDesk` reads `reporter_handle` off the linked `x_accounts` row and
stamps `reporter_verified_at` at insert, so every desk is born verified.

## Structured output: the three-leg recipe, copied whole

`alibaba/qwen3.7-flash` everywhere. Reasoning: `medium` on the grounder, `high` on the
judge, model default on revision/repair, `none` on the dormant classifier.

A 29-call probe established the failure mode a provider swap does not remove:
schema↔prompt field-name inconsistency broke every configuration, while the consistent
pair passed 5/5 under all of them. **A proven pattern must be copied whole, not one
knob at a time** — a prior call took the reasoning knob without leg 1 and returned `{}`
deterministically.

1. **Exact, imperatively named fields, matched between schema and prompt.** The judge
   receives the grounder's candidate as `firstDraft` but answers in `finalDraft`, and
   `correctedFields` must say `"finalDraft"` too. `rawJudgeVerdictSchema` accepts the
   one historically observed `"firstDraft"` alias and normalizes it; that rail is not
   prompt vocabulary, and other aliases still fail validation.
2. **Defined behavior on validation failure, never silent degradation.** Grounding
   returns a null verdict and releases the claim for retry; the judge returns a
   ledgered null verdict and the pipeline fails open; clustering deterministically
   creates a new one-source story.
3. **Output headroom against mid-object truncation** — `8192` on grounder and judge,
   `2000` on the smaller clustering verdict.

The judge uses AI SDK v7 `generateText` + `Output.object`; the grounder and classifier
use `generateObject`. That API difference does not relax exact field-name matching.

## The carry-over trap

Every name, handle, number, quote and time in a draft must appear in the BRIEF. The
voice guide supplies voice and structure, **never facts**.

`checkViolations` in `draft-council-run.ts` is **hygiene-only** — markdown, `<post>`
tags, preamble, char ceiling. It does not check carry-over; fabrication is caught by
the drafting-contract prompt alone. A deterministic @handle-against-brief check is
available hardening if that proves insufficient.

## Foreign-language sources

Handled at drafting only (`draft-council-contract.md`): translate the source facts
first, then draft in English in the reporter's voice. Never draft in the source
language just because the source was.

## Two footguns

**`x_search` bills per successful call application-wide, not per user.** Cap usage
before enabling at scale. Re-check this before wiring `x_search` into any future tool
set.

**`outputFileTracingIncludes` in `next.config.ts` must list every serverless function
that transitively imports `lib/sysprompts`** — it reads files at module scope, so
Vercel silently drops the markdown otherwise (works locally, breaks in prod). Today:
`/api/ingest`, `/api/email/inbound`, and `/agents/[id]/voice`. Feed and Setup read
persisted rows only and need no entry; `/api/slack/interactions` reaches `lib/x/` but
not `lib/sysprompts`. A new function importing it — directly or through
`lib/agent/**` / `lib/voice/**` — needs its own entry, **confirmed by `pnpm build`'s
output, not by inspection**.

## Model picks are settled

Current picks and the reporter-vs-model measurement are in AGENTS.md. Retired against
production data, with the killing fact, so they are not re-proposed: `gpt-5.4-nano`
(breaks the cap even cached) · `deepseek-v4-pro` (input-token dominance — it belongs
in extraction, where input is read once) · Gemini (0-for-2 on-task; uncapped reasoning
inflated output 6.6×) · MiniMax (residual violations never cleared across 1,000
drafts) · `qwen3.5-flash` (ran and lost on both cost and style) · `grok-4.1-fast`
(deprecated) · `mistral-large-3` (bench-only) · `kimi-k2.6` (K3 exists; saving $0.19
once to drop a tier in the quality-dominant stage fails proportionality).
