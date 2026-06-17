# Chat connect-X flow + grounded suggestions + token-backed voice reads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reliable, rough chat-first agent-creation flow to `main` where suggestions are grounded (never from model memory), voice reads use the user's X token (protected-but-followed tweets resolve), and connecting X is optional/contextual — end-to-end through Save Agent → run, with minimal hanging.

**Architecture:** The chat model stays `deepseek` via Gateway, but source suggestions are grounded by a new `lib/chat/discover.ts` that makes a small **direct `grok-4.3` + xSearch/webSearch** call (the scan's provider) and returns structured candidates the model must verify before presenting. Voice-read tools (`fetchExampleTweets`, `fetchMyRecentPosts`) authenticate with the connected user's auto-refreshed OAuth token (`getFreshAccessToken`) instead of the app-only bearer. Connecting X is surfaced as an optional bar above the composer that force-saves the session and round-trips through OAuth back to the same (persisted) session.

**Tech Stack:** Next.js App Router (TS strict), AI SDK v6 (`streamText`, `Output.object`, `xai.responses` + `xai.tools.xSearch`/`webSearch`), Supabase (RLS + service role), X API v2 (OAuth2 user-context). **No test runner in this repo** — the verification gate is `pnpm build` (type-check) + the `/api/agents/chat-debug` subagent harness + a manual flow checklist (per AGENTS.md).

---

## Verification model (read first)

This repo has **no unit-test runner**. Every task's verification step is therefore one or more of:
- **`pnpm build`** — authoritative type-check + route compile. Must exit 0. (Mid-edit LSP "cannot find module"/"unused" diagnostics are often stale; trust a clean build.)
- **chat-debug subagent** — POST turns to `http://localhost:3000/api/agents/chat-debug` (see `.claude/skills/chat-debug`) to exercise the model's tool-use/logic.
- **manual** — the dev (or a browser-agent) walks the UI.

Do **not** touch `biome.json`. Do **not** use `git add -A`/`-u` — stage explicit paths.

## File structure

| File | Responsibility | Action |
|---|---|---|
| `lib/x/syndication.ts` | Fetch tweet text by URL; prefer user token | Modify |
| `lib/x/timeline.ts` | Fetch user's recent posts; prefer user token | Modify |
| `lib/x/link-identity.ts` | OAuth connect; explicit scopes | Modify |
| `lib/chat/discover.ts` | Grounded grok+search handle/site discovery | **Create** |
| `lib/chat/tools.ts` | Tool defs; token-aware factories; discover tools | Modify |
| `lib/chat/run-chat.ts` | Assemble tools; step budget; thread token | Modify |
| `lib/chat/system-prompt.ts` | Discover-before-suggest rule; connect/voice/protected copy | Modify |
| `app/api/agents/chat/route.ts` | Fetch fresh access token → xConnection | Modify |
| `app/api/agents/chat-debug/route.ts` | Same, via service role | Modify |
| `components/agents/agent-chat.tsx` | Connect bar + force-save; (recent empty-state already done) | Modify |
| `components/agents/chat-message-row.tsx` | Discover thinking-labels | Modify |
| `components/agents/result-chips.tsx` | "protected · coming soon" note | Modify |

---

## Task 1: X read modules accept the user's OAuth token

**Files:**
- Modify: `lib/x/syndication.ts`
- Modify: `lib/x/timeline.ts`

`lib/x/client.ts` needs **no change** — `getTweetsByIds`/`getUserTweets`/`getUserByUsername` already send whatever token they're given as `Authorization: Bearer …`; a user OAuth token is accepted identically and (with `tweet.read`) unlocks protected-but-visible content.

- [ ] **Step 1: `syndication.ts` — accept a user token, prefer it over the app bearer**

In `lib/x/syndication.ts`, change the `fetchExampleTweets` signature and the primary-lookup block.

Signature (line ~56):
```ts
export async function fetchExampleTweets(
  urls: string[],
  userToken?: string | null,
): Promise<{
  fetched: {
    url: string;
    text: string;
  }[];
  failed: string[];
}> {
```

Primary-lookup block (replace the `const bearer = process.env.X_BEARER_TOKEN;` block, lines ~74-90):
```ts
  // --- Primary: X API v2 batch lookup (≤100 ids per call). ---
  // Prefer the connected user's OAuth token: with tweet.read it sees everything
  // they can view, including protected accounts they follow. Fall back to the
  // app-only bearer (public reads) when no user token is available. Either is
  // sent as a normal Bearer credential on /2/tweets.
  const textById = new Map<string, string>();
  const token = userToken ?? process.env.X_BEARER_TOKEN ?? null;
  if (token && withId.length > 0) {
    try {
      const ids = [...new Set(withId.map((p) => p.id))];
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const result = await getTweetsByIds(token, batch);
        if (result.ok) {
          for (const t of result.tweets) textById.set(t.id, t.text);
        }
      }
    } catch {
      // Fall through to syndication for everything below.
    }
  }
```

- [ ] **Step 2: `timeline.ts` — accept an access token, prefer it**

In `lib/x/timeline.ts`, change the `fetchRecentPosts` input type and token selection.

Input type (line ~34):
```ts
export async function fetchRecentPosts(input: {
  xUserId?: string | null;
  username?: string | null;
  accessToken?: string | null;
}): Promise<RecentPostsResult> {
```

Token selection (replace the `const bearer = process.env.X_BEARER_TOKEN; if (!bearer) {…}` block and the two `getUserByUsername(bearer,…)` / `getUserTweets(bearer,…)` calls, lines ~40-70):
```ts
  const username = input.username ?? null;

  try {
    // Prefer the user's OAuth token (covers their OWN protected account and
    // protected accounts they follow); fall back to the app-only bearer.
    const token = input.accessToken ?? process.env.X_BEARER_TOKEN ?? null;
    if (!token) {
      return {
        ok: false,
        posts: [],
        username,
        error: "X API token is not configured.",
      };
    }

    // --- Resolve the X user id. ---
    let userId = input.xUserId ?? null;
    if (!userId) {
      if (!username) {
        return {
          ok: false,
          posts: [],
          username,
          error: "No X account identity available.",
        };
      }
      const resolved = await getUserByUsername(token, username);
      if (!resolved.ok) {
        return { ok: false, posts: [], username, error: resolved.error };
      }
      userId = resolved.id;
    }

    // --- Read the user's recent original posts. ---
    const result = await getUserTweets(token, userId, FETCH_SIZE);
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: exit 0, route table prints. (Callers still pass one arg — the new params are optional, so this compiles before Task 2 wires the token.)

- [ ] **Step 4: Commit**

```bash
git add lib/x/syndication.ts lib/x/timeline.ts
git commit -m "feat(x): tweet reads accept the user's OAuth token (prefer over app bearer)"
```

---

## Task 2: Thread the user token through tools, run-chat, and both chat routes

**Files:**
- Modify: `lib/chat/tools.ts`
- Modify: `lib/chat/run-chat.ts`
- Modify: `app/api/agents/chat/route.ts`
- Modify: `app/api/agents/chat-debug/route.ts`
- Modify: `lib/x/link-identity.ts`

- [ ] **Step 1: `tools.ts` — add `accessToken`, make `fetchExampleTweets` a factory, pass token to `fetchMyRecentPosts`**

Add to `XConnectionContext` (after `xUserId`):
```ts
  /** The user's fresh OAuth access token (server-only). Enables protected reads. */
  accessToken?: string | null;
```

Replace the static `fetchExampleTweetsTool` const (lines ~115-122) with a factory:
```ts
/**
 * SERVER tool factory — `fetchExampleTweets`. Closes over the connected user's
 * OAuth token so a pasted tweet URL from a protected account they FOLLOW resolves
 * (tweet.read sees everything the user can view). Falls back to the app bearer /
 * syndication for public reads when no token is present. Non-throwing.
 */
export function buildFetchExampleTweetsTool(xConnection: XConnectionContext | undefined) {
  return tool({
    description:
      "Fetch the text of example tweets by URL so they can be stored as drafting style references. Call this when the user provides X/Twitter post URLs as voice examples.",
    inputSchema: z.object({
      urls: z.array(z.string()),
    }),
    execute: async (input) => fetchExampleTweets(input.urls, xConnection?.accessToken ?? null),
  });
}
```

In `buildFetchMyRecentPostsTool`, pass the token (the `return fetchRecentPosts({…})` call):
```ts
      return fetchRecentPosts({
        xUserId: xConnection.xUserId ?? null,
        username: xConnection.username,
        accessToken: xConnection.accessToken ?? null,
      });
```

Update the exported `configTools` (drop `fetchExampleTweets` — it's per-request now):
```ts
export const configTools = {
  setAgentConfig,
  verifyHandles: verifyHandlesTool,
  validateSites: validateSitesTool,
};
```

- [ ] **Step 2: `run-chat.ts` — build the per-request `fetchExampleTweets` and bump the step budget**

Update the tools import:
```ts
import {
  buildFetchExampleTweetsTool,
  buildFetchMyRecentPostsTool,
  configTools,
  type XConnectionContext,
} from "@/lib/chat/tools";
```

After the `fetchMyRecentPosts` line (~94), add:
```ts
  // Request-scoped tool — closes over the user's OAuth token so pasted protected
  // URLs resolve when connected (public/syndication fallback otherwise).
  const fetchExampleTweets = buildFetchExampleTweetsTool(xConnection);
```

Add `fetchExampleTweets` to BOTH tool-map branches (the `autoResolveClientTools` ternary, ~181-196):
```ts
  const tools = autoResolveClientTools
    ? {
        ...configTools,
        setAgentConfig: tool({
          description: configTools.setAgentConfig.description,
          inputSchema: configTools.setAgentConfig.inputSchema,
          execute: async () => ({ ok: true }),
        }),
        fetchExampleTweets,
        fetchMyRecentPosts,
        runScan,
      }
    : {
        ...configTools,
        fetchExampleTweets,
        fetchMyRecentPosts,
        runScan,
      };
```

Change the stop condition (~203) for discover→verify headroom:
```ts
    stopWhen: stepCountIs(10),
```

- [ ] **Step 3: `chat/route.ts` — fetch a fresh access token when connected**

Add import:
```ts
import { getFreshAccessToken } from "@/lib/x/tokens";
```

Replace the `xConnection` construction block (~100-108):
```ts
  const { data: xConn } = await supabase
    .from("x_connections")
    .select("x_username, x_user_id")
    .maybeSingle<{ x_username: string; x_user_id: string }>();
  // When connected, get a fresh (auto-refreshed) access token so tweet reads can
  // run AS the user (protected-but-followed visible). Never break the chat on a
  // token failure — fall back to no token (public/app-bearer reads).
  let accessToken: string | null = null;
  if (xConn) {
    try {
      accessToken = await getFreshAccessToken(supabase, user.id);
    } catch (err) {
      console.warn("getFreshAccessToken (chat) failed", err);
    }
  }
  const xConnection = {
    connected: Boolean(xConn),
    username: xConn?.x_username ?? null,
    xUserId: xConn?.x_user_id ?? null,
    accessToken,
  };
```

- [ ] **Step 4: `chat-debug/route.ts` — same, via the service-role client**

Add import:
```ts
import { getFreshAccessToken } from "@/lib/x/tokens";
```

Replace the `xConnection` block (~121-130):
```ts
  const serviceClient = createServiceRoleClient();
  const { data: xConn } = await serviceClient
    .from("x_connections")
    .select("x_username, x_user_id")
    .eq("user_id", userId)
    .maybeSingle<{ x_username: string; x_user_id: string }>();
  // Mirror production: fetch a fresh user token so protected reads behave the same
  // in the debug harness. Service-role bypasses RLS; getFreshAccessToken scopes by
  // user_id and persists any rotation. Best-effort — never break the run.
  let accessToken: string | null = null;
  if (xConn) {
    try {
      accessToken = await getFreshAccessToken(serviceClient, userId);
    } catch (err) {
      console.warn("getFreshAccessToken (debug) failed", err);
    }
  }
  const xConnection = {
    connected: Boolean(xConn),
    username: xConn?.x_username ?? null,
    xUserId: xConn?.x_user_id ?? null,
    accessToken,
  };
```

- [ ] **Step 5: `link-identity.ts` — make scopes explicit**

Change the `scopes` line (~40):
```ts
      scopes: "tweet.read tweet.write users.read offline.access",
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: exit 0. (Confirms the factory swap + token threading type-check.)

- [ ] **Step 7: Commit**

```bash
git add lib/chat/tools.ts lib/chat/run-chat.ts app/api/agents/chat/route.ts app/api/agents/chat-debug/route.ts lib/x/link-identity.ts
git commit -m "feat(chat): voice reads authenticate as the connected user (protected URLs/own posts)"
```

---

## Task 3: Grounded discovery module

**Files:**
- Create: `lib/chat/discover.ts`

- [ ] **Step 1: Create `lib/chat/discover.ts`**

```ts
// Grounded source discovery for the agent-setup chat.
//
// The chat model (deepseek via Gateway) has no search grounding, so asked to
// suggest X handles or news sites it would invent plausible-but-arbitrary picks
// from training memory (the "FC Barcelona accounts from nowhere" bug). These
// helpers ground suggestions in REAL, current data via a small direct grok-4.3 +
// xSearch/webSearch call (the scan's provider) and return structured candidates;
// callers verify/validate before presenting. Non-throwing: any failure returns []
// so the chat never hangs.

import { Output, type ToolSet, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { SCAN_MODEL, xai } from "@/lib/ai/providers";
import { extractMetrics } from "@/lib/scan/ui-stream";
import { logUsage } from "@/lib/usage/log";

export interface DiscoveredHandle {
  handle: string;
  name: string;
  why: string;
}

export interface DiscoveredSite {
  domain: string;
  name: string;
  why: string;
}

const handlesSchema = z.object({
  handles: z
    .array(
      z.object({
        handle: z.string().describe("Exact X username, no leading @"),
        name: z.string().describe("Account display name"),
        why: z.string().describe("One short phrase: why it fits the beat"),
      }),
    )
    .max(12),
});

const sitesSchema = z.object({
  sites: z
    .array(
      z.object({
        domain: z.string().describe("Bare domain, e.g. theathletic.com"),
        name: z.string().describe("Publication name"),
        why: z.string().describe("One short phrase: why it fits the beat"),
      }),
    )
    .max(8),
});

const HANDLES_SYSTEM =
  "You find real, currently-active X (Twitter) accounts a reporter should follow for a given beat. " +
  "Use the x_search tool to ground EVERY suggestion in accounts that actually appear in search results. " +
  "Only return accounts that genuinely exist and are active. Never invent handles.";

const SITES_SYSTEM =
  "You find real, reputable news websites a reporter should monitor for a given beat. " +
  "Use the web_search tool to ground EVERY suggestion in sites that actually appear in search results. " +
  "Only return sites that genuinely exist. Never invent domains.";

/**
 * Discover real, active X handles for a beat. Non-throwing; [] on failure.
 * Returned handles are UNVERIFIED — the caller runs verifyHandles before showing them.
 */
export async function discoverHandles(topic: string): Promise<DiscoveredHandle[]> {
  const startedAt = Date.now();
  try {
    const tools: ToolSet = {} as ToolSet;
    (tools as Record<string, unknown>).x_search = xai.tools.xSearch({});

    const result = streamText({
      model: xai.responses(SCAN_MODEL),
      system: HANDLES_SYSTEM,
      prompt: `Beat: ${topic}\n\nReturn up to 10 real, active X accounts most worth following for this beat.`,
      tools,
      stopWhen: stepCountIs(4),
      temperature: 0,
      maxOutputTokens: 8000,
      output: Output.object({ schema: handlesSchema }),
      providerOptions: { xai: { reasoningEffort: "low" } },
    });

    const [output, metrics] = await Promise.all([
      result.output,
      extractMetrics(result, startedAt),
    ]);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      model: SCAN_MODEL,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        purpose: "discover_handles",
        elapsedMs: metrics.elapsedMs,
        found: output?.handles?.length ?? 0,
      },
    });

    return output?.handles ?? [];
  } catch (err) {
    console.error("discoverHandles failed", err);
    return [];
  }
}

/**
 * Discover real news sites for a beat. Non-throwing; [] on failure.
 * Returned domains are UNVALIDATED — the caller runs validateSites before showing them.
 */
export async function discoverSites(topic: string): Promise<DiscoveredSite[]> {
  const startedAt = Date.now();
  try {
    const tools: ToolSet = {} as ToolSet;
    (tools as Record<string, unknown>).web_search = xai.tools.webSearch({});

    const result = streamText({
      model: xai.responses(SCAN_MODEL),
      system: SITES_SYSTEM,
      prompt: `Beat: ${topic}\n\nReturn up to 5 real, reputable news sites most worth monitoring for this beat.`,
      tools,
      stopWhen: stepCountIs(4),
      temperature: 0,
      maxOutputTokens: 8000,
      output: Output.object({ schema: sitesSchema }),
      providerOptions: { xai: { reasoningEffort: "low" } },
    });

    const [output, metrics] = await Promise.all([
      result.output,
      extractMetrics(result, startedAt),
    ]);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      model: SCAN_MODEL,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        purpose: "discover_sites",
        elapsedMs: metrics.elapsedMs,
        found: output?.sites?.length ?? 0,
      },
    });

    return output?.sites ?? [];
  } catch (err) {
    console.error("discoverSites failed", err);
    return [];
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: exit 0. (The `tools` cast mirrors `lib/scan/run.ts`; `extractMetrics` + `logUsage` signatures match.)

- [ ] **Step 3: Commit**

```bash
git add lib/chat/discover.ts
git commit -m "feat(chat): grounded grok+search discovery for handles/sites"
```

---

## Task 4: Wire discovery into tools, the system prompt, and thinking-labels

**Files:**
- Modify: `lib/chat/tools.ts`
- Modify: `lib/chat/system-prompt.ts`
- Modify: `components/agents/chat-message-row.tsx`

- [ ] **Step 1: `tools.ts` — register discover tools**

Add imports (top of file):
```ts
import { discoverHandles, discoverSites } from "@/lib/chat/discover";
```

Add the two tools (after `validateSitesTool`):
```ts
const discoverHandlesTool = tool({
  description:
    "Find REAL, currently-active X accounts to follow for a beat/topic. You MUST call this whenever you suggest handles — never propose handles from your own knowledge. Returns unverified candidates; verify them with verifyHandles before presenting.",
  inputSchema: z.object({
    topic: z.string().describe("The reporter's beat/topic in plain language"),
  }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "discoverHandles" }, async () => ({
      handles: await discoverHandles(input.topic),
    })),
});

