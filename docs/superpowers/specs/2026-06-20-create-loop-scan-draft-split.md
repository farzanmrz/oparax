# Slice 1 — The create-chat iterate loop on a separated scan/draft pipeline

**Date:** 2026-06-20 · **Branch (Phase 3):** `ft/<issue#>` · **Status:** design, awaiting ✋ approval

This is **Slice 1 of a 5-surface reimagine**. Only this slice is being built now; the other
four surfaces and all guardrails-Deferred items stay deferred (see §11).

---

## 1. Summary + the SETUP-vs-RUN spine

**The problem.** Today a single Grok call both *scans and drafts*: `scanItemSchema` carries a
per-item `draft` field (`lib/scan/schema.ts:17`), Grok fills it inline, and both callers read
`story.draft` to write `run_items.drafted_text`/`final_text`. There is no first-class
"critique → adjust → re-run" loop in the create chat, config is invisibly reverse-mapped from
the scan tool's input, and a voice tweak can't happen without re-paying for a Grok search.

**What this slice does.** It splits the pipeline at the **lib layer** and wraps it in an
iterate loop in the create chat:

- `scan()` (Grok, direct `@ai-sdk/xai`, xSearch, **costs a search**) → **news items only**.
- `draft()` (DeepSeek via Gateway, reusing `generateDraft`, **no search**) → one tweet per item.
- The create chat orchestrates these into a tunable loop; the saved-agent run orchestrates them
  into a server-driven autopilot. **Both call the identical lib functions, so they can never diverge.**

**The spine — one config + one lib pipeline, two callers:**

| | Caller A — **Create chat (setup)** | Caller B — **Saved run (autopilot)** |
|---|---|---|
| Who | the reporter, interactively | nobody (Run button now, cron later) |
| Loop | yes — iterate, preview, tune | no — frozen config, one shot |
| Persists | **nothing** until Save | `runs` + `run_items` (server-driven) |
| Entry | `lib/chat/run-chat.ts` chat tools | `app/api/agents/[id]/run/route.ts` → `persistRunResult` |
| Shared | `lib/scan` `scan()` + `lib/draft/draftItems()` | same two functions |

"Save" persists the **CONFIG** (the recipe) to the `agents` row, and *optionally* the latest
preview as the first run. The durable artifact is the config, not a "setup result."

---

## 2. The lib/ pipeline contracts

### 2.1 New shared entrypoint: `lib/draft/draft-items.ts`

One function both callers import (this is what makes divergence structurally impossible):

```ts
// lib/draft/draft-items.ts
import { generateDraft } from "@/lib/draft/generate";

export interface DraftItemInput { title: string; summary: string; }
export interface DraftItemResult {
  ok: boolean;
  text: string | null;     // null on failure
  error: string | null;
  marketCost: number | null;
  resolved: string | null;
}

export async function draftItems(
  items: DraftItemInput[],
  cfg: { draftingInstructions: string; exampleTweets: string[] },
): Promise<DraftItemResult[]>;
```

- Loops `generateDraft({ draftingInstructions, story: {title, summary}, exampleTweets })` per item
  (signature confirmed `lib/draft/generate.ts:63`; `DraftStory = {title, summary}`, so item
  `body` → `summary`).
- **Sequential await**, not `Promise.all` — keeps Gateway concurrency low and bounded inside the
  240s run window (draft is ~1–2s/item; 20 items is well under budget). Deterministic order.
- A per-item `generateDraft {ok:false}` returns `{ok:false, text:null, error}` for that item —
  **does not throw, does not abort the batch** (substrate for the §7 partial-failure policy).

### 2.2 `scan()` — items only (no draft)

`runScanStream` (`lib/scan/run.ts`) keeps its streaming shape; the structured output drops draft:

```ts
// lib/scan/schema.ts — scanItemSchema AFTER
export const scanItemSchema = z.object({
  title: z.string(),
  body: z.string(),
  urls: z.array(z.url()).min(1),
  sources: z.array(storySourceSchema).default([]),
  // draft: REMOVED
});
```

