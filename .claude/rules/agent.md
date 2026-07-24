---
paths:
  - "lib/agent/**"
  - "app/api/chat/**"
  - "app/api/ingest/**"
  - "app/api/email/inbound/**"
---

# The desk agent

- The two headless model callers — `lib/agent/agent.ts` (the create-desk chat, behind
  `POST /api/chat`) and `lib/agent/draft-council-run.ts` (the drafting council + judge, behind
  `POST /api/ingest` and `POST /api/email/inbound` via `draft-pipeline.ts`) — share ONE
  AI-Gateway model + `providerOptions` (`deepseek/deepseek-v4-flash`,
  `{ gateway: { sort: "cost" } }`): change one without the other and the chat and the drafting
  council silently diverge onto different models. `lib/agent/scan-run.ts`, `draft-run.ts`, the
  cron dispatcher (`app/api/cron/tick/route.ts`), and `next-run.ts`'s fire math were the desk's
  third and fourth headless callers — all deleted (D15; the retired `agents`/`runs`/`drafts`
  pipeline the new UI replaces). There is no scan dispatcher and no scan-frequency-driven
  scheduler anywhere in the app today — every draft now originates from an inbound delivery at
  `POST /api/ingest` (the always-on ingestion worker, or a hand-seeded demo post), not from a
  polled scan.
- **D10 closed — `agent.ts`'s chat is re-linked into the UI, but scoped down.** `/agents/new`
  (`create-desk-form.tsx` → `createDesk`, `app/agents/new/actions.ts`) is still a plain form
  that inserts straight into `experiments` (no `scan_frequency` — the table has no such
  column, that concept belonged only to the retired `agents` table) — the assistant panel
  (`create-desk-assistant.tsx`) sits alongside it, not in place of it: it only helps clarify a
  fuzzy/garbled beat and confirms the form's other fields, chatting via `useChat()` against
  `/api/chat`. `createDeskAgent()`'s tool set is now just `save_agent` (retargeted to a new
  `createDeskFormSchema` matching the form's real fields — `name`/`beat`/`trackedHandles`/
  `reporterHandle` — NOT `desk-config.ts`'s `deskConfigSchema`, which still backs the unrelated
  scan-frequency rate rail and `lib/agents.ts`'s display formatter and must not be repurposed).
  `oparax_x_search` stays defined in `tools.ts` for a future scanning surface but is no longer
  wired into `createDeskAgent()`'s tool set — this assistant doesn't scan X for stories. `
  save_agent`'s `execute` is a pure echo (no DB write — the form still owns the sole persist
  path via `createDesk`), so it carries no `toolApproval` entry; the old scan-frequency-gated
  approval is gone along with the scan-frequency field itself.

## Reasoning: DeepSeek's own default everywhere except structuring