const discoverSitesTool = tool({
  description:
    "Find REAL, reputable news sites to monitor for a beat/topic. You MUST call this whenever you suggest sites — never propose domains from your own knowledge. Returns unvalidated candidates; validate them with validateSites before presenting.",
  inputSchema: z.object({
    topic: z.string().describe("The reporter's beat/topic in plain language"),
  }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "discoverSites" }, async () => ({
      sites: await discoverSites(input.topic),
    })),
});
```

Add them to `configTools`:
```ts
export const configTools = {
  setAgentConfig,
  verifyHandles: verifyHandlesTool,
  validateSites: validateSitesTool,
  discoverHandles: discoverHandlesTool,
  discoverSites: discoverSitesTool,
};
```

- [ ] **Step 2: `system-prompt.ts` — mandate discover-before-suggest**

In the X-sources sub-bullet (the "If the user asks you to suggest handles" line, ~19), replace with:
```
     - If the user asks you to suggest handles (e.g. "I don't know which to follow"): you MUST FIRST call \`discoverHandles\` with their beat — it returns real, currently-active accounts grounded in live search. NEVER propose handles from your own knowledge. Then call \`verifyHandles\` on the discovered handles and present ONLY the confirmed ones as a clean recommendation (at most 10), with a brief note if any were dropped. Do not narrate the discovery/verification steps.
```