`buildScanInstructions` / `buildAgentRunUserPrompt` (`lib/scan/prompt.ts`) drop all draft
language (the "For every item, include draft…" rule, ~lines 21-22, and the user-prompt voice
block). `runScanStream` stops forwarding drafting params into the scan prompt (accept-and-ignore
at the param boundary is fine to minimize churn).

### 2.3 PreviewStory shape

Keep `PreviewStory.draft: string` **required** in `lib/scan/types.ts` — the Slice-1 contract is
still 1-item→1-tweet, so a draft is always present *by the time a PreviewStory exists*. The split
moves *where* draft is populated, not *whether*:

- `toRawStory(item)` (refactor of `toStoryDraft`, `lib/scan/parse.ts:100-114`) returns everything
  **except** draft: `{title, summary, sourceUrls, primaryTweetUrl, dedupeKey}`.
- `storiesFromOutput` (`lib/scan/ui-stream.ts:74-92`) returns `RawStory[]` — **dedupe-by-key stays
  here, before drafting**, so we never pay to draft a dropped duplicate.
- A `PreviewStory` is only ever built by attaching draft after the draft leg: `{...rawStory, draft, sources}`.

The create preview renders `DraftCard` and the hub renders `StoryCard` — **two different
components, not a shared card** (a spec assumption the plan critique corrected). Both UI
contracts stay stable; only the producer (what populates `draft`) changes.

### 2.4 `run_items` write-split (no new columns, no two-phase write)

`database.ts` already has nullable `drafted_text` / `final_text`. Drafting completes in-process
**before** the single insert, so there is no intermediate `draft_pending` status. Per-item rules:

- **Draft ok:** `drafted_text = final_text = draft.text`, `status = "drafted"` (preserves the
  existing equal-fields invariant from `persist.ts:58-59`, redraft route, save-agent).
- **Draft failed:** `drafted_text = null`, `final_text = null`, `status = "failed"`,
  `error_message = draft.error`. Reuses the existing `failed` enum + recovery path (Redraft already
  resets `failed → drafted`; `postRunItem` claims `drafted|failed`). Do **not** fail the whole run
  (wastes the paid search); do **not** silently skip (loses the item). [Decision D4]

---

## 3. The chat tool surface — THREE tools

The create chat exposes three tools. This matches the agreed find/write split and includes the
cheap voice re-draft (Decision D2). **None** of them takes `itemIds` / select-subset / platform
inputs — those are deferred (§11).

### Tool 1: `scan` — Grok → items, then auto-draft (the find knob; costs a search)
The first-pass and every retrieval re-run. `execute`:
1. `runScanStream` (scan-only prompt) with `abortSignal: AbortSignal.timeout(240_000)` + `onAbort`
   (closes G9 — today `await result.output` has no deadline and would hang to the 300s HTTP max,
   worsened by the new draft loop).
2. `await result.output` → `storiesFromOutput` → `RawStory[]` (dedup applied).
3. `draftItems(raw.map(s => ({title, summary})), {draftingInstructions, exampleTweets})`.
4. Zip into `PreviewStory[]`: ok → `draft = text`; failed → `draft = ""` (UI shows a
   "draft failed — refine voice and re-scan/re-draft" sub-state, §4).
5. `logUsage` scan leg (unchanged) **plus** one draft `logUsage` per item (§10).
6. Return `{ stories, metrics }`. Its input still doubles as the config patch the UI derives.

### Tool 2: `draft` — DeepSeek → re-draft current items (the write knob; **no search**)
The cheap voice loop. Re-runs **only** `lib/draft/draftItems()` over the items from the **latest
scan in the current ephemeral preview**, with the current `draftingInstructions`. `execute`:
1. The chat route extracts the latest `scan` tool result's items from the `messages` array (the
   route already has full message history) and supplies them to `draft.execute` via closure — **no
   new search, no re-scan, nothing persisted**.
2. `draftItems(latestItems, {draftingInstructions, exampleTweets})`.
3. Zip into `PreviewStory[]` (same ok/failed rules); per-item draft `logUsage`.
4. Return `{ stories, metrics(searchCount: 0) }`.

It always re-drafts **all** items of the current working set, 1→1. It does **not** select a
subset and does **not** target a platform (those stay deferred). It calls the *same*
`draftItems()` the saved run uses → no divergence; the re-draft-only orchestration is the
"loop-lives-only-in-setup" behavior, by design.

