# Slice 1 — Create-Chat Iterate Loop on a Separated Scan/Draft Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the news pipeline at the lib layer — Grok `scan()` returns items only, DeepSeek `draftItems()` writes one tweet per item — and wrap it in a tunable create-chat iterate loop, while the saved-agent run runs the same pipeline as server-driven autopilot.

**Architecture:** ONE config (the `agents` row) + ONE lib pipeline (`scan()` → items, `draftItems()` → tweets), invoked by TWO callers that share the identical lib functions so they can't diverge: Caller A = the create chat (ephemeral preview + iterate loop, three tools), Caller B = the saved-agent Run (server-driven `consumeStream → persistRunResult`). Build serial-inline on `ft/37`.

**Tech Stack:** Next.js App Router (TS strict), Vercel AI SDK v6, `@ai-sdk/xai` (direct, scan) + AI Gateway (DeepSeek, draft/chat), Supabase (owner-scoped RLS), zod, Biome.

## Global Constraints

- **No test runner.** Verification = `pnpm build` green + manual/browser flows. `pnpm build` + Biome (`pnpm lint:fix`) run ONCE in Phase 4 (plus one sanity `pnpm build` after Task 1's type surgery). Do not run per-step builds otherwise.
- **Scan = Grok via DIRECT `@ai-sdk/xai`** (`xai.responses("grok-4.3")` + xSearch); xSearch cannot cross the Gateway. **Chat + draft = DeepSeek via the Gateway** (`deepseek/deepseek-v4-flash`, failover `xai/grok-4.3`).
- **Server-driven run completion:** the saved-run draft leg must run inside the `consumeStream → persistRunResult` chain; never reintroduce a client-drain dependency.
- **Owner-scoped RLS + explicit ownership guards on every write.** No new DB write site, no new API route, no new table/column.
- **X is only for posting.** Create/scan/draft/save work with no X connection. Connect-X stays out of the create loop.
- **A draft is 1-item → 1-X-post.** No select-subset, no `itemIds`, no multi-platform inputs (deferred).
- **Both callers MUST call the single shared `lib/draft/draft-items.ts:draftItems()`** — divergence guard.
- **Never edit `CLAUDE.md`.** Edit `AGENTS.md` only.
- **Build on `ft/37` (issue #37). Do NOT run `start.sh`, do NOT cut a new branch.** (User override.)
- **Component identity:** `draft-card.tsx` = the create-preview card; `story-card.tsx` = the hub card. They are DIFFERENT components — not a shared card.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/draft/draft-items.ts` (**new**) | Shared `draftItems()` loop over `generateDraft` — the one entrypoint both callers use | 1 |
| `lib/scan/types.ts` | Add `RawStory`; keep `PreviewStory.draft` required | 1 |
| `lib/scan/schema.ts` | Drop `draft` from `scanItemSchema` | 1 |
| `lib/scan/parse.ts` | `toStoryDraft → toRawStory`; drop `!draft` check | 1 |
| `lib/scan/ui-stream.ts` | `storiesFromOutput` returns `RawStory[]` (import + type + call) | 1 |
| `lib/scan/prompt.ts` | Drop inline-draft language from scan prompts | 1 |
| `lib/scan/run.ts` | Stop forwarding drafting params to the prompt builder | 1 |
| `lib/scan/persist.ts` | Caller B: draft leg + run_items write-split + cost/logUsage | 1 (call-site) → 2 (finalize) |
| `app/api/agents/[id]/run/route.ts` | Remove 400 voice gate; pass drafting config to persist | 2 |
| `app/api/agents/save-agent/route.ts` | Persist failed-draft preview items (not drop) | 2 |
| `components/agents/story-card.tsx` (HUB) | Handle NULL/empty `drafted_text` (Post disabled, Redraft) | 2 |
| `lib/chat/run-chat.ts` | Caller A: `scan` (refine) + `draft` (new) + `updateConfig` (new) tools; D3 fix | 1 (call-site) → 3 (finalize) |
| `lib/chat/system-prompt.ts` | Teach the pipeline + routing + gates | 3 |
| `components/agents/agent-chat.tsx` | Drop Chat/Form toggle; config card; guiding buttons; `configFromMessages` replay | 4 |
| `components/agents/chat-message-row.tsx` | `hidePostHint`; failed-draft sub-state; draft/updateConfig tool parts | 4 |
| `components/agents/draft-card.tsx` (CREATE) | Accept `hidePostHint`; empty/failed-draft render | 4 |
| `AGENTS.md` | Update the stale "scans AND drafts" line | 5 |

**No change (verify only):** `lib/draft/{generate,schema,prompt,validate}.ts`, `app/api/agents/run-items/[id]/{redraft,post}/route.ts`, `lib/x/post-item.ts`, `lib/chat/config.ts` (modulo D3 which lives in `run-chat.ts`), `app/api/agents/chat/route.ts` + `chat-debug/route.ts` (tools flow through `buildAgentChatStream`).

---

## Task 0: Checkpoint commits (prerequisite, no code)

**Files:** all currently-uncommitted on `ft/37`.

- [ ] **Step 1: Stage and commit the existing working-tree refactor as-is**

```bash
cd /Users/farzanm4/Desktop/drive/repos/oparax-chirp
git status   # confirm we are on ft/37 and review the dirty set
git add -A   # includes modified AGENTS.md, deleted lib/chat/{tools,discover,x-context}.ts, lib/x/*, etc., and new docs/guardrails.md, .claude/settings.json
git commit -m "chore(#37): checkpoint strip-tools / X-optional refactor before scan-draft split

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 2: Commit the planning docs as a second checkpoint**

```bash
git add docs/superpowers/specs/2026-06-20-create-loop-scan-draft-split.md docs/superpowers/plans/2026-06-20-create-loop-scan-draft-split.md
git commit -m "docs(#37): Slice 1 spec + plan (scan/draft split + create-chat loop)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Verify clean tree.** Run `git status` → working tree clean. Do **not** push. Do **not** touch `CLAUDE.md`.

---

## Task 1: Foundation — strip Grok's inline draft + add `draftItems()` (ONE atomic, build-green commit)

The `storiesFromOutput` return type changes `PreviewStory[] → RawStory[]`, which breaks both callers at compile time. So the minimal caller call-site adaptations land in this SAME commit — Task 1 is **not** standalone-green without them.

**Files:**
- Create: `lib/draft/draft-items.ts`
- Modify: `lib/scan/types.ts`, `lib/scan/schema.ts`, `lib/scan/parse.ts`, `lib/scan/ui-stream.ts`, `lib/scan/prompt.ts`, `lib/scan/run.ts`, `lib/scan/persist.ts` (call-site), `lib/chat/run-chat.ts` (scan-tool call-site)

**Interfaces:**
- Produces: `RawStory` (`{title, summary, sourceUrls, primaryTweetUrl, dedupeKey}`); `draftItems(items: DraftItemInput[], cfg: {draftingInstructions: string; exampleTweets: string[]}): Promise<DraftItemResult[]>`; `storiesFromOutput(output): RawStory[]`.
- Consumes: existing `generateDraft({draftingInstructions, story: {title, summary}, exampleTweets}) → {ok, text, marketCost, resolved}` (verify the exact return shape in `lib/draft/generate.ts` before mapping).

- [ ] **Step 1: Read the files first.** Read `lib/scan/{types,schema,parse,ui-stream,prompt,run,persist}.ts`, `lib/draft/generate.ts`, `lib/chat/run-chat.ts` to confirm current signatures and line numbers before editing.

- [ ] **Step 2: Add `RawStory` to `lib/scan/types.ts`**

Keep `PreviewStory.draft: string` required (a `PreviewStory` only exists after the draft leg). Add:

```ts
/** A scanned story BEFORE drafting. A PreviewStory is built only by attaching `draft` after the draft leg. */
export interface RawStory {
  title: string;
  summary: string;
  sourceUrls: string[];
  primaryTweetUrl: string;
  dedupeKey: string;
}
```

- [ ] **Step 3: Drop `draft` from `scanItemSchema` in `lib/scan/schema.ts`**

Delete the `draft: z.string().max(280)...` field (≈line 17). Keep `title`, `body`, `urls` (`.min(1)`), `sources`. The wrapping `scanResultSchema` (`items`) is unchanged.

- [ ] **Step 4: Refactor `lib/scan/parse.ts`**

Rename `toStoryDraft → toRawStory` (≈line 101): stop reading `item.draft`; return `{title, summary, sourceUrls, primaryTweetUrl, dedupeKey}`. In `normalizeItem`, change `if (!title || !body || !draft) return null;` → `if (!title || !body) return null;` (≈line 41). Update the `StoryDraft` interface → drop `draft` (or re-export `RawStory` from types).

- [ ] **Step 5: Update `lib/scan/ui-stream.ts` (THREE spots)**

(1) import `toRawStory` instead of `toStoryDraft` (≈line 16); (2) update the `Parameters<typeof toStoryDraft>[0][]` type reference in `storiesFromOutput`'s param type (≈line 75) → `toRawStory`; (3) the call site (≈line 81). `storiesFromOutput` now returns `RawStory[]`. **Dedupe stays here** (pre-draft, so we never pay to draft a dropped duplicate).

- [ ] **Step 6: Strip draft language from `lib/scan/prompt.ts`**

In `buildScanInstructions`, remove the "For every item include draft…" rule + the draft contract line (≈lines 21-22). In `buildAgentRunUserPrompt`, stop emitting `draftingInstructions`/`exampleTweets` into the prompt. Keep the params at the function signature (accept-and-ignore) to avoid call-site churn.

- [ ] **Step 7: `lib/scan/run.ts` — stop forwarding drafting params**

Stop passing `draftingInstructions`/`exampleTweets` into `buildAgentRunUserPrompt`; keep them in `RunScanInput` (ignored). The existing 240s timeout/abort is unchanged.

- [ ] **Step 8: Create `lib/draft/draft-items.ts`**

```ts
import { generateDraft } from "@/lib/draft/generate";

export interface DraftItemInput {
  title: string;
  summary: string;
}

export interface DraftItemResult {
  ok: boolean;
  text: string | null;
  error: string | null;
  marketCost: number | null;
  resolved: string | null;
}

/**
 * Draft one X post per scanned item via DeepSeek (Gateway), reusing generateDraft.
 * Sequential (NOT Promise.all) to keep Gateway concurrency low and bounded inside the run window.
 * A per-item failure (returned !ok OR thrown) becomes {ok:false, text:null, error} — never throws,
 * never aborts the batch. One result per input, in order.
 */
export async function draftItems(
  items: DraftItemInput[],
  cfg: { draftingInstructions: string; exampleTweets: string[] },
): Promise<DraftItemResult[]> {
  const results: DraftItemResult[] = [];
  for (const item of items) {
    try {
      const r = await generateDraft({
        draftingInstructions: cfg.draftingInstructions,
        story: { title: item.title, summary: item.summary },
        exampleTweets: cfg.exampleTweets,
      });
      if (r.ok) {
        results.push({ ok: true, text: r.text, error: null, marketCost: r.marketCost ?? null, resolved: r.resolved ?? null });
      } else {
        results.push({ ok: false, text: null, error: (r as { error?: string }).error ?? "draft failed", marketCost: null, resolved: null });
      }
    } catch (e) {
      results.push({ ok: false, text: null, error: e instanceof Error ? e.message : "draft failed", marketCost: null, resolved: null });
    }
  }
  return results;
}
```

(Adjust the `generateDraft` result destructuring to its real shape confirmed in Step 1.)

- [ ] **Step 9: Adapt `lib/scan/persist.ts` call-site (minimum to typecheck)**

After `const stories = storiesFromOutput(output)` (now `RawStory[]`), insert a `draftItems` call and build `run_items` from the results. *Do the full Task 2 logic here since it's the same file* — see Task 2 Step 1 for the exact mapping. (The split is conceptual; one file, one edit.)

- [ ] **Step 10: Adapt `lib/chat/run-chat.ts` scan-tool call-site (minimum to typecheck)**

Where the scan tool does `const stories = output ? storiesFromOutput(output) : []` (≈line 123), `stories` is now `RawStory[]`. Insert a `draftItems` call and zip into `PreviewStory[]` (ok → `draft = text`; fail → `draft = ""`) so the tool still returns valid `PreviewStory[]`. (Full `draft`/`updateConfig` tools land in Task 3 — same file.)

- [ ] **Step 11: Sanity build**

```bash
pnpm build
```
Expected: green. Confirm no dangling `toStoryDraft` reference: `grep -rn "toStoryDraft" lib/` → no results.

- [ ] **Step 12: Commit**

```bash
git add lib/scan/ lib/draft/draft-items.ts lib/chat/run-chat.ts
git commit -m "feat(#37): split scan() from draft() at the lib layer (items-only scan + shared draftItems)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Caller B — server-driven run persistence + hub failed-draft

Depends on Task 1. Pure server logic + the hub card; gives an end-to-end runnable Run button before any chat UI.

**Files:**
- Modify: `lib/scan/persist.ts`, `app/api/agents/[id]/run/route.ts`, `app/api/agents/save-agent/route.ts`, `components/agents/story-card.tsx`

**Interfaces:**
- Consumes: `draftItems`, `RawStory` (Task 1).
- Produces: `PersistRunResultInput` extended with `draftingInstructions: string; exampleTweets: string[]`.

- [ ] **Step 1: Finalize `lib/scan/persist.ts`**

Extend `PersistRunResultInput` with `draftingInstructions: string; exampleTweets: string[]`. After `storiesFromOutput(output)` → `RawStory[]`:

```ts
const drafts = await draftItems(
  stories.map((s) => ({ title: s.title, summary: s.summary })),
  { draftingInstructions, exampleTweets },
);
const runItems = stories.map((s, i) => {
  const d = drafts[i];
  return d?.ok
    ? { /* ...story metadata..., */ drafted_text: d.text, final_text: d.text, status: "drafted" as const }
    : { /* ...story metadata..., */ drafted_text: null, final_text: null, status: "failed" as const, error_message: d?.error ?? "draft failed" };
});
```

- Build the `story metadata` fields exactly as today (`run_id, agent_id, story_title, story_summary, source_urls, primary_tweet_url, dedupe_key`).
- **Never throw on partial failure**; single batch insert; the run completes even if all items failed.
- **Cost:** scan `metrics.costUsd` is structurally `null` for `xai.responses`. Set `cost_usd = drafts.reduce((sum, d) => sum + (d.marketCost ?? 0), 0)` (summed draft cost; scan null is fine — do NOT claim "both legs summed").
- **logUsage:** one `logUsage({ kind: "draft", provider: "gateway", resolved_provider: d.resolved, model: DRAFT_MODEL, ... })` per item (mirror `redraft/route.ts`).
- Keep `draftItems` awaited INSIDE the existing `try` of the `consumeStream → persistRunResult` chain. If `draftItems` itself throws, the existing run-level `catch` marks the run `failed` — correct.

- [ ] **Step 2: `app/api/agents/[id]/run/route.ts`**

Remove the 400 gate on empty `drafting_instructions` (≈lines 85-89; voice is optional per the spec). Pass `draftingInstructions: agent.drafting_instructions ?? "", exampleTweets: agent.example_tweets ?? []` into `persistRunResult`. Do not touch the `consumeStream` wiring or the 240s abort.

- [ ] **Step 3: `app/api/agents/save-agent/route.ts` (TWO edit points)**

(1) `normalizeStory` (≈line 27): relax the `!draft` guard so a `draft === ""` preview item is NOT dropped — return null only if `title`/`summary`/`dedupeKey` is missing. (2) the `run_items` map (≈line 235): branch on empty draft — non-empty → `{drafted_text, final_text, status:"drafted"}`; empty → `{drafted_text:null, final_text:null, status:"failed", error_message:"Draft failed during creation"}`. The real per-item error does NOT survive Save (`PreviewStory` has no error field) — use the generic message; **do NOT widen `PreviewStory`** (scope creep). Keep the 409 dup-name check unchanged.

- [ ] **Step 4: `components/agents/story-card.tsx` (HUB card)**

When a `run_item`'s `drafted_text` is NULL/empty: show a "draft failed" message, **disable Post** (no text to post), **enable Redraft** (existing handler resets `failed → drafted`). Keep the existing posted/failed terminal states. Key off empty/null draft + `status`, since `DraftsPanel.itemToStory` already defaults to `''`.

- [ ] **Step 5: Verify (deferred to Phase 4 — note for the checklist).** Manually Run a saved agent with AND without voice instructions: run completes; drafted items show Post; a forced-failure item shows "draft failed" + Redraft enabled + Post disabled; Redraft recovers it; `cost_usd` non-null after ≥1 drafted item; `[usage]` shows 1 scan + N draft lines.

- [ ] **Step 6: Commit**

```bash
git add lib/scan/persist.ts app/api/agents/[id]/run/route.ts app/api/agents/save-agent/route.ts components/agents/story-card.tsx
git commit -m "feat(#37): Caller B — saved run drafts via DeepSeek leg inside server-driven completion

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Caller A — chat tools (`scan` + `draft` + `updateConfig`) + system prompt + D3

Depends on Task 1. Same file as Task 1 Step 10 — finalize all three tools.

**Files:**
- Modify: `lib/chat/run-chat.ts`, `lib/chat/system-prompt.ts`

**Interfaces:**
- Consumes: `draftItems`, `RawStory`, `agentConfigSchema` (`lib/chat/config.ts`).
- Produces: chat tools `scan`, `draft`, `updateConfig` (registered in `buildAgentChatStream`).

- [ ] **Step 1: `scan` tool (refine existing)**

Keep the input schema. Execute: `runScanStream` (with `abortSignal: AbortSignal.timeout(240_000)` + a safe `onAbort` that guards `runId === undefined`, since create has no run row) → `storiesFromOutput` → `RawStory[]` → `draftItems(raw.map(s => ({title: s.title, summary: s.summary})), {draftingInstructions, exampleTweets})` → zip into `PreviewStory[]` (ok → `draft = text`; fail → `draft = ""`) → `logUsage` scan + per-item draft → return `{ stories, metrics }`. **Gate:** if `!scanningInstructions` OR no source (X off AND web off), return a friendly "I need a beat and at least one source first" result instead of calling Grok. Do NOT gate on `draftingInstructions`.

- [ ] **Step 2: `draft` tool (NEW) — re-draft current items, no search**

```ts
// Server-side extractor over ModelMessage[] (NOT the client UIMessage matchers).
// Walk backwards for the last assistant `tool-call` named the scan tool + its paired `tool-result`,
// read output.stories[].{title,summary}. Return [] if none found.
function latestScanStories(messages: ModelMessage[]): { title: string; summary: string }[] { /* ... */ }
```

Execute: extract latest scan stories from the message history passed into `buildAgentChatStream`; if none → return a friendly "let's scan first" result. Else `draftItems(latest, {draftingInstructions, exampleTweets})` → zip into `PreviewStory[]` (reusing the latest stories' metadata) → per-item draft `logUsage` → return `{ stories, metrics: { ...searchCount: 0 } }`. **No search, no re-scan, no DB write.** Do NOT reuse `isRunScanPart`/`extractRunScanOutput` (those match UIMessage, not ModelMessage).

- [ ] **Step 3: `updateConfig` tool (NEW, ephemeral)**

```ts
inputSchema: z.object({
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

Execute: merge the patch into the running config, validate against `agentConfigSchema`, return `{ config }`. **No model call, no search, NO DB write.** Register all three tools in the tools object.

- [ ] **Step 4: D3 — handle-free X monitoring survives Save**

In `run-chat.ts` (the config-patch derivation `runScanInputToConfigPatch`, and the `updateConfig` merge), drive `sources.x.enabled` from an explicit "monitor X" choice, NOT `handles.length > 0`. (So `configToColumns` later persists `search_x: true` for a handle-free X scan.)

- [ ] **Step 5: `lib/chat/system-prompt.ts`**

Teach: `scan` = one paid Grok search → items (the draft leg auto-runs inline as part of `scan`); `draft` = cheap DeepSeek re-draft of the current items, no search; `updateConfig` = ephemeral patch (no model/DB). Route retrieval critique → `scan`, voice critique → `draft`, config edits → `updateConfig`. Gate the first scan on beat + a source choice (NOT on voice). Name proposed by the agent, required only at Save. Connect-X stays out of create. Sentence case, concise, no markdown headers.

- [ ] **Step 6: Verify (deferred to Phase 4).** Via the **chat-debug** route (no browser): a single scan fires + drafts; a two-turn sequence (scan, then "punchier") exercises the `draft` tool against the in-memory `ModelMessage[]`; an "also watch @handle" turn fires `updateConfig` with no scan. Confirm chat ↔ chat-debug parity.

- [ ] **Step 7: Commit**

```bash
git add lib/chat/run-chat.ts lib/chat/system-prompt.ts
git commit -m "feat(#37): Caller A chat tools — scan + cheap draft + ephemeral updateConfig (D3 search_x fix)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Caller A — create-chat UI

Depends on Task 3.

**Files:**
- Modify: `components/agents/agent-chat.tsx`, `components/agents/chat-message-row.tsx`, `components/agents/draft-card.tsx`

**Interfaces:**
- Consumes: the three tools' result shapes (Task 3); `config` state; `sendMessage` from `useChat`.

- [ ] **Step 1: `components/agents/agent-chat.tsx`**

Remove the Chat/Form toggle + the Form-tab/`ConfigForm` render (≈lines 682-701) and the `activeTab` state. Add a read-only **config card** driven by `config` state (name, beat, sources + counts, voice summary, example count), updating live on `updateConfig`. Add thin guiding buttons that call `sendMessage` with plain text: `"Wider net"`, `"Confirmed only"`, `"Punchier"`, `"Drop hashtags"`, `"Re-scan"`. Extend `configFromMessages` (≈lines 124-135) to replay `scan` **+ `updateConfig` + `draft`** inputs (critical for session resume). Keep the recent-sessions dropdown, `draftEdits` hand-edit survival, and the edit-reset-on-new-fingerprint behavior. **Unwire** `config-form.tsx` from create (do NOT delete the file — edit-by-chat is deferred).

- [ ] **Step 2: `components/agents/chat-message-row.tsx`**

Add a `hidePostHint` prop and pass it to **DraftCard** (the create card it renders ≈line 176). Render the failed-draft sub-state ("Draft failed — refine voice and re-draft") when a story's `draft === ""`. Add rendering for the `draft` and `updateConfig` tool parts (mirror the existing scan tool-part rendering).

- [ ] **Step 3: `components/agents/draft-card.tsx` (CREATE card)**

Accept `hidePostHint?: boolean`; wrap the unconditional "Connect X to post" hint (≈line 88) in `{!hidePostHint && …}`. Render the empty/failed-draft state instead of an empty textarea when `draft === ""`.

- [ ] **Step 4: Verify (deferred to Phase 4).** Browser (`testuser@oparax.com` / `hello123`): `/dashboard/agents/new` → greeting + empty config card; "watch @OpenAI" → `updateConfig` updates the card, no scan; "ready" → Scanning then Drafting → drafts appear; "more formal" → draft-only block; hand-edit a draft; Save; refresh → state restored (config card matches). No "Connect X" hint in create.

- [ ] **Step 5: Commit**

```bash
git add components/agents/agent-chat.tsx components/agents/chat-message-row.tsx components/agents/draft-card.tsx
git commit -m "feat(#37): Caller A UI — iterate loop, config card, guiding buttons, drop Chat/Form toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Docs — `AGENTS.md`

**Files:** Modify: `AGENTS.md`

- [ ] **Step 1: Update the stale "Today" pipeline line**

Change "one Grok call scans X/web and drafts every story" → "one Grok call scans X/web **→ items only**; one DeepSeek leg drafts each item." Add a note that `run_items.drafted_text` now comes from the DeepSeek draft leg, not inline from scan. Keep the existing guardrails SPLIT line (already correct). **Never touch `CLAUDE.md`.**

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs(#37): AGENTS.md — scan→items, separate DeepSeek draft leg

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 Verification (centralized — run once, here only)

1. `pnpm build` green; `pnpm lint:fix` clean on this feature's changed files (JS/TS/JSON only).
2. **Create loop:** new → `updateConfig` (no scan) → first scan auto-drafts → re-draft (no search) → hand-edit → Save → refresh restores state.
3. **Saved run:** open agent → Run (no voice AND with voice both draft) → items appear; forced-failure item → `status:failed`, error shown, run still completes.
4. **Post & redraft:** Post a drafted item; Redraft a failed item → recovers to drafted; posted item's Redraft disabled.
5. **Server-driven completion:** start a scan, force-close the tab, wait, reload → no orphaned "running"; preview run persisted.
6. **Ownership/RLS:** a second user cannot open/run/post another user's agent (404/403).
7. **X optional:** create with X chosen + zero handles → scan/draft/save work; `agents.search_x` = true (D3); Post requires X connected.
8. **Chat-debug parity:** a scan-then-"punchier" two-turn sequence through `/api/agents/chat-debug` exercises `scan` + `draft` identically to the live route.
9. **Cost/usage:** `[usage]` shows 1 scan + N draft lines; `runs.cost_usd` non-null after ≥1 drafted item.
10. **UI states:** empty / gathering / scanning / drafting / results / partial-fail sub-state / zero-items / timeout.

---

## Deferred (do NOT build in Slice 1 — carried from spec §11 + guardrails)

- Surface 2 (hub story-first), Surface 3 (edit-by-chat of saved agents — `updateConfig` rails exist, flow not built; `config-form.tsx` unwired not deleted), Surface 4 (listing triage), Surface 5 (cost-receipt UI — only the `[usage]` tracer now).
- Drafting beyond 1→1: select-subset, `itemIds`/`fromItems[]` persistence, multi-platform 1→many.
- Async/background draft (Vercel Workflows/Queues) — draft stays synchronous in-chain.
- Per-item draft streaming, "Iteration N" badges, per-item redraft spinners; full field-editing form; result-chips/custom composer chrome.
- Cross-run dedup/aggregation, learning loop, schedule/autonomy + auto-post, notifications, other platforms, handle cap 10→20, BYOK, full-archive, eve migration.
- **Separate cleanup (flag, don't fold in):** delete dead `components/agents/scan-preview.tsx` (only a comment references it).