In the web-sources sub-bullet (the "If the user asks you to suggest sites" line, ~21), replace with:
```
     - If the user asks you to suggest sites (e.g. "what sites should I add?"): you MUST FIRST call \`discoverSites\` with their beat — it returns real news sites grounded in live search. NEVER propose domains from your own knowledge. Then call \`validateSites\` on the discovered domains and present ONLY the reachable ones (at most 5), with a brief note if any were dropped. Do not narrate the discovery/validation steps.
```

In the "## Calling tools" section, add two bullets (after the validateSites bullet, ~30):
```
- Call \`discoverHandles\` BEFORE suggesting any X handles, and \`discoverSites\` BEFORE suggesting any sites. You do not know which accounts/sites are real and current from memory — always discover first, then verify/validate, then present only confirmed results.
```

- [ ] **Step 3: `chat-message-row.tsx` — add thinking-labels for discover tools**

In `TOOL_LABELS` (~51-58), add two entries:
```ts
  discoverHandles: "Searched X for accounts",
  discoverSites: "Searched the web for sites",
```
(No output rendering needed — discover results are thinking-only; the visible result is the VerifyChips/SiteChips after verify/validate. Unknown-tool outputs already return null.)

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 5: chat-debug grounding check**

Ensure the dev server is running (`pnpm dev`). Dispatch a chat-debug subagent (per `.claude/skills/chat-debug`) with this script and report the transcript:
1. `{ "sessionId": "plan-t4", "reset": true, "userMessage": "I cover FC Barcelona transfer news" }`
2. `{ "sessionId": "plan-t4", "userMessage": "watch X. I don't know which accounts — suggest some" }`