### Tool 3: `updateConfig` — zero-cost config patch (ephemeral) [Decision D1]
```ts
z.object({
  name: z.string().optional(),
  scanningInstructions: z.string().optional(),
  draftingInstructions: z.string().optional(),
  exampleTweets: z.array(z.object({ url: z.string(), text: z.string() })).optional(),
  sources: z.object({
    x: z.object({ enabled: z.boolean(), handles: z.array(z.string()).max(10) }).partial().optional(),
    web: z.object({ enabled: z.boolean(), preferredDomains: z.array(z.string()).max(5) }).partial().optional(),
  }).partial().optional(),
})
```
**Output:** `{ config: AgentConfig }` (merged + validated against `agentConfigSchema`). **No model
call, no search, NO DB write** — purely ephemeral until Save (resolves the security-facet open
question). It drives the live config card and lets "also watch @handle" mutate config without
paying for a scan.

**`configFromMessages` (`agent-chat.tsx:124-135`) MUST replay `updateConfig` AND `draft` inputs**,
not just `scan` inputs — otherwise resumed sessions reconstruct stale config / lose the latest
re-draft (session-resume correctness).

---

## 4. Caller A — the create-chat iterate loop + every state

### Interaction model
- **Engine = NL critique**, routed by the model: retrieval critique → `scan`; voice critique →
  `draft` (cheap). The system prompt teaches the model to pick the knob and to say which it turned
  ("casting a wider net, re-scanning…" vs "keeping these stories, sharpening the voice…").
- **Thin guiding buttons** inject a prewritten phrase via the existing `sendMessage` (no custom
  composer; custom chrome / `result-chips` stay deleted). Rendered inside the chat scroll, after
  the latest results block. Suggested set: `Wider net`, `Confirmed only`, `Punchier`,
  `Drop hashtags`, `Re-scan`. Each is just NL text submitted through the normal input path.
- **Append-new-block, never-lose-edits** (verified already correct): `handleSave`
  (`agent-chat.tsx:362-365`) persists `draftEdits[dedupeKey] ?? draft`, so hand-edits **survive
  Save**. `setDraftEdits({})` fires only on a *new scan/draft fingerprint*
  (`agent-chat.tsx:326-333`) — i.e. edits reset across iterations by design (new block = working
  set). **This is correct; do not "fix" it.**
- **Legible config card:** read-only card driven by `config` state. Shows name, beat, sources
  (X handles / web domains), voice summary, example count. Reflects `updateConfig` patches live.

### Gating + sequence
- **First scan fires** once there's a usable beat (`scanningInstructions` non-empty) **+ a source
  choice** (X / web / both). The chat path forces `searchX:true` and allows empty handles (general
  X search). Enforce the gate via the system prompt **and** a defensive guard in `scan.execute`
  that returns a friendly "need a beat + a source first" result instead of calling Grok (cheaper
  than a wasted search).
- **Voice is post-scan only** (the `draft` tool). **Name** is proposed by the agent, required only
  at Save (`agentConfigSchema.name.min(1)` enforces it at the route).
- **Connect-X stays OUT of create.** `draft-card.tsx` shows a "Connect X to post" hint
  unconditionally; pass a `hidePostHint` prop from `chat-message-row.tsx` in the create context.

### What is stripped
- **Chat/Form toggle** (`agent-chat.tsx:682-701`) and the **Form tab / ConfigForm render** — gone.
  The config card is the legible view; full field-editing form is deferred to the edit-by-chat slice.
- **Recent-sessions dropdown: KEEP** — it persists to `chat_sessions`, is core to chat-first, no
  conflict with the loop.
- The always-empty `exampleTweet.url` (paste-only per guardrails) — don't carry the dead shape.