DeepSeek V4 defaults to thinking ON and self-scales effort by problem difficulty (its native adaptive behavior; the AI SDK's `low`/`medium` both coerce to its `high`, so an explicit mid level is a no-op). So the judgment calls — the chat agent (`agent.ts`) and the council's draft/revision calls (`draft-council-run.ts`) — pass **no `reasoning` param** and let native adaptivity run. Do not re-add a level there; it buys nothing.

The exception is DeepSeek's **`generateObject`** call — `draft-council-run.ts`'s judge. `reasoning: "none"` alone is **not** the fix; it is one leg of a four-part recipe, all load-bearing:

1. `reasoning: "none"` — thinking-on interleaves reasoning into the JSON (`NoObjectGeneratedError`); omitting it silently re-enables thinking.
2. a prompt that **names each output field imperatively** (as `draft-judge.md` does) — without it the model emits a wrong envelope (prose as a JSON key, or a bare `{}`) *even though it reasoned correctly*. This is the leg the judge shipped without once, returning `{}` deterministically.
3. a retry loop (re-sample on a parse failure) — the judge's own catch instead degrades to candidate 0 deterministically rather than retrying, since a temp-0 `{}` is not sampling variance; see its own comment for why that's the right call here.
4. a high `maxOutputTokens` ceiling — guards large arrays against mid-JSON truncation (a two-field verdict can't truncate, so this leg is moot for the judge specifically, but load-bearing for any new `generateObject` with a larger schema).

Copy all four into any new DeepSeek `generateObject`. Citing this pattern and carrying only leg 1 is exactly how the judge broke — a proven repo pattern must be copied whole, not one knob at a time.

The council's deterministic self-check (`draftViolations` in `draft-council-run.ts`) is **hygiene-only** — markdown, `<post>` tags, preamble, char ceiling. It does **not** verify the carry-over trap (every name/@handle/number in the draft appears in the brief); fabrication like an invented source tag is caught by the drafting-contract **prompt alone**. A deterministic @handle-against-brief check is available hardening if prompt-guarding proves insufficient.
- Prompt-writing conventions and drift guards for `lib/sysprompts/*.md` live in `.claude/rules/sysprompts.md`, not here — this file is the TypeScript/architecture side.

## The clock is prompt-injected, not a tool call

`current_time` is gone too. `agent.ts`'s `clockBlock()` stamps the clock into the system prompt fresh per request — **`createDeskAgent()` must be called once per request**; reusing an instance across requests serves a stale clock. The create-desk assistant's since-window always uses the default onboarding interval (`DEFAULT_ONBOARDING_INTERVAL_MINUTES`) — there is no saved scan frequency to derive from instead, since the create-desk form has no such concept (see the D10 note above).

## `scan-frequency.ts` is orphaned rate-rail code, not a live dispatcher input

`lib/agent/scan-frequency.ts` (`validateScanFrequency`, `sinceUnixFor`, the grouped `{ timezone, groups: [{ days, start, end, everyHours }] }` shape) is still real, still imported (`lib/agents.ts`'s display formatter, `desk-config.ts`'s `deskConfigSchema` — NOT `agent.ts`, whose old `toolApproval` gate on `save_agent` was removed along with the scan-frequency concept it validated, see the D10 note above), and still enforces its three static rails (`WINDOW_INVERTED`, `SUB_HOURLY`, `OVER_DAILY_BUDGET`) against a hypothetical schedule nothing in the live app can construct anymore. There is no dispatcher, no `next_run_at`, no fire math (`next-run.ts` was deleted with the rest of D15). Do not describe this as a live scheduler in new work; it is dead weight kept alive only by `desk-config.ts`'s unrelated `deskConfigSchema` and `lib/agents.ts`'s display formatter.

## Foreign-language sources

Handled at drafting only, per `lib/sysprompts/draft-council-contract.md`: translate the source facts first, then draft in the reporter's own language and voice — never draft in the source language just because the source was. (The old scan pipeline's grok-relay/DeepSeek-clustering translation step no longer exists — there is no clustering pass; `POST /api/ingest` receives one already-scraped post at a time.)

## `x_search` billing footgun

Parallel search and xAI `x_search` bill per successful call **application-wide, not per-user** — cap usage before enabling at scale. (`oparax_x_search` stays defined in `tools.ts` but is unwired from `createDeskAgent()`'s current tool set — see the D10 note above — so this is not reachable from any live surface today; re-check this footgun before wiring it into a future scanning tool set.)

## Bundling the prompts for deploy

`lib/agent/tools.ts`, `agent.ts`, `draft-council-run.ts`, `draft-pipeline.ts`, and `cluster.ts` are transitively server-only (they pull in `lib/sysprompts`, which reads files at module scope) — importing any of them from a client component breaks the build. `next.config.ts`'s `outputFileTracingIncludes` must list every serverless function that transitively imports `lib/sysprompts` — today `/api/chat` (`agent.ts`/`tools.ts`), `/api/ingest` and `/api/email/inbound` (both reach `lib/sysprompts` through `draft-pipeline.ts` → `draft-council-run.ts`/`cluster.ts`), `/agents/new` (its create action's `after()` voice-extraction call, `lib/voice/extract-guide.ts` → `lib/sysprompts` — see `.claude/rules/voice.md`), and, as of Slice 5, `/agents/[id]/voice` (its `capReprobe` action reaches the same `extract-guide.ts` path via `attemptVoiceExtraction` on a manual retry) — or Vercel silently drops the markdown from that deployed function (works locally, breaks in prod). `/agents/[id]`'s OTHER pages (Feed, Setup) read persisted `model_calls`/`voice_rules` text only, with no sysprompt import on those paths, so they carry no include. `/api/slack/interactions` reaches `lib/x/actions.ts` but not `lib/sysprompts`, so it needs none either. A new function that imports `lib/sysprompts` (directly, or transitively through `lib/agent/**`/`lib/voice/**`) needs its own entry added here — confirmed by `pnpm build`'s output, not by inspection (see `.claude/skills/verify/SKILL.md`).