Expected: the turn's `toolCalls` include `discoverHandles` **then** `verifyHandles`; the presented handles come from the discovered set (not arbitrary memory). If `discoverHandles` is absent, the prompt rule needs strengthening — fix and re-run before commit.

- [ ] **Step 6: Commit**

```bash
git add lib/chat/tools.ts lib/chat/system-prompt.ts components/agents/chat-message-row.tsx
git commit -m "feat(chat): suggestions must come from grounded discovery, not model memory"
```

---

## Task 5: Connect-X flow (UX) + connect/voice/protected copy + protected chip note

**Files:**
- Modify: `components/agents/agent-chat.tsx`
- Modify: `lib/chat/system-prompt.ts`
- Modify: `components/agents/result-chips.tsx`

Note: the **Recent empty-state** is already implemented in `agent-chat.tsx` (uncommitted in the working tree); it's committed here with the connect bar.

- [ ] **Step 1: `agent-chat.tsx` — add `handleConnectX` (force-save then OAuth round-trip)**

After `handleDraftChange` (~358-363), add:
```ts
  // Connect X mid-chat: force-save the session first so the conversation survives
  // the OAuth redirect, then return to THIS session (?session=) once connected.
  const handleConnectX = useCallback(async () => {
    try {
      await fetch("/api/agents/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, messages }),
      });
    } catch {
      // Non-blocking — the save effect will retry on the next idle turn.
    }
    startXConnect(`/dashboard/agents/new?session=${sessionIdRef.current}`).catch(
      (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not start X connection.");
      },
    );
  }, [messages]);
```