### Every UI state
| State | Trigger | Render |
|---|---|---|
| Initial / empty | mount | greeting |
| Gathering | user msgs, pre-first-scan | Q&A; config card fills |
| Scanning | `scan` in flight | "Scanning your sources…" spinner |
| Drafting | scan done, draft leg running (same tool) | spinner continues ("Drafting…"); one tool result returns when both legs finish |
| Re-drafting | `draft` tool in flight | "Re-drafting…" spinner on the new block |
| Results ready | tool result returns | `ScanNewsGrid` + draft cards with drafts |
| Partial draft fail | some items `draft===""` | those cards show "draft failed — refine voice and re-draft"; Save still allowed for the rest |
| Zero items | empty items | "no results matched — widen the beat or add a source" |
| Error / timeout | tool throws / 240s abort | `agent-chat-error`; suggest a different beat / more sources |
| Saving | Save clicked | action-bar spinner |
| Dup-name 409 | save-agent 409 | conversational message with the route's error (not a silent toast) |

No "Iteration N" badges, per-item streaming, or per-item draft spinners — net-new UX not asked
for (deferred). Reuse existing message-block rendering.

---

## 5. Caller B — the saved-run conversion

`run/route.ts` keeps its structure; the draft leg lands **inside `persistRunResult`** so
server-driven completion covers it (a closed tab cannot orphan the draft).

1. **Thread config into `persistRunResult`** (pass as params — the route already loaded the agent
   at `run/route.ts:56`, no extra round-trip): extend `PersistRunResultInput` with
   `draftingInstructions: string` and `exampleTweets: string[]`. Keeps `persistRunResult`
   framework-agnostic.
2. **Inside `persistRunResult`**, after `storiesFromOutput(output)` → `RawStory[]` (line 49),
   call `draftItems(...)`, then build `run_items` per §2.4.
3. **Server-driven completion preserved:** the draft awaits happen inside the existing `try` in the
   `consumeStream().then(persistRunResult)` chain (`run/route.ts:152-167`). `result.output` is
   already resolved (consumeStream ran first); draft is non-streaming + deterministic. No
   client-drain dependency reintroduced.
4. **Failure handling:** per-item draft failures land `status:"failed"` rows (do not throw). Only a
   thrown error (e.g. Gateway outage) trips the existing run-level `catch` (`persist.ts:113-127`)
   → run `failed`.

### The G4 precondition fix (mandatory)
`run/route.ts:85-89` hard-rejects empty `drafting_instructions` with a 400, but `agentConfigSchema`
doesn't require it and the design says voice is optional — a reporter could Save a valid voice-less
agent and then 400 on Run. **Remove that 400 gate**; `generateDraft` runs fine with empty
instructions (fixed system prompt → neutral draft). Both callers now share: beat + a source
required, voice optional.

### Save persists the CONFIG (+ optional preview run)
`save-agent` persists `configToColumns(config)` and, if `stories[]` present, the preview as run +
run_items. **`save-agent` does NO model calls** — the chat preview already drafted via the `scan`/
`draft` tools, so stories arrive with `draft` populated (or `""`/failed). `normalizeStory`
(`save-agent/route.ts:27`) currently **drops** stories with falsy `draft` — change it to **persist
failed-draft preview items as `status:"failed"` (null text)** rather than silently dropping, so
Caller A and Caller B treat failed drafts identically. The 409 dup-name check stays before any work.

---

## 6. Per-file impact map

**Add**
- `lib/draft/draft-items.ts` — shared `draftItems()` loop over `generateDraft` (§2.1). The one
  entrypoint both callers use.

**Change**
- `lib/scan/schema.ts` — delete `draft` from `scanItemSchema` (line 17).
- `lib/scan/prompt.ts` — drop the inline-draft rule + the user-prompt voice block.
- `lib/scan/parse.ts` — `normalizeItem`: drop the `!draft` check; `toStoryDraft` → `toRawStory`
  (stop reading `item.draft`); update the `StoryDraft` interface to drop `draft`.
- `lib/scan/ui-stream.ts` — `storiesFromOutput` returns `RawStory[]`; dedup stays before drafting.
- `lib/scan/types.ts` — keep `PreviewStory.draft` required; add a `RawStory` type.
- `lib/scan/run.ts` — stop forwarding drafting params to the prompt builder.
- `lib/scan/persist.ts` — extend `PersistRunResultInput` with drafting config; call `draftItems`
  after `storiesFromOutput`; build `run_items` per §2.4; per-item draft `logUsage`; sum draft
  `marketCost` into `cost_usd`.
