---
paths:
  - "lib/agent/**"
  - "app/api/ingest/**"
  - "app/api/email/inbound/**"
---

# The desk agent

- The create-desk chat agent — `lib/agent/agent.ts` (behind `POST /api/chat`), `tools.ts`'s
  `save_agent`, and `lib/sysprompts/desk-agent.md` — was deleted whole in the create-agent v2
  continuation: the assistant panel rendered ai-elements'
  `PromptInput`, itself a `<form>`, inside the create form's own `<form>`, a nested-form
  hydration bug reproduced in a real browser before the fix. Identity now comes from Connect X
  (OAuth), so there is no fuzzy-beat-clarifying assistant to re-link. `tools.ts` and
  `lib/agent/xai.ts` (the `oparax_x_search` Grok executor) — both already fully dead code, no
  importer left — have since been deleted outright.
- The one live headless model caller on the primary delivery path is
  `lib/agent/draft-ground.ts`'s `groundSourcePost` (a single `gpt-5-nano` call, behind
  `POST /api/ingest` via `draft-pipeline.ts`, with a DeepSeek `generateObject` fallback — the
  same four-leg recipe below — when the nano call's transport fails). `draft-council-run.ts`
  survives only for `reviseDraft`, called solely from `applyCorrection` — reachable from
  `POST /api/email/inbound` on every delivery **independent of `EMAIL_DELIVERY_ENABLED`** (that
  flag gates only the OUTBOUND draft-email send in `draft-pipeline.ts`; the inbound webhook
  always calls `applyCorrection` when it receives a correction). In practice this path is
  dormant because `RESEND_*` is not yet provisioned (AGENTS.md's env table) — there is no
  outbound email to reply to — not because of the boolean flag. `lib/agent/cluster.ts`'s
  clustering `generateObject` classifier remains, dormant behind `CLUSTERING_ENABLED = false`.
  `lib/agent/scan-run.ts`, `draft-run.ts`, the cron dispatcher
  (`app/api/cron/tick/route.ts`), and `next-run.ts`'s fire math were the desk's other headless
  callers — all deleted along with the retired `agents`/`runs`/`drafts` pipeline the new UI
  replaces. There is no scan dispatcher and no scan-frequency-driven scheduler anywhere in the
  app today — every draft now originates from an inbound delivery at `POST /api/ingest` (the
  always-on ingestion worker, or a hand-seeded demo post), not from a polled scan.
- `/agents/new` (`create-desk-form.tsx` → `createDesk`, `app/agents/new/actions.ts`) is a
  plain form that inserts straight into `experiments` (no `scan_frequency` — the table has no
  such column, that concept belonged only to the retired `agents` table): no typed handle
  field, no assistant. `createDesk` reads `reporter_handle` off the reporter's linked
  `x_accounts` row (`getXLinkState()`) and stamps `reporter_verified_at` at insert, so every
  agent is born verified — the old post-create verify gate it replaced is deleted.

## Reasoning: DeepSeek's own default everywhere except structuring

DeepSeek V4 defaults to thinking ON and self-scales effort by problem difficulty (its native adaptive behavior; the AI SDK's `low`/`medium` both coerce to its `high`, so an explicit mid level is a no-op). So the judgment calls — `draft-council-run.ts`'s `reviseDraft` revision/repair calls — pass **no `reasoning` param** and let native adaptivity run. Do not re-add a level there; it buys nothing.

The exception is DeepSeek's **`generateObject`** call. There is no judge function anywhere in the codebase, and `draft-council-run.ts` is not the recipe's only site — its two current call sites are **(a)** `draft-ground.ts`'s DeepSeek fallback, live on the primary drafting path when the `gpt-5-nano` call fails to transport, and **(b)** `cluster.ts`'s classifier, dormant behind `CLUSTERING_ENABLED = false`. `reasoning: "none"` alone is **not** the fix for either; it is one leg of a four-part recipe, all load-bearing:

1. `reasoning: "none"` — thinking-on interleaves reasoning into the JSON (`NoObjectGeneratedError`); omitting it silently re-enables thinking.
2. a prompt that **names each output field imperatively** (`draft-ground.md` for site (a), `story-cluster.md`'s `STORY_CLUSTER_PROMPT` for site (b)) — without it the model emits a wrong envelope (prose as a JSON key, or a bare `{}`) *even though it reasoned correctly*.
3. a defined behavior on schema-validation failure, not silent degradation: `draft-ground.ts`'s fallback returns a null verdict, which the caller treats as its own error path (release the claim, let the whole delivery retry) — never silently defaulted; `cluster.ts`'s classifier instead deterministically creates a new one-source story on the same failure, a different but equally explicit degradation, not a retry loop.
4. a high `maxOutputTokens` ceiling (`draft-ground.ts`'s fallback sets 8192) — guards against mid-JSON truncation on a larger schema.

Copy all four into any new DeepSeek `generateObject`. Carrying only leg 1 is exactly how a prior version of this call broke, returning `{}` deterministically — a proven repo pattern must be copied whole, not one knob at a time.

`draft-council-run.ts`'s deterministic self-check (`checkViolations`) is **hygiene-only** — markdown, `<post>` tags, preamble, char ceiling. It does **not** verify the carry-over trap (every name/@handle/number in the draft appears in the brief); fabrication like an invented source tag is caught by the drafting-contract **prompt alone**. A deterministic @handle-against-brief check is available hardening if prompt-guarding proves insufficient.
- Prompt-writing conventions and drift guards for `lib/sysprompts/*.md` live in `.claude/rules/sysprompts.md`, not here — this file is the TypeScript/architecture side.

## The drafting council is settled — models admitted by budget, retired by data

Why cheap models at all, and the reporter-vs-model measurement, are in `AGENTS.md`. Council-specific:

- **Ships today:** primary drafting is ONE `openai/gpt-5-nano` call per delivery (`groundSourcePost`, `draft-ground.ts`) — translates, judges on-beat, and drafts in a single pass — with a DeepSeek `generateObject` fallback (the four-leg recipe above) on transport failure. The parallel-council-plus-judge architecture this bullet used to describe (`deepseek-v4-flash` + `gpt-5-nano` @ `low` + `glm-4.7-flashx` @ `low` drafting in parallel, `v4-flash` judging) no longer exists in any code path — retired, not merely paused (see `draft-ground.ts`'s own header comment and commit `d19f16a`).
- **The carry-over trap** (the drafting contract's core rule): every name, handle, number, quote and time must appear in the BRIEF. The guide supplies voice and structure, **never facts**. The deterministic self-check catches hygiene only (markdown, `<post>` tags, preamble, char ceiling) — fabrication is caught by the prompt alone.
- **Governance — admitted by budget, retired by production data (historical: this describes how models were evaluated while the parallel council still ran, not what runs today — the council itself, not just individual models, was subsequently retired for the primary path).** "Untested" and "same-family" are NOT elimination rules; family is a diversity *weight* and budget arbitrates. A family whose drafts never win the judge gets dropped. There is no fixed council-size ceiling — that was asserted, never derived, and withdrawn.
- **Rejected, with the killing fact:** `gpt-5.4-nano` (good at $1.37/1k but the duo breaks the cap even cached — "tested" doesn't beat unaffordable) · `deepseek-v4-pro` ($2.71/1k = $4.07/mo alone; killed by input-token dominance, which is why it sits in *extraction* where input is read once) · Gemini (0-for-2 on-task; no 3.6 Pro exists on the gateway; uncapped reasoning inflated output 6.6× — caps fix cost, not rank) · MiniMax (the only family whose residual violations never cleared across 1,000 drafts) · `qwen3.5-flash` (ran and lost: $2.95 vs $1.23, style 0.37 vs 0.35) · `grok-4.1-fast` (deprecated; its successor can't fit the budget) · `mistral-large-3` (absent from every writing board surveyed; bench-only as the EU option) · `kimi-k2.6` (K3 exists at 3× the price; saving $0.19 one-time to drop a tier in the quality-dominant stage fails proportionality).

## Foreign-language sources

Handled at drafting only, per `lib/sysprompts/draft-council-contract.md`: translate the source facts first, then draft in the reporter's own language and voice — never draft in the source language just because the source was. (The old scan pipeline's grok-relay/DeepSeek-clustering translation step no longer exists — there is no clustering pass; `POST /api/ingest` receives one already-scraped post at a time.)

## `x_search` billing footgun

Parallel search and xAI `x_search` bill per successful call **application-wide, not per-user** — cap usage before enabling at scale. `oparax_x_search`'s executor lived in `tools.ts`, deleted along with the create-desk chat that wired it (the create-agent v2 continuation); re-check this footgun before wiring `x_search` into any future scanning tool set.

## Bundling the prompts for deploy

`draft-council-run.ts`, `draft-pipeline.ts`, and `cluster.ts` are transitively server-only (they pull in `lib/sysprompts`, which reads files at module scope) — importing any of them from a client component breaks the build. `next.config.ts`'s `outputFileTracingIncludes` must list every serverless function that transitively imports `lib/sysprompts` — today `/api/ingest` and `/api/email/inbound` (both reach `lib/sysprompts` through `draft-pipeline.ts` → `draft-council-run.ts`/`cluster.ts`), `/agents/new` (its create action's `after()` voice-extraction call, `lib/voice/extract-guide.ts` → `lib/sysprompts` — see `.claude/rules/voice.md`), and `/agents/[id]/voice` (its extraction-retry action reaches the same `extract-guide.ts` path via `attemptVoiceExtraction` on a manual retry) — or Vercel silently drops the markdown from that deployed function (works locally, breaks in prod). `next.config.ts` no longer lists a `/api/chat` entry — it was dropped along with that route in the create-agent v2 continuation. `/agents/[id]`'s OTHER pages (Feed, Setup) read persisted `model_calls`/`voice_rules` text only, with no sysprompt import on those paths, so they carry no include. `/api/slack/interactions` reaches `lib/x/actions.ts` but not `lib/sysprompts`, so it needs none either. A new function that imports `lib/sysprompts` (directly, or transitively through `lib/agent/**`/`lib/voice/**`) needs its own entry added here — confirmed by `pnpm build`'s output, not by inspection (see `.claude/skills/verify/SKILL.md`).