- [ ] **Step 2: `agent-chat.tsx` — render the connect bar above the composer**

In the Wide layout block, insert the bar between `{actionBar}` and `{composer}` (~688-691):
```tsx
          <div className="agent-chat-col">{messageList}</div>
          {actionBar}
          {!xConnected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                maxWidth: 760,
                margin: "0 auto 10px",
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid oklch(0.6 0.19 262 / 0.25)",
                background: "oklch(0.6 0.19 262 / 0.06)",
              }}
            >
              <span style={{ color: "var(--faint)", font: "400 0.8125rem/1.35 var(--font-sans)" }}>
                Connect your X account to post drafts and use your own posts as writing samples.
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleConnectX}
                style={{ flexShrink: 0 }}
              >
                Connect X
              </button>
            </div>
          )}
          {composer}
```

- [ ] **Step 3: `system-prompt.ts` — connect/voice + protected copy**

Replace the voice step (step 3, ~22) tail so the disconnected path points at the button:
```
3. **Voice and examples (optional)** — In plain prose, offer the reporter ways to capture their voice. If their X account is already connected (see the note appended below, if any), LEAD with offering to pull their recent posts automatically via \`fetchMyRecentPosts\`. If X is NOT connected, offer: connect X (tell them to use the "Connect X" button above the message box) to pull their recent posts, paste tweet URLs (their own or anyone's whose style they like — including accounts they follow privately, once connected), or skip. When they provide tweet URLs, call \`fetchExampleTweets\` immediately; when they ask to pull their recent posts and X is connected, call \`fetchMyRecentPosts\`, then store the returned texts via \`setAgentConfig\`. Connecting X is optional — it is only needed to post drafts and to read your own/protected posts, never to configure or run the agent.
```