- `lib/chat/run-chat.ts` — `scan` tool: scan-only prompt → `draftItems` → zip; add `abortSignal`/
  `onAbort` + bounded draft loop + gate guard. **Add `draft` tool** (re-draft latest items, no
  search). **Add `updateConfig` tool** (ephemeral).
- `lib/chat/system-prompt.ts` — teach the pipeline (scan = paid search → items; draft = the write
  knob; retrieval critique → `scan`, voice critique → `draft`); first-scan gate; name-at-save;
  `updateConfig` for config edits.
- `app/api/agents/[id]/run/route.ts` — pass drafting config into `persistRunResult`; **remove the
  400 drafting-instructions gate (lines 85-89)**.
- `app/api/agents/save-agent/route.ts` — `normalizeStory`: persist failed-draft items as
  `status:"failed"` instead of dropping.
- `components/agents/agent-chat.tsx` — remove Chat/Form toggle + Form tab; add config card; render
  guiding buttons via `sendMessage`; `configFromMessages` replays `updateConfig` + `draft` inputs.
- `components/agents/chat-message-row.tsx` — pass `hidePostHint` in create; render "draft failed" sub-state.
- `components/agents/draft-card.tsx` — accept `hidePostHint`; render empty/failed-draft state.
- `components/agents/story-card.tsx` (**HUB card**) — handle NULL/empty `drafted_text` (disable
  Post, show Redraft) for the failed-draft state. This is the hub card; the create preview's card
  is the separate `draft-card.tsx` (above) — they are NOT one shared component.
- `AGENTS.md` — update the stale "one Grok call scans X/web AND drafts every story" → "one Grok
  call scans → items; one DeepSeek leg drafts each item"; note `run_items.drafted_text` now comes
  from the DeepSeek leg.

**Conditional remove / unwire**
- `components/agents/config-form.tsx` — unwire from the create chat (file may remain for the
  deferred edit-by-chat slice).

**No change (verified)**
- `app/api/agents/run-items/[id]/redraft/route.ts`, `/post/route.ts`, `lib/x/post-item.ts` —
  downstream of draft, unchanged.
- `lib/draft/generate.ts`, `lib/draft/schema.ts`, `lib/draft/prompt.ts`, `lib/draft/validate.ts` —
  signature stable, reused.
- `lib/chat/config.ts` mappers — modulo the D3 source-persistence fix.

---

## 7. Edge cases + failure modes

| Trigger | Behavior | Enforced where |
|---|---|---|
| Scan timeout (Caller B) | `onAbort` marks run `failed`; idempotent `.eq('status','running')` | `run/route.ts:131-143`, `persist.ts:125` |
| Scan timeout (Caller A) | **NEW** `abortSignal`+`onAbort` on chat scan; `execute` returns empty stories, doesn't hang | `run-chat.ts` (add) |
| Scan zero items | dedup → []; run `item_count=0`; save skips run insert | `ui-stream.ts`, `persist.ts:63`, `save-agent` |
| >10 handles | sliced to 10 (scan) / zod `.max(10)` at save | `run.ts:32`, `config.ts:21` |
| No handles + no sites | chat: general X search; saved run: needs X or web on | `run-chat.ts`, `run/route.ts:75-79` |
| Empty drafting_instructions | **NEW** both callers draft neutral voice (400 gate removed) | `run/route.ts:85-89` removed |
| Draft fails some items | those rows `status:"failed"`, null text, `error_message`; run completes; Redraft recovers | `draft-items.ts` + `persist.ts`/`run-chat.ts` |
| Draft fails all items | all rows failed; run completes (not failed); items recoverable | same |
| Gateway throws on draft await (Caller B) | run-level catch → run `failed` | `persist.ts:113-127` |
| Hub renders NULL drafted_text | empty textarea, Post disabled, Redraft enabled | `story-card.tsx` (add) |
| Save before any scan | `stories=[]`; agent saved config-only, no run | `agent-chat.tsx:357`, `save-agent` |
| Save with hand-edits | persisted via `draftEdits[k] ?? draft` | `agent-chat.tsx:362-365` (already correct) |
| Re-scan/re-draft resets edits | `setDraftEdits({})` on new fingerprint (new block = working set) | `agent-chat.tsx:326-333` (correct) |
| Dup name | 409 before any draft/insert | `save-agent` |
| Session resume | `configFromMessages` replays `scan` + `updateConfig` + `draft` inputs | `agent-chat.tsx:124-135` (extend) |
| Failed-draft preview reaches Save | saved as `status:"failed"` (not dropped) | `save-agent:27` (change) |
| Create preview disconnect/refresh | nothing persisted (ephemeral) → no orphan | `run-chat.ts` (no writes) |

