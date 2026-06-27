# Oparax: How Your AI Layer Actually Works (A Plain-English Audit)

You vibecoded most of this app. This report is the "what did I actually build?" map for the AI parts — the three LLM legs, how they're wired, how data flows from a chat message all the way to a posted tweet, and — the centerpiece — a full catalog of every place the code tries to *control* what the LLM does, scored by how reliable that control actually is.

Read the [headline finding on x_search subtools](#the-headline-finding-the-x_search-subtool-restriction) if you read nothing else: a thing you (or the task brief) believed exists — code that forces Grok to use `x_keyword_search` / `x_semantic_search` — **does not exist in this codebase.**

---

## 1. The big picture: three LLM "legs," two transport paths

Your app talks to LLMs in exactly three places ("legs"), and there are exactly **two** ways those calls leave your server.

### The three legs

| Leg | What it does | Model | Searches the web/X? |
|---|---|---|---|
| **Setup chat** | The `/dashboard/agents/new` conversation — reporter describes a beat, tunes retrieval + voice, hits Save | `deepseek/deepseek-v4-flash` | No (it *triggers* a scan via a tool, but the chat model itself can't search) |
| **Grok scan** | "Go find news" — retrieves atomic news *items* (title, body, source URLs). **Never writes posts.** | `grok-4.3` (direct xAI) | **Yes** — this is the only search-bound call |
| **DeepSeek draft** | Turns each scanned item into one X post, in the reporter's voice | `deepseek/deepseek-v4-flash` | No |

The scan→draft split is deliberate and load-bearing: the scan **retrieves**, the draft **writes**, and they never blur. The scan's own system prompt literally says *"You do NOT write posts"* (`lib/scan/prompt.ts:12`).

### The two transport paths — and WHY

This is the single most important architectural fact in the whole AI layer, and it's centralized in one ~41-line file: `lib/ai/providers.ts`.

**Path 1 — the Vercel AI Gateway (used by setup chat + draft + redraft).**
There is **no gateway client** anywhere in your code. You never call `createGateway`. Instead, you pass a bare `"provider/model"` **string** — `"deepseek/deepseek-v4-flash"` — as the `model:` argument to the AI SDK's `streamText`/`generateText`. The AI SDK v6 sees a bare `provider/model` string and **automatically routes it through the Vercel AI Gateway.** That's the entire mechanism. Failover + cost routing are configured by spreading `GATEWAY_PROVIDER_OPTIONS` (`lib/ai/providers.ts:29-35`), which tells the gateway: *if deepseek fails, fall back to `xai/grok-4.3`; otherwise pick the cheapest BYOK provider (`sort: "cost"`).*

**Path 2 — the direct `@ai-sdk/xai` provider (used ONLY by the scan).**
The scan is built with `xai.responses("grok-4.3")` and binds xAI's server-side tools `xai.tools.xSearch(...)` / `xai.tools.webSearch(...)` (`lib/scan/run.ts`). This is the **only** explicit provider import in the entire codebase (`import { xai } from "@ai-sdk/xai"`, `lib/ai/providers.ts:21`).

**WHY the split exists:** *Server-side tools cannot cross the Gateway.* The Gateway is a thin model proxy — it forwards prompts to a model and streams text back, but it cannot carry xAI's *hosted tool execution* (the search that runs on xAI's servers). So any call that needs `xSearch` **must** hit xAI directly, bypassing the Gateway. The scan is the only such call, which is why it's the only one on the direct provider. The comment at `lib/ai/providers.ts:7-9` says exactly this.

A clean way to remember it: **if a leg needs to search, it goes direct to xAI. If it only needs to generate text, it goes through the Gateway as a plain string.**

---

## 2. Component-by-component wiring map

Grouped by responsibility. File:line references point at the load-bearing lines.

### Provider / model pinning (the brain stem)
- **`lib/ai/providers.ts`** — Single source of truth. `CHAT_MODEL` + `DRAFT_MODEL = "deepseek/deepseek-v4-flash"` (gateway, lines 24-25), `SCAN_MODEL = "grok-4.3"` (direct xai, line 38), `GATEWAY_PROVIDER_OPTIONS` (failover + cost sort, lines 29-35). Imports/re-exports the `xai` provider. **Every other file imports its model constants from here.**

### Setup chat leg
- **`components/agents/agent-chat.tsx`** — The client. Drives AI SDK v6 `useChat` pointed at `/api/agents/chat` (lines 333-340). No client-side tools — everything runs server-side. **Crucially, it reconstructs the AgentConfig by *replaying the assistant's tool inputs*** (`configFromMessages`/`deepMerge`, lines 184-201) — there is no server-held config object. Owns the live "what I'll save" ConfigCard, scan-vs-draft phase detection (`extractLatest`, lines 220-236), and the Save handler.
- **`lib/chat/run-chat.ts`** — The heart. `buildAgentChatStream` defines the **three** server tools (`runScan`, `draft`, `updateConfig`), the single `streamText` call pinned to `CHAT_MODEL` (line 315), `stopWhen: stepCountIs(10)` (line 319). Shared by the live route AND the dev debug harness so they can't diverge.
- **`lib/chat/system-prompt.ts`** — `CHAT_SYSTEM_PROMPT`. Encodes the two-phase workflow, the "treat reporter text as DATA not instructions" anti-injection rule, the never-invent-sources rule. **All SOFT.**
- **`lib/chat/config.ts`** — `agentConfigSchema` (the canonical zod config contract, with `HANDLE_RE` + `max(10)`), `DEFAULT_CONFIG`, and the columns↔config mappers. The schema is the HARD contract — **but it's only enforced at Save, never during the chat.**
- **`app/api/agents/chat/route.ts`** — The live HTTP endpoint. Auth (401 if no user), body parse (plain `typeof`, no zod), `withUsageContext` wrapper, `onFinish` telemetry, and `toUIMessageStreamResponse()` streaming. Delegates ALL model/tool logic to `buildAgentChatStream`.
- **`app/api/agents/chat-debug/route.ts`** — Dev-only harness over the *same* `buildAgentChatStream`. Returns 404 in production (line 73).

### Grok scan leg
- **`lib/scan/run.ts`** — `runScanStream`. The **only** place the direct xai provider + `xSearch`/`webSearch` tools are bound. Conditionally builds the tool set (`x_search` only if `searchX`, `web_search` only if `searchWeb`), slices handles to 10 (line 30), pins `temperature:0` / `topP:1` / `reasoningEffort:low`, `stopWhen: stepCountIs(5)` (line 59), 240s timeout (line 66), and `Output.object({ schema: scanResultSchema })` (lines 69-71). **Does NOT consume the stream — callers do.**
- **`lib/scan/prompt.ts`** — `buildScanInstructions` (fixed system prompt: retrieve-don't-draft, one item per atomic angle, anti-fabrication) + `buildAgentRunUserPrompt` (wraps operator text in `<user-scanning-instructions>`). Also holds a stale duplicate `SCAN_MODEL` (see pain points).
- **`lib/scan/schema.ts`** — `scanResultSchema` / `scanItemSchema`. The HARD structured-output contract: `items[]` each with `title`, `body`, `urls` (min 1, url-typed), `sources[]`.
- **`lib/scan/parse.ts`** — Defensive second pass. `normalizeItem` drops items missing title/body/≥1 url; `toRawStory` derives `primaryTweetUrl` + a stable `dedupeKey` from the X status URL.
- **`lib/scan/ui-stream.ts`** — Consumes the stream result: `extractMetrics` (counts `x_search` tool calls from `result.steps` because `providerMetadata` is undefined for `xai.responses` in SDK v6), `storiesFromOutput` (re-validates + dedupes), `scanToUIResponse`.
- **`lib/scan/handles.ts`** — `MONITOR_MAX_HANDLES = 10`, `HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/`, `normalizeHandle`, `isValidHandle`.
- **`node_modules/@ai-sdk/xai/dist/index.js`** — The installed adapter (3.0.95) that *actually* enforces the 10-handle cap (`z.array().max(10)`, line ~1876). The four "subtool" names (`x_user_search`, `x_keyword_search`, `x_semantic_search`, `x_thread_fetch`) live here at lines 2217-2222 as a **fixed labeling list, not a selectable allowlist** (see headline finding).

### DeepSeek draft leg
- **`lib/draft/draft-items.ts`** — `draftItems`. The single shared batch entrypoint both callers use. Loops items **sequentially** (bounds gateway concurrency), per-item try/catch so one failure never aborts the batch, exactly one result per input by index.
- **`lib/draft/generate.ts`** — `generateDraft` → `generateOnce`. The one `generateText` call: `model: DRAFT_MODEL` (line 38), `Output.object(draftSchema)`, `GATEWAY_PROVIDER_OPTIONS` spread. **No `tools`, no `maxSteps`, no temperature.** Runs the validate → one repair pass → re-validate loop.
- **`lib/draft/validate.ts`** — `getDraftIssue`. The HARD content gate: rejects empty, raw-URL (`RAW_URL_RE`), markdown (`MARKDOWN_RE`). **Explicitly NO length cap.** Reused as the pre-post guard in `lib/x/post-item.ts`.
- **`lib/draft/schema.ts`** — `draftSchema = z.object({ text: z.string() })`. Maximally permissive — guarantees a string exists, nothing about quality.
- **`lib/draft/prompt.ts`** — `DRAFT_SYSTEM_PROMPT` / `DRAFT_REPAIR_SYSTEM_PROMPT` + `buildDraftUserContent`. Also holds a **dead** duplicate `DRAFT_MODEL = "grok-4.3"` plus unused JSON-prompt scaffolding (see pain points).
- **`lib/draft/count.ts`** — `weightedLength` via twitter-text. **DISPLAY ONLY** — never gates anything. `TWEET_WEIGHTED_LIMIT = 280` is defined and referenced nowhere.

### Routes + run completion (the orchestration spine)
- **`app/api/agents/scan/route.ts`** — *Caller A* preview scan (ephemeral, persists nothing). Hand-rolled `typeof` validation, handle cap, source gate, then `runScanStream`; `onFinish` only logs usage.
- **`app/api/agents/draft/route.ts`** — *Caller A* per-story draft for the preview. Calls `generateDraft`, returns text + `weightedLength`. Persists nothing.
- **`app/api/agents/[id]/run/route.ts`** — *Caller B* saved run. Auth + ownership, inserts `runs` row (`status:'running'`), `runScanStream`, then the **server-driven completion**: `consumeStream() → persistRunResult` (lines 147-164), `void`-ed and not awaited. Returns `scanToUIResponse` as *live-progress UX only.*
- **`app/api/agents/save-agent/route.ts`** — Save path for the Caller A preview. The **only** route in the whole slice that uses zod (`agentConfigSchema.safeParse`). Inserts the agent, then a `completed` run + `run_items` (deduped by `dedupeKey`) via the shared `buildRunItemInsert`.
- **`lib/scan/persist.ts`** — `persistRunResult`. The single run-completion chokepoint. Awaits output, runs `draftItems` under a wall-clock budget, zips drafts onto stories, inserts `run_items`, marks the run terminal. **Never throws** — every failure path lands the run `failed`.
- **`lib/scan/run-items.ts`** — `buildRunItemInsert`. Single owner of the "drafted vs failed" decision: text → `status:drafted`; null text → recoverable `status:failed`. Shared by `persist` + `save-agent`.

### X posting + token security
- **`lib/x/post-item.ts`** — `postRunItem`. The single posting code path. Ownership assertion (does NOT trust RLS), pre-post content validation, the **atomic post-claim lock** (`drafted|failed → posting` in one conditional UPDATE), then `postTweet`.
- **`lib/x/tokens.ts`** — AES-256-GCM encrypt/decrypt of X tokens, `saveConnection` upsert, `getFreshAccessToken` (decrypt-and-reuse or refresh-rotate-persist).
- **`lib/x/client.ts`** — Thin X API v2 fetch wrappers. `postTweet` = `POST /2/tweets`, success strictly HTTP 201.
- **`lib/x/link-identity.ts`** — Browser-side OAuth kickoff (unlink stale identity, then `linkIdentity` with read+write scopes).
- **`app/auth/callback/route.ts`** — OAuth callback: exchange code, grab provider tokens before refresh nulls them, encrypt + `saveConnection`.
- **`app/api/agents/run-items/[id]/post/route.ts`** + **`.../redraft/route.ts`** — The manual post + redraft HTTP routes.

### Usage logging + config
- **`lib/usage/log.ts`** — The whole telemetry surface now. `logUsage` computes a cost, merges AsyncLocalStorage attribution, and prints **one `console.info` line.** No persistence — the old `api_usage_events` table is gone.
- **`lib/usage/cost.ts`** / **`pricing.ts`** / **`format.ts`** / **`context.ts`** / **`types.ts`** — Pure cost engine, the only hardcoded prices, presentation helpers (orphaned), the AsyncLocalStorage context, and the string-union labels.
- **`lib/auth/admin.ts`** — `isAdmin` reads `ADMIN_EMAILS`. **Zero callers — dead code.**

---

## 3. The data flow: from a chat message to a posted tweet

### Create-in-chat → scan → draft (the preview loop, "Caller A")

1. Reporter types a beat into the chat (`agent-chat.tsx`). The chat model (deepseek via Gateway) decides to call **`runScan`**.
2. `runScan`'s `execute` **gates before spending money**: no beat or no source → returns empty + a notice, **never calls Grok** (`run-chat.ts:173-180`). Otherwise it computes a default 7-day window, normalizes/validates handles, and calls `runScanStream`.
3. `runScanStream` hits xAI directly with `grok-4.3` + `xSearch`, returns structured `items[]`. The chat shows them as cards.
4. Reporter likes the items → model calls **`draft`**, which reads the latest scan's items and calls the shared `draftItems → generateDraft` (deepseek via Gateway). Drafts render as cards.
5. **Nothing is in the database yet.** The config the reporter sees is *reconstructed client-side* by replaying the tool inputs (`configFromMessages`).

### Save (Caller A → persistence boundary)

6. Reporter hits **Save** → browser POSTs the derived config + preview stories to `save-agent/route.ts`.
7. This is the **only** place the config is zod-validated (`agentConfigSchema.safeParse`, line 120) and the **only** place ownership is enforced (owner-scoped insert). It writes the `agents` row, then — if there were preview stories — a `runs` row already marked `completed`, deduped by `dedupeKey`, with `run_items` via the shared `buildRunItemInsert`.

### Run (the saved agent, "Caller B" — the tab-close-safe path)

8. On the saved agent page, **Run** POSTs to `[id]/run/route.ts`. Auth + ownership (`.eq('id', id).eq('user_id', user.id)`), source gate from the persisted columns, `effectiveHandles = search_x ? monitored_handles : []` (so X-off truly means no X), inserts `runs` row as `running`, calls the same `runScanStream`.
9. **Here's the important part — server-driven completion.** Instead of trusting the browser to drain the stream, the route fires `result.consumeStream()` — which fully drives Grok server-side regardless of the client — and chains `.then(() => persistRunResult(...))`. This promise is **`void`-ed, not awaited.** The route immediately returns `scanToUIResponse` purely as live-progress UX.
10. **A closed tab has zero correctness impact.** `consumeStream` keeps running server-side. `persistRunResult` runs the DeepSeek draft leg under a wall-clock budget, writes `run_items`, and marks the run `completed`.
11. Three independent writers guarantee a terminal state: (a) `onAbort` marks `failed` on the 240s timeout, (b) the persist chain's `.catch` marks `failed` on any throw, (c) `persistRunResult` itself never throws and lands `failed` on every internal failure path. All guarded by `.eq('status','running')` so the first writer wins.

### Post / redraft (the side-effect path)

12. Reporter hits **Post** on a drafted item → `post/route.ts` → `postRunItem`. Ownership assertion, content re-validation (`getDraftIssue`), fresh token, then the **atomic claim**: `UPDATE run_items SET status='posting' WHERE id=? AND status IN ('drafted','failed')`. If zero rows return, someone else already claimed it → 409. Winner posts via `POST /2/tweets`, writes `posted` + tweet id/url.
13. **Redraft** resets a `failed` item back to `drafted` (regenerating with DeepSeek), which re-arms it for the post claim — that's what makes a failed post recoverable.

### Why Caller A and Caller B can't drift

Both funnel the model call through **`runScanStream`** (one provider/tool/schema config), both build DB rows through **`buildRunItemInsert`** (one drafted-vs-failed decision), and both draft through **`draftItems → generateDraft`** (one prompt + validation/repair). The *shared functions* can't diverge. **But the orchestration *around* them is duplicated by hand** (Caller A persists via `save-agent`; Caller B via `persistRunResult`) — see pain points.

---

## 4. ENFORCEMENT CATALOG (the centerpiece)

Every place the code tries to control LLM behavior. **HARD** = enforced by code/schema/framework the model cannot route around. **SOFT** = a prompt instruction the model can ignore.

| What | Mechanism | Evidence (file:line) | Reliability | Useful in practice? |
|---|---|---|---|---|
| Chat model pinned to deepseek via Gateway | **HARD** (code) | `lib/ai/providers.ts:24` + `lib/chat/run-chat.ts:315` | Strong | Yes — literal constant; LLM has zero say. One edit re-pins every chat turn. |
| Draft/redraft model pinned to deepseek via Gateway | **HARD** (code) | `lib/ai/providers.ts:25` + `lib/draft/generate.ts:38` | Strong | Yes — most reliable constraint in the draft leg. |
| Scan model pinned to grok-4.3 on the **direct** xai provider | **HARD** (code) | `lib/scan/run.ts:53` + `lib/ai/providers.ts:38` | Strong | Yes — load-bearing; this is the deliberate Gateway bypass for server-side tools. |
| Gateway failover list (`xai/grok-4.3`) + cost-sort | **HARD** (code) | `lib/ai/providers.ts:29-35`, spread at `generate.ts:46`, `run-chat.ts:320` | Moderate | Conditional — only fires if deepseek errors. App can't verify the Gateway honors the keys locally. |
| Chat tool allowlist — model may call ONLY `runScan`/`draft`/`updateConfig` | **HARD** (tool allowlist) | `lib/chat/run-chat.ts:312` | Strong | Yes — model physically cannot invoke anything else (no post, no DB write). |
| `x_search` bound to the scan **only when `searchX` is true** (web_search only when `searchWeb`) | **HARD** (tool allowlist) | `lib/scan/run.ts:35-50` | Strong | Yes — a no-X scan literally has no `x_search` tool. True allowlist. |
| Chat model never gets `x_search` directly (it lives behind the runScan execute on a separate streamText call) | **HARD** (tool allowlist) | `lib/scan/run.ts:35-41` | Strong | Yes — good isolation; chat model can only set runScan's boolean inputs. |
| Pre-search gate — `runScan` refuses (no Grok call) without a beat AND a source | **HARD** (code) | `lib/chat/run-chat.ts:173-180` | Strong | Yes — hard cost guard backing the soft "don't scan early" nudge. |
| `updateConfig` is a pure no-op echo (no scan, no draft, no DB write) | **HARD** (code) | `lib/chat/run-chat.ts:305-309` | Strong | Yes — recording a setting is structurally side-effect-free. |
| Handle count capped at 10 | **HARD** (code + schema) | slice at `lib/scan/run.ts:30`; SDK `z.array().max(10)` at `@ai-sdk/xai/dist/index.js:1876`; route reject at `scan/route.ts:76` | Strong | Yes — triple-guarded. **But UX is inconsistent: chat silently slices, route hard-rejects.** |
| Handle syntax allowlist (`[A-Za-z0-9_]{1,15}`) | **HARD** (schema) | `lib/scan/handles.ts:7`, applied `run-chat.ts:190`, `scan/route.ts:81` | Moderate | Yes on chat/standalone. **Caveat: saved-run path passes `monitored_handles` with NO re-validation** — trusts the DB + save-time check. |
| Scan output forced to structured zod schema (`items[]`, each `urls.min(1)` + `z.url()`) | **HARD** (schema) | `lib/scan/run.ts:69-71` + `lib/scan/schema.ts:25-27` | Strong | Yes for *shape*. **Cannot verify URLs are real** — a fabricated-but-valid `x.com/.../status/<id>` passes `z.url()`. |
| Defensive second-pass — drop items missing title/body/url, dedupe | **HARD** (code) | `lib/scan/parse.ts:30,41`; `ui-stream.ts:87-90` | Strong | Yes — belt-and-suspenders independent of SDK coercion. |
| Draft output forced to `{ text: string }` schema | **HARD** (schema) | `lib/draft/generate.ts:39-41` + `lib/draft/schema.ts:3` | Strong | Yes for shape; **near-no-op for content** (accepts empty/URL/markdown). |
| Post-generation draft validation — reject empty/raw-URL/markdown + ONE repair pass | **HARD** (code) | `lib/draft/validate.ts:19-23`; driven `generate.ts:111-138` | Moderate–Strong | Yes — regex in code, not a plea. **Coarse:** `MARKDOWN_RE` misses `__bold__`, `*italic*`, `[text](url)`, backticks. Only one retry. |
| No-search guarantee on the draft leg (no `tools` arg at all + Gateway can't carry server tools) | **HARD** (tool allowlist by absence) | `lib/draft/generate.ts:37-48` (no `tools` key) | Strong | Yes — airtight. Absence of capability, not a nudge. The most robust enforcement in the slice. |
| No agentic looping on draft (no `maxSteps`/`stopWhen`) | **HARD** (code) | absence under `lib/draft/`; `generate.ts:37` plain `generateText` | Strong | Yes — `generateText` with no tools is inherently single-step. |
| Chat step budget — `stopWhen: stepCountIs(10)` | **HARD** (code) | `lib/chat/run-chat.ts:319` | Strong | Yes — caps runaway tool loops; each scan step costs a search, so this bounds spend. |
| Scan step budget — `stopWhen: stepCountIs(5)` | **HARD** (code) | `lib/scan/run.ts:59` | Strong | Yes — bounds the agentic scan loop; with the 240s timeout, caps blast radius. |
| Scan determinism — `temperature:0`, `topP:1`, `reasoningEffort:low` | **HARD** (code) | `lib/scan/run.ts:60-61,72-76` | Moderate | Reduces variance/cost. Does NOT make results deterministic (live X changes between runs). |
| Scan time-bound (240s timeout < 300s route `maxDuration`) + `onAbort` | **HARD** (code) | `lib/scan/run.ts:66-68`; callers pass `AbortSignal.timeout(240_000)` | Strong | Yes — orphan-prevention spine; a hung call fails terminal instead of riding to the wall. |
| Server-driven completion — `consumeStream() → persistRunResult`, void/not awaited | **HARD** (code) | `app/api/agents/[id]/run/route.ts:147-164` | Strong | Yes — closed tab has zero correctness impact. Central to the whole design. |
| Run terminal-state guarantee — `persistRunResult` never throws; 3 writers converge | **HARD** (code) | `lib/scan/persist.ts:44-54,91-101,142-156`; `run/route.ts:126-138,165-176` | Strong | Yes — every run reaches a terminal state. `.eq('status','running')` = first-writer-wins. |
| Draft batch isolation — per-item failure never aborts the batch; lands recoverable | **HARD** (code) | `lib/draft/draft-items.ts:66-74`; `persist.ts:82`; `run-items.ts:29-35` | Strong | Yes — a paid Grok scan is never wasted by one bad draft. |
| Draft wall-clock budget on the saved run | **HARD** (code) | `lib/scan/persist.ts:64-69` | Moderate | Yes for near-budget runs. **Only the saved run passes a signal** — chat preview + single-item routes rely solely on route `maxDuration`. |
| Save-agent config validation (`agentConfigSchema.safeParse`) | **HARD** (schema) | `app/api/agents/save-agent/route.ts:120` | Strong–Moderate | Strong at the boundary. **But the entire in-chat config is UNVALIDATED until Save.** Stories/metrics aren't zod-validated even at Save. |
| Effective-handles gating — X scanned only when `search_x` is on | **HARD** (code) | `app/api/agents/[id]/run/route.ts:89` | Strong | Yes — stale handles can't silently force an X search / waste a search cost. |
| Agent ownership assertion (saved run) | **HARD** (code) | `app/api/agents/[id]/run/route.ts:53-71` | Strong | Yes — `.eq('user_id')` + RLS; cross-tenant runs blocked at two layers. |
| Ownership assertion in `postRunItem` (does NOT trust RLS) | **HARD** (code) | `lib/x/post-item.ts:46-48` | Strong | Yes — the only cross-account guard that holds for a future service-role cron caller. |
| Atomic post-claim lock (`drafted\|failed → posting`) | **HARD** (code) | `lib/x/post-item.ts:68-77` | Strong | Yes — two tabs can't double-post. **But only as strong as every writer respecting `posting` — redraft doesn't (see pain points).** |
| Pre-post content gate (`getDraftIssue` reused) | **HARD** (code) | `lib/x/post-item.ts:54` | Moderate | Yes — blocks markdown/URLs from reaching X. Same coarse-regex limits; no length cap. |
| AES-256-GCM token encryption at rest (random IV, auth tag verified) | **HARD** (code) | `lib/x/tokens.ts:27-31,44` | Strong | Yes — a leaked DB row is useless without the key; tampering throws. **Weak point is key management, not the cipher.** |
| Posting endpoint pinned to `POST /2/tweets`, success strictly HTTP 201 | **HARD** (code) | `lib/x/client.ts:330,349` | Strong | Yes — no model involvement in the write; 201-only avoids treating odd responses as success. |
| Token-refresh provider pin (X confidential client, rotated refresh token re-persisted) | **HARD** (code) | `lib/x/tokens.ts:146,211-213` | Strong | Yes — X rotates the refresh token each use; re-persisting keeps the connection alive. |
| OAuth scope pinning (`tweet.read tweet.write users.read offline.access`) | **HARD** (code) | `lib/x/link-identity.ts:41` | Moderate | Pins what posting needs. **But the callback persists a DIFFERENT scope list — recorded scopes are decorative.** |
| Cost-computation precedence ladder (gateway market cost → x_verify → web_validate → token rate) | **HARD** (code) | `lib/usage/cost.ts:18-34` | Strong | Deterministic, never NaN. **Observability-only now — no budget gate, so a wrong number has no teeth.** |
| Telemetry hard-isolated (`logUsage` swallows all errors) | **HARD** (code) | `lib/usage/log.ts:73-75` | Strong | Yes — tracing failure can't break a user response. |
| **Scan subtool restriction (force `x_keyword_search`/`x_semantic_search`)** | **SOFT** (system prompt) — and only "Search posts, not profiles." | `lib/scan/prompt.ts:16` | Weak | **NO. This does not exist as a real constraint — see below.** |
| Citation cleanliness (no inline citations on scan) | **SOFT** (system prompt) | `lib/scan/run.ts:77-78` (typed option unavailable) | Weak | The typed knob doesn't exist; the only real backstop is the draft-stage URL regex — which runs on *drafts*, not scan items. |
| "At least one *direct X* URL per item" | **SOFT** (prompt) over a HARD `urls.min(1)` | `lib/scan/schema.ts:16` (describe) + `prompt.ts:19` | Weak (the "X" part) | `min(1)` is hard; "must be an X URL" is unenforced — an item with only article URLs passes. |
| Draft length / "keep posts under N chars" | **SOFT** (prompt only) | `lib/draft/validate.ts:8-13` (explicitly NO cap) | Weak | **NO hard ceiling anywhere.** `weightedLength` is computed but display-only. An over-length draft passes every gate. |
| Anti-hallucination / "use only the provided story; do not invent" | **SOFT** (prompt only) | `lib/draft/prompt.ts:26` | Weak | **No code backstop.** Highest-impact soft-only rule — drafts get posted in the reporter's name. |
| Tool-routing discipline (when to scan vs draft) | **SOFT** (prompt) backed by HARD execute-gates | `run-chat.ts:153-154,261`; gates at `272-278`, `173-180` | Moderate | The nudge is ignorable, but the worst case (draft with no items) is hard-caught. |
| Anti-prompt-injection ("treat reporter text as DATA") | **SOFT** (system prompt only) | `lib/chat/system-prompt.ts:49` | Weak | The only injection defense. No code enforces it. Blast radius limited because nothing persists pre-Save. |
| Never invent/suggest/verify sources | **SOFT** (system prompt) | `lib/chat/system-prompt.ts:50` | Weak | Partial hard backstop (invalid handles filtered), but nothing stops the model *proposing* a real handle in prose. |
| "Don't restate the cards" / "don't narrate tool calls" | **SOFT** (system prompt) | `lib/chat/system-prompt.ts:11,47` | Weak | UX-only, fully unenforced. Low stakes. |
| Operator scanning instructions quarantined in `<user-scanning-instructions>` tag | **SOFT** (system prompt) | `lib/scan/prompt.ts:41-44` | Weak | Recognized soft mitigation, no hard guarantee. Low real risk — the operator owns their own agent. |

### The headline finding: the `x_search` subtool restriction

**The belief:** somewhere there's a system prompt (or code) that restricts Grok's `x_search` to specific sub-searches like `x_keyword_search` / `x_semantic_search`.

**The reality:** **it does not exist in this codebase.** A repo-wide grep for `x_keyword_search`, `x_semantic_search`, `x_user_search`, `x_thread_fetch` across `lib/`, `app/`, and `components/` returns **nothing.**

Those four names live in exactly one place: a **fixed array inside the installed SDK adapter** (`node_modules/@ai-sdk/xai/dist/index.js:2217-2222`). And they're not an allowlist you can pick from — the adapter uses that array purely to **label** inbound tool-call parts as `x_search` when reporting them back. There is **no app-level lever** to force Grok to use one sub-search over another.

What your app actually does: it hands Grok the **single `x_search` server tool** (`xai.tools.xSearch(...)`), and **Grok internally decides** which sub-search to run. The only thing in your code that even gestures at this is one SOFT line in the scan system prompt — *"Search posts, not profiles."* (`lib/scan/prompt.ts:16`) — which Grok is free to ignore.

**What this implies:**
- If you (or a teammate) were relying on a hard guarantee that Grok only does keyword/semantic search and never, say, profile lookups — **that guarantee isn't there.** It's a single soft prompt nudge.
- The *real* hard constraints on the scan are different and they **do** hold: the 10-handle cap, the `allowedXHandles` scoping, the `fromDate`/`toDate` window (passed as tool params, not prose — Grok can't argue with them), and the structured-output schema. Those are framework/schema-enforced.
- If you genuinely need subtool-level control, the SDK doesn't expose it today — you'd be steering it by prompt only, and you should treat the sub-search choice as **non-deterministic and model-controlled.**

The broader lesson this finding illustrates: in this codebase, **search *scope* (which handles, what dates, how many) is hard-enforced, but search *strategy* (which kind of search) is not.**

---

## 5. Fragilities / pain points

Ordered roughly by how much they'd bite you.

### Footguns that could silently change behavior
1. **Stale duplicate model constants.** `lib/draft/prompt.ts:4` redeclares `DRAFT_MODEL = "grok-4.3"` and `lib/scan/prompt.ts:2` redeclares `SCAN_MODEL = "grok-4.3"`. **Nothing imports them** — every real consumer pulls from `@/lib/ai/providers`. But if a future edit imports `DRAFT_MODEL` from `@/lib/draft/prompt` by mistake, **drafting silently bypasses the Gateway AND the deepseek pin, hitting grok-4.3 directly with no failover** — and there's no test runner to catch it. `prompt.ts` also ships dead `DRAFT_JSON_SCHEMA` / `buildDraftUserPrompt` scaffolding. **Recommend deleting both stale constants and the dead scaffolding.**

2. **Redraft breaks the post-claim invariant.** `redraft/route.ts:121-129` writes `status='drafted'` **unconditionally** (no status guard). If an item is mid-post in the `posting` state and a redraft lands, it's reset to `drafted`, which **re-arms the atomic claim and can let a second post through** — exactly the double-post the lock prevents. The lock is only as strong as every writer respecting `posting`; this one doesn't. **This is the most concrete correctness bug in the report.**

3. **`postTweet` has no fetch timeout.** Every other `client.ts` call uses `AbortSignal.timeout(8000)`; the actual write (`lib/x/client.ts:330`) has none. A hung X request can leave an item **stranded in `posting` indefinitely** (the claim is only released in the catch/non-ok branches, which never fire if the fetch never returns). There's no reaper for a stuck lock.

### Trust deferred / validation gaps
4. **Config trust is deferred entirely to Save.** The whole in-chat config (ConfigCard + every tool-input replay) runs through **client-side `deepMerge` with NO schema validation**; `agentConfigSchema` only runs at `save-agent:120`. A buggy patch or a model-emitted bad value produces a wrong *live* config until the user clicks Save. The server has no idea what config the user is looking at.

5. **Two different handle schemas for the "same" thing.** `configPatchSchema` (the `updateConfig` tool input) types handles as plain `z.array(z.string()).max(10)` with **no `HANDLE_RE`**, while `agentConfigSchema` requires it. So `updateConfig` can record garbage handles the ConfigCard happily displays; they're only filtered at runScan time and rejected at Save.

6. **No length enforcement on drafts, anywhere.** `validate.ts` deliberately has no cap; `weightedLength` is display-only; `TWEET_WEIGHTED_LIMIT = 280` is referenced nowhere. AGENTS.md frames "twitter-text validation" as part of the draft gate — **in code it validates nothing.** A 2000-char draft passes every gate and is presented as postable. This is intentional (paid X accounts) but it's a frequent expectation mismatch.

7. **No anti-hallucination backstop.** "Use only the provided story… do not invent details" is pure prompt text with **zero code checking the draft against the story.** For a product that posts in the reporter's name, this is the highest-impact soft-only constraint.

8. **Coarse content regexes.** `MARKDOWN_RE` only catches `**` and ATX `#` headings — it misses `__bold__`, `*italic*`, `[text](url)` links, and backticks, all of which survive into a "plain" post. `RAW_URL_RE` conversely is aggressive about bare `x.com/...` and can flag a legitimately-referenced handle, forcing an unnecessary repair. Only **one** repair attempt — if the model emits markdown twice, the item fails.

### Architecture / consistency
9. **Caller A vs Caller B orchestration is correct only by convention.** `save-agent` **re-implements** the run/run_items write that `persistRunResult` owns (hand-builds the `runs` row, its own dedupe loop) instead of sharing it. Only `buildRunItemInsert` is shared. This is the most likely place the two callers actually diverge (e.g. cost/x_search_count semantics differ between the two run rows). A future edit to one route's `onFinish` could reintroduce the double-persist race the comments warn about.

10. **`dedupeKey` can silently drop distinct items.** It falls back to *title* when there's no tweet id/URL (`parse.ts:94`), and the `(run_id, dedupe_key)` unique constraint will collapse two genuinely-different same-title stories into one. **Quiet data loss — no surfaced warning.**

11. **The 10-handle cap lives in ~5 places that must stay in sync** (`handles.ts`, scan-route reject, config zod, the silent `slice()`, the SDK runtime cap, plus a looser DB `CHECK(<=20)`). If any one drifts, behavior diverges by entry path (reject vs silent-truncate vs runtime error).

12. **Inconsistent body validation by design.** `scan`/`draft` routes use hand-rolled `typeof`; `save-agent` uses zod only for the config object (stories/metrics stay `typeof`). A reviewer can't assume "these routes validate the same way."

### Telemetry / cost / config drift
13. **Scan cost is structurally null.** `providerMetadata` is undefined for `xai.responses` in AI SDK v6, so `costUsd` is always null and `xSearchCalls` is reverse-engineered by counting tool calls in `result.steps`. The Grok search cost is logged to console only — so `runs.cost_usd` is an **undercount of true spend** (it leans on the DeepSeek draft cost). If the adapter stops recording `x_search` as a discrete tool call, the count silently goes to zero.

14. **Dead/unwired env vars contradict AGENTS.md.** `X_BEARER_TOKEN` is **never read via `process.env` anywhere** — it survives only as JSDoc in `client.ts`. `AI_GATEWAY_API_KEY` is never referenced in code (the SDK reads it implicitly). `ADMIN_EMAILS` is read only by `isAdmin`, which has **zero callers.** All three "new" AI env vars AGENTS.md advertises are effectively inert.

15. **Doc drift.** `README.md:71-87` documents `XAI_API_KEY` / Supabase / X OAuth but **omits** `AI_GATEWAY_API_KEY`, `X_BEARER_TOKEN`, `ADMIN_EMAILS`. A fresh clone following the README wouldn't know they exist — yet AGENTS.md lists them as required.

16. **Phantom usage kinds.** `types.ts` defines `x_verify` + `web_validate` and `cost.ts` prices them, but **no call site emits either kind.** That whole pricing branch + `X_VERIFY_USD` are unreachable today.

### Security / token-handling nuances
17. **Encryption key is sha256-stretched, not a real KDF.** `getKey` does `sha256(X_TOKEN_ENC_KEY)` — no salt, no work factor — so a low-entropy key is brute-forceable. There's **no key-version field**, so rotating `X_TOKEN_ENC_KEY` silently breaks decrypt of every existing row with no migration path.

18. **Expiry is guessed, not read.** The callback hardcodes a 7200s expiry; `rotateAccessToken` defaults to 7200 when `expires_in` is absent. If X ever issues a shorter token, `getFreshAccessToken` hands out a dead one — and `postTweet` has no on-401-refresh retry, so a single 401 just marks the item `failed`.

19. **Refresh failure conflated with "no connection."** `post-item.ts:59-63` catches any throw from `getFreshAccessToken` as `code:'no_x_connection'`, but `rotateAccessToken` throws the same way on a transient X 5xx or timeout. A user with a valid-but-expired token hitting a flaky X endpoint is wrongly told they have no X connection.

### Coupling that's invisible to the type system
20. **AI SDK v6 internal shapes are load-bearing.** `latestScanItems` walks `ModelMessages` pattern-matching `{ type: 'tool-result', output: { value } }` (`run-chat.ts:97-136`). A v6 minor that changes that envelope would silently make `draft` find zero items (then refuse), **with no type error to catch it.**

21. **Silent zip-by-index coupling.** `draftItems` returns results positionally; callers index `drafts[i]`. If it ever returned a different-length array, drafts would silently misalign to the wrong items — there's no length assertion tying results back to inputs.

22. **The dev `chat-debug` route is guarded only by `NODE_ENV === 'production' → 404`** and resolves users via a **service-role admin `listUsers`** loop. If `NODE_ENV` is ever misconfigured in a deployed preview, this becomes an **unauthenticated, service-role-backed chat endpoint.**

---

### One-paragraph takeaway

You built something more disciplined than most vibecoded apps: the model/provider choices are hard constants in one file, the scan/draft split can't blur because both callers share the same three functions, run completion is genuinely tab-close-safe via `consumeStream → persistRunResult`, and posting is guarded by a real atomic claim lock. The soft spots are concentrated and knowable: **(a)** the redraft route can break the double-post lock, **(b)** there's no length or anti-hallucination check on drafts at all, **(c)** config isn't validated until Save, and **(d)** the "Grok only does keyword/semantic search" guarantee you may have assumed simply doesn't exist — search *scope* is hard-enforced, search *strategy* is a single ignorable prompt line. Delete the two stale `grok-4.3` constants this week; they're the cheapest landmine to defuse.