In the X-sources handle bullet (~18), append a protected note after the verify instruction:
```
 If any confirmed handle is protected, tell the user that monitoring protected accounts is coming soon, so for now you'll watch the public ones — but still keep it in the config.
```

- [ ] **Step 4: `result-chips.tsx` — "protected · coming soon" note on protected handles**

In `VerifyChips`, change the valid-handle chip (~31-39) to surface the protected flag:
```tsx
      {valid.map((h) => (
        <span key={h.username} className="rchip rchip-ok">
          <span className="rchip-icon" aria-hidden="true">
            ✓
          </span>
          @{h.username}
          {h.name ? <span className="rchip-sub">{h.name}</span> : null}
          {h.protected ? <span className="rchip-sub">protected · monitoring soon</span> : null}
        </span>
      ))}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/agents/agent-chat.tsx lib/chat/system-prompt.ts components/agents/result-chips.tsx
git commit -m "feat(chat): optional Connect-X bar (mid-chat round-trip) + protected-handle note; Recent empty-state"
```

---

## Task 6: End-to-end verification + manual checklist

**Files:** none (verification only).

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: exit 0, full route table.

- [ ] **Step 2: chat-debug end-to-end (logic)**

With `pnpm dev` running, dispatch a chat-debug subagent through the happy path and report:
1. `{ "sessionId": "plan-e2e", "reset": true, "userMessage": "I cover Premier League injury news" }`
2. `{ "sessionId": "plan-e2e", "userMessage": "watch X; suggest accounts" }` → expect discoverHandles → verifyHandles.
3. `{ "sessionId": "plan-e2e", "userMessage": "use those. Pull my recent posts for voice" }` → expect fetchMyRecentPosts returns posts (user `farzanmrz@gmail.com` is connected) OR a clean not-connected message.
4. `{ "sessionId": "plan-e2e", "userMessage": "scan hourly, weekdays, Europe/London. Name it whatever fits, then show drafts" }` → expect timezone confirm then runScan returning stories.