---

## 8. Security / ownership / RLS

The split adds **no new write site that bypasses existing guards** — draft runs inside
already-guarded contexts:
- `scan` / `draft` / `updateConfig` chat tools — **no DB writes** (ephemeral); preserved.
- `persistRunResult` — invoked only after `run/route.ts` loads the agent owner-scoped
  (`.eq('user_id', user.id)`, line 59); `userId`/`agentId` flow in.
- `save-agent` — `user_id` explicit on insert; 409 dup check; no model calls.

Unchanged + verified: `postRunItem` ownership assertion + atomic `drafted|failed→posting` claim;
AES-256-GCM X token encryption; service-role only for chat telemetry; no secrets in any tool
output; `proxy.ts` session refresh + `?next=`/`?session=` round-trip untouched. **Do NOT add a
standalone draft API route** — keep draft inside existing contexts so no new write surface needs
guarding.

---

## 9. Reuse + blast radius

**Reuse as-is:** `generateDraft` (multi-caller proven by redraft + draft-lab), `story-card.tsx`
props/terminal-state logic (add empty-draft handling only), `lib/chat/config.ts` mappers,
`PreviewStory` UI contract, redraft/post routes, `consumeStream→persistRunResult` completion.

**Verify didn't break:** `story-card.tsx` (hub card, distinct from the create `draft-card.tsx`) when `drafted_text` is NULL;
`configFromMessages` after toggle removal; `normalizeStory` change against the new flow;
`scanToUIResponse` live stream still independent of persistence; chat-debug route parity (it shares
`buildAgentChatStream`, so the new tools flow through automatically — confirm).