Expected: no turn hangs; tools chain correctly; runScan returns ≥0 stories with drafts.

- [ ] **Step 3: Manual browser checklist** (dev or browser-agent)

1. Fresh chat (sign in `testuser@oparax.com` / `hello123`): beat → "suggest accounts" → grounded + verified, no memory picks.
2. Disconnected: the **Connect X** bar shows above the composer; the **Recent** control shows (empty state) then lists the chat after a reply.
3. Provide a public tweet URL as a voice sample → text resolves.
4. Complete schedule + name → **run scan** → drafts render → **Save Agent** → routed to the agent page showing the run + drafts.
5. (Connected account) "pull my recent posts" → own posts resolve; paste a protected URL of an account you follow → resolves.
6. Click **Connect X** mid-chat → OAuth → returns to the same session, conversation intact.
7. Usage dashboard (admin) shows discovery cost rows (`kind=scan`, `metadata.purpose=discover_*`).

- [ ] **Step 4: Mark ready for merge**

When build is green and the checklist passes, the branch is ready to squash-merge `ft/35 → main`. (Merging is a separate, user-authorized step.)

---

## Self-review

**Spec coverage:**
- §4 connect flow → Task 5 (bar + round-trip), Task 2 step 5 (scopes), system-prompt copy.
- §5 grounded suggestions → Tasks 3 + 4.
- §6 token-backed voice reads → Tasks 1 + 2.
- §7 protected-handle handling → Task 5 (prompt note + chip note).
- §8 cost accounting → Task 3 (`logUsage kind=scan, purpose=discover_*`).
- §9 reliability → discover is non-throwing/timeout-bounded (Task 3), token failures caught (Task 2), step budget bumped (Task 2), no pausing tools (unchanged).
- §10 recent-chats → already implemented; committed in Task 5.
- §13 manual checklist → Task 6.
- Out-of-scope (protected monitoring) → correctly absent.

**Placeholder scan:** none — every code step shows real code; every verify step shows a real command/expected result.

**Type consistency:** `XConnectionContext.accessToken` defined (T2.1) and read in `buildFetchExampleTweetsTool`/`buildFetchMyRecentPostsTool` (T2.1) and set in both routes (T2.3/2.4). `discoverHandles`/`discoverSites` return `DiscoveredHandle[]`/`DiscoveredSite[]` (T3) and are wrapped to `{ handles }`/`{ sites }` in the tools (T4.1). `fetchExampleTweets(urls, userToken?)` (T1) matches the factory call (T2.1). `fetchRecentPosts({…, accessToken?})` (T1) matches the tool call (T2.1). `extractMetrics(result, startedAt)` reused with its real return shape (T3).