**AGENTS.md:** update the "Today" bullet; keep the already-correct guardrails line ("scan & draft
are SPLIT… only 1-item→1-X-post built now").

---

## 10. Cost note (don't break logging; full receipt is deferred Surface 5)

Two legs now per scan: Grok scan (1 paid search + tokens) + N DeepSeek drafts (no search). Single
rule for both callers: after `draftItems`, emit one `logUsage({kind:"draft", provider:"gateway",
resolved_provider, model: DRAFT_MODEL, ...})` per item (mirroring `redraft/route.ts`), and **sum
each `marketCost` into the run's `cost_usd`** (`persist.ts:83`). **No new column.** The `draft`
tool's re-draft also logs draft cost (search count 0). `save-agent` re-drafts nothing → logs
nothing new. The full per-call receipt is **Surface 5 (deferred)**; the `[usage]` tracer is the
contract for now.

---

## 11. In scope (this slice) vs Deferred

**In scope (Slice 1):**
- Strip Grok inline draft (schema / prompt / parse / ui-stream / types).
- `lib/draft/draft-items.ts` shared `draftItems()`.
- Three chat tools: `scan` (scan→auto-draft), `draft` (cheap re-draft of current items, no search),
  `updateConfig` (ephemeral config patch).
- Draft leg inside `persistRunResult` (Caller B); thread config in; remove the run-route 400 gate.
- Per-item failed-draft rows (`status:"failed"`, recoverable); save-agent persists (not drops) them.
- Chat scan timeout/abort + bounded draft loop.
- Create-chat loop UI: drop Chat/Form toggle, add config card, guiding buttons via `sendMessage`,
  `hidePostHint` in create, failed-draft sub-state, hub empty-draft handling.
- `configFromMessages` replays `scan` + `draft` + `updateConfig`.
- Draft cost logging + summed `cost_usd`; AGENTS.md update.

**Deferred (every "while we're here" goes here):**
- **Surface 2** hub story-first reorg · **Surface 3** edit-by-chat of saved agents (the
  `updateConfig` rails are laid, but the saved-agent edit flow is not built) · **Surface 4** listing
  triage · **Surface 5** the cost receipt UI.
- Select-subset drafting / `itemIds` / `fromItems[]` persistence / multi-platform target on the
  `draft` tool (guardrails: draft-beyond-1→1 + multi-platform deferred; the *shape* supports it
  later with no rework).
- Async/background draft + task queues for cron (Vercel Workflows/Queues deferred; draft stays
  synchronous-in-chain).
- Per-item draft streaming, "Iteration N" badges, per-item redraft spinners.
- Full field-editing form; cross-run dedup/aggregation; learning loop; schedule/autonomy;
  notifications; raising the handle cap.

---

## 12. Resolved decisions (carried from the coverage critique)

- **D1 — `updateConfig` in Slice 1: YES, as a pure ephemeral patch-and-return tool** (no DB, no
  model). Drives the config card + cheap config edits. Does **not** build the deferred
  edit-by-chat-of-saved-agents flow. `configFromMessages` must replay its inputs.
- **D2 — Cheap voice re-draft: YES, INCLUDED** (overriding the critic's "defer it"). A `draft` tool
  re-runs only the DeepSeek leg over the current items (1→1, no search, no subset), calling the
  shared `draftItems()`. Rationale: it's the cost win the separation exists for, and re-paying the
  per-search fee on every voice tweak hits the one cost driver guardrails protect. No divergence
  (shared lib fn; re-draft-only orchestration is the by-design "loop lives in setup").
- **D3 — Handle-free X scan survives Save:** decouple `search_x` from handle count. When the
  reporter chose to monitor X (even with no specific handles), persist `search_x:true` (general X
  search), so the saved agent scans the same way the preview did.
- **D4 — Failed-draft policy:** persist failed-draft items as `status:"failed"` with null text
  (recoverable via Redraft); do not fail the run; do not skip. Applies to both callers + the hub UI.

---

## 13. Revision — two-phase loop + user-defined length (post-review corrections)

After the first build + review round, the create-chat loop was corrected to match intent:

- **Two separate phases (not auto-draft).** The `scan` tool returns **news items only**; the
  reporter reviews + tunes retrieval (re-scan) and then triggers a **distinct `draft` step**
  ("Draft these posts") that turns the chosen items into posts; voice is tuned by re-drafting.
  Scanning and drafting are no longer collapsed into one step. (The saved-agent autopilot run
  still does the whole pipeline at once — the *tuning loop* is what is two-phase.) `ScanToolResult`
  is now `{ items: RawStory[] }`; the new `DraftToolResult` is `{ stories: PreviewStory[] }`.
- **Step-by-step intake.** The system prompt gathers beat → source choice (X/web/both) →
  specific handles/sites one at a time, then scans — no jumping straight to results.
- **No fixed 280-char cap.** `validate.ts` no longer caps length and the draft prompts no longer
  say "280"; the reporter sets their own post length via the drafting instructions (paid X
  accounts allow more). The char count remains a display only.
- **Suggestion pills wrap** (no horizontal-scroll clipping). Buttons are phase-aware: retrieval
  tweaks + "Draft these posts" in the scan phase; voice tweaks + "Re-scan" + Save in the draft
  phase.
- **Confirmed review bugs fixed:** unbounded saved-run draft leg now budget-bounded
  (`AbortSignal`); the latest-result extractor skips empty results (no shadowing of a prior
  scan); the edit-reset fingerprint samples every story; the `draft` tool reads the in-turn
  messages; a failed re-draft falls back to the prior good draft; the dead scan-route drafting
  gate removed; `runScanInputToConfigPatch` is partial (a re-scan can't clobber config).

## Key file references
`lib/scan/schema.ts:13-28` · `lib/scan/parse.ts:100-114` · `lib/scan/ui-stream.ts:74-92` ·
`lib/scan/persist.ts:32-128` · `lib/scan/run.ts:120-144` · `lib/chat/run-chat.ts:69-167` ·
`lib/draft/generate.ts:63-138` · `lib/chat/config.ts:6-129` · `app/api/agents/[id]/run/route.ts:53-182` ·
`app/api/agents/save-agent/route.ts:12-38` · `components/agents/agent-chat.tsx:307-365` ·
new: `lib/draft/draft-items.ts`.
