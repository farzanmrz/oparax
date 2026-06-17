# Chat experience redesign + connect-X rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the new-agent chat into an assistant-led, on-brand, artifact-rich experience; decouple X connection from agent creation; and split the scan (news) representation from the draft representation.

**Architecture:** All work lands on `ft/35`. The chat is `components/agents/agent-chat.tsx` (`useChat`, AI SDK v6) talking to `app/api/agents/chat/route.ts`. Interactive in-chat controls (source picker, voice step) are **client tools** (no `execute`) resolved via `addToolOutput`; verify/validate results render from existing **server tools**. New artifacts are standalone components rendered from the `runScan` tool result. Connect-X stops gating creation/drafting and gates only posting.

**Tech Stack:** Next.js App Router (TS strict), AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/xai`), zod 4, Supabase, Biome. Graphite design system in `app/globals.css` (tokens are the source of truth).

**Verification model (no test runner in this repo):** Per the project convention, build/lint/format are NOT run per task — they run ONCE as a single consolidated gate after the last task (Phase 8.2). Each task ends with a commit, plus a quick manual check where useful. Keep edits build-safe as you go; the final `pnpm format` + `pnpm build` + `pnpm lint` gate catches issues.

**Source of visual truth:** `docs/superpowers/specs/2026-06-16-chat-experience-redesign.md` and the approved mockups. Graphite tokens used below: `--bg oklch(0 0 0)`, page area `oklch(0.155 0 0)`, card `oklch(0.205 0 0)`, inset `oklch(0.2 0 0)`, sub-surface `oklch(0.235 0 0)`, user bubble `oklch(0.27 0 0)`, line `oklch(1 0 0 / 0.12)`, fg `oklch(0.982 0.004 240)`, muted `oklch(0.86 0.012 240)`, faint `oklch(0.72 0.012 240)`, accent `oklch(0.85 0.065 235)`, accent-vivid `oklch(0.78 0.115 235)`, live `oklch(0.82 0.16 155)`, err `oklch(0.7 0.185 25)`, action white `oklch(1 0 0)`.

---

## Phase 0 — Prep

### Task 0.1: Merge the linkIdentity fix into ft/35

**Files:** none (git only). The branch `fix/x-link-duplicate` adds `lib/x/identity-owner.ts`, edits `app/auth/callback/route.ts` and `app/dashboard/connect-x/page.tsx` (disjoint from this plan's files).

- [ ] **Step 1:** Confirm a clean state and that the branch exists.

Run: `git rev-parse --abbrev-ref HEAD` → expect `ft/35`. Run: `git log --oneline -1 fix/x-link-duplicate` → expect `f79d492 fix(x-link): ...`.

- [ ] **Step 2:** Merge it.

Run: `git merge --no-ff fix/x-link-duplicate -m "merge: X linkIdentity duplicate-handling (masked-email reroute)"`
Expected: merges 3 files, no conflicts (they don't overlap this plan).

- [ ] **Step 3:** Verify build.

Manual: visit `/dashboard/connect-x?x_error=x_already_linked&lockedEmail=f%E2%80%A2%E2%80%A2%E2%80%A2z%40gmail.com` and confirm the masked-email error banner renders.

### Task 0.2: Branded avatar component

**Files:**
- Create: `components/agents/chat-avatars.tsx`

The Oparax mark (`components/logo.tsx` `OparaxMark`) draws with `currentColor`. For the chat avatar we want a white mark on the accent-vivid blue circle; the user avatar is an initials circle.

- [ ] **Step 1:** Create the component.

```tsx
import { OparaxMark } from "@/components/logo";

/** Oparax assistant avatar: white orbit mark on the accent-blue circle. */
export function OparaxAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-vivid)",
        color: "oklch(1 0 0)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OparaxMark width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} />
    </span>
  );
}

/** User avatar: initials on a neutral circle. */
export function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "·";
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "oklch(0.42 0.04 250)",
        color: "oklch(1 0 0)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "500 0.75rem/1 var(--font-sans)",
      }}
    >
      {initials}
    </span>
  );
}
```

- [ ] **Step 2:** Verify + commit.

Then:
```bash
git add components/agents/chat-avatars.tsx
git commit -m "feat(agents): branded Oparax + user chat avatars"
```

---

## Phase 1 — Connect-X decoupling (gate removed from creation, kept for posting)

### Task 1.1: Remove the chat-route connect-X guard

**Files:**
- Modify: `app/api/agents/chat/route.ts` (the guard block, currently ~lines 46–58)

- [ ] **Step 1:** Delete the connection guard so the chat works without X. Remove this block:

```ts
  // Connect-X guard — identical to scan route.
  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
    }>();
  if (!connection) {
    return new Response("Connect X before creating an agent.", {
      status: 403,
    });
  }
```

Keep the auth (`if (!user) 401`) guard above it.

- [ ] **Step 2:** Verify + commit.

Manual: as a user with no X linked, `/dashboard/agents/new` chat returns assistant text (not the 403 chip). Then:
```bash
git add app/api/agents/chat/route.ts
git commit -m "feat(chat): drop connect-X guard from chat route (creation no longer requires X)"
```

### Task 1.2: Remove the creation gates on dashboard pages

**Files:**
- Modify: `app/dashboard/agents/new/page.tsx`
- Modify: `app/dashboard/agents/page.tsx:38-40`
- Modify: `app/dashboard/page.tsx:10`

- [ ] **Step 1:** `app/dashboard/agents/new/page.tsx` — stop redirecting; pass connection status to `AgentChat`. Replace the file body's data/guard + render with:

```tsx
export default async function NewAgentPage() {
  const supabase = await createClient();
  const { data: connection } = await supabase.from("x_connections").select("id").maybeSingle<{
    id: string;
  }>();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <AgentChat xConnected={Boolean(connection)} />
    </div>
  );
}
```

Remove the now-unused `redirect` import and the `WorkspacePageHeader` import only if the heading moves into `AgentChat` (it does — see Task 2.1; the heading + toggle render inside `AgentChat`). Keep `createClient`.

- [ ] **Step 2:** `app/dashboard/agents/page.tsx` — delete the gate:

```tsx
  if (!connection) {
    redirect("/dashboard/connect-x");
  }
```

Remove the now-unused `connection` destructure and the `redirect` import. Change the parallel fetch to drop the `x_connections` query (only `agents` remains). The "New agent" `Link` stays active in all cases.

- [ ] **Step 3:** `app/dashboard/page.tsx` — always go to agents:

```tsx
export default async function DashboardPage() {
  redirect("/dashboard/agents");
}
```

Remove the now-unused `createClient` import and Supabase call.

- [ ] **Step 4:** Verify + commit.

Manual: with no X linked, `/dashboard` → `/dashboard/agents` (list, "New agent" active), and `/dashboard/agents/new` loads the chat (no bounce to connect-x). Then:
```bash
git add app/dashboard/agents/new/page.tsx app/dashboard/agents/page.tsx app/dashboard/page.tsx
git commit -m "feat(dashboard): remove connect-X creation gates (connect anytime)"
```

### Task 1.3: Sidebar + signup redirect no longer assume X

**Files:**
- Modify: `components/dashboard/workspace-shell.tsx:147`
- Modify: `lib/auth/modal-actions.ts:122`

- [ ] **Step 1:** workspace-shell — Agents always points at the list:

```tsx
  const agentsHref = "/dashboard/agents";
```

(`agentsActive` logic unchanged; connect-x remains reachable from Settings / the post-time prompt.)

- [ ] **Step 2:** modal-actions `signupAction` — land new users on agents, not the gate:

```ts
  if (data.session) {
    redirect("/dashboard/agents");
  }
```

- [ ] **Step 3:** Verify + commit.

Manual: sidebar "Agents" goes to `/dashboard/agents` even with no X. Then:
```bash
git add components/dashboard/workspace-shell.tsx lib/auth/modal-actions.ts
git commit -m "feat(nav): Agents + signup no longer route through connect-X"
```

---

## Phase 2 — Shell / chrome rebuild

### Task 2.1: Card-less shell, heading+toggle row, floating input, greeting

**Files:**
- Modify: `components/agents/agent-chat.tsx` (props + render tree)
- Modify: `app/globals.css` (append a `@layer components` block for the new chat chrome)

The component keeps all existing `useChat` wiring, `handleSave`, `extractRunScanOutput`, `deepMerge`, `onToolCall`. Only the props and the JSX render tree change. Add `xConnected` prop. Seed the greeting via `useChat`'s initial messages.

- [ ] **Step 1:** Add the prop and seed the greeting. Change the signature and the `useChat` call:

```tsx
export function AgentChat({ xConnected }: { xConnected: boolean }) {
  // ...existing state...
  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agents/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: [
      {
        id: "greeting",
        role: "assistant",
        parts: [
          {
            type: "text",
            text:
              "Hi, I'm Oparax. I'll set up a news agent that watches your beat and drafts posts in your voice. What should I keep an eye on?",
          },
        ],
      },
    ],
    onToolCall: ({ toolCall }) => {
      /* existing setAgentConfig handling unchanged */
    },
  });
```

- [ ] **Step 2:** Replace the render tree. The outer column holds a heading row (title + segmented toggle), then either the Form view or the card-less chat with a floating composer. Replace the entire `return (...)` with:

```tsx
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px - 22px)",
        minHeight: 0,
        position: "relative",
      }}
    >
      <div className="agent-head">
        <h1 className="agent-head-title">New agent</h1>
        <div className="agent-toggle" role="tablist" aria-label="Setup mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            className={`agent-toggle-btn${activeTab === "chat" ? " is-active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <ChatIcon /> Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "form"}
            className={`agent-toggle-btn${activeTab === "form" ? " is-active" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            <FormIcon /> Form
          </button>
        </div>
      </div>

      {activeTab === "form" ? (
        <div style={{ paddingTop: 16, overflowY: "auto" }}>
          <ConfigForm value={config} onChange={setConfig} />
        </div>
      ) : (
        <div className="agent-chat-scroll">
          <div className="agent-chat-col">
            {messages.map((message) => (
              <ChatMessageRow
                key={message.id}
                message={message}
                userName="You"
                isStreaming={isStreaming}
                xConnected={xConnected}
                draftEdits={draftEdits}
                onDraftChange={handleDraftChange}
                addToolOutput={addToolOutput}
                sendMessage={sendMessage}
              />
            ))}
            {isStreaming && messages.at(-1)?.role === "user" && <ThinkingRow />}
            {error && <div className="agent-chat-error">{error.message}</div>}
          </div>

          <div className="agent-composer-wrap">
            <PromptInput
              className="agent-composer"
              onSubmit={({ text }) => {
                if (!text?.trim()) return;
                sendMessage({ text: text.trim() });
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea placeholder="Message Oparax…" disabled={isStreaming} />
              </PromptInputBody>
              <PromptInputFooter>
                <button type="button" className="agent-composer-plus" aria-label="Add (coming soon)" disabled>
                  <PlusGlyph />
                </button>
                <button type="submit" className="agent-composer-send" disabled={isStreaming} aria-label="Send">
                  {isStreaming ? <Spinner className="size-4" /> : <SendGlyph />}
                </button>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </div>
  );
```

Note: `ChatMessageRow`, `ThinkingRow`, `ChatIcon`, `FormIcon`, `PlusGlyph`, `SendGlyph` are created in Task 2.2 / 4.x. The per-message part rendering (text, reasoning, tool parts, runScan→artifacts) moves into `ChatMessageRow`.

- [ ] **Step 3:** Append the chrome CSS to `app/globals.css` (inside `@layer components`):

```css
/* ------------------------------------------------ agent chat chrome */
.agent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.agent-head-title { margin: 0; font: 500 1.25rem/1.2 var(--font-sans); color: var(--fg); }
.agent-toggle {
  display: inline-flex; gap: 2px; padding: 2px;
  background: var(--inset); border: 1px solid var(--line); border-radius: 9px;
}
.agent-toggle-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 7px; border: 0; background: transparent;
  color: var(--faint); font: 400 0.8125rem/1 var(--font-sans); cursor: pointer;
}
.agent-toggle-btn.is-active {
  background: oklch(0.27 0 0); color: var(--fg); font-weight: 500;
  box-shadow: inset 0 0 0 1px var(--accent-line);
}
.agent-chat-scroll { flex: 1; min-height: 0; overflow-y: auto; position: relative; }
.agent-chat-col { max-width: 760px; margin: 0 auto; padding: 18px 0 150px; display: flex; flex-direction: column; gap: 18px; }
.agent-chat-error { padding: 10px 14px; border-radius: var(--radius); background: oklch(0.7 0.185 25 / 0.08); border: 1px solid oklch(0.7 0.185 25 / 0.3); color: var(--err); font: 500 0.9375rem/1.4 var(--font-sans); }
.agent-composer-wrap { position: sticky; bottom: 0; padding: 0 0 16px; background: linear-gradient(to top, var(--bg) 62%, transparent); }
.agent-composer { max-width: 600px; margin: 0 auto; background: var(--field-bg); border: 1px solid var(--field-line); border-radius: 16px; padding: 12px 12px 10px; }
.agent-composer:focus-within { border-color: var(--accent-line); }
.agent-composer-plus { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--field-line); background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; }
.agent-composer-send { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--accent-vivid); color: oklch(1 0 0); margin-left: auto; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
```

- [ ] **Step 4:** Verify + commit.

Manual: `/dashboard/agents/new` shows "New agent" + toggle on one row, no card around messages, Oparax greeting visible, floating composer with `+` and blue send. Then:
```bash
git add components/agents/agent-chat.tsx app/globals.css
git commit -m "feat(agents): card-less chat shell, heading+toggle row, floating composer, greeting"
```

### Task 2.2: ChatMessageRow + glyphs

**Files:**
- Create: `components/agents/chat-message-row.tsx`
- Create: `components/agents/chat-glyphs.tsx`

- [ ] **Step 1:** `chat-glyphs.tsx` — small inline SVG/icon helpers (`ChatIcon`, `FormIcon`, `PlusGlyph`, `SendGlyph`, `ExternalGlyph`). Use 16–18px `currentColor` SVGs (match existing `shell-icons.tsx` style — single `<path>`/`<svg>` with `width`/`height` props). Keep stroke width ~1.8.

- [ ] **Step 2:** `chat-message-row.tsx` — renders one message: assistant rows = `OparaxAvatar` + plain text/artifacts; user rows = bubble + `UserAvatar` (right-aligned). Port the per-part switch currently inline in `agent-chat.tsx` (text → `MessageResponse`; reasoning → `Reasoning`; tool parts → either an interactive control (Phase 4), the scan/draft artifacts (Phase 6/7), or the collapsible `Tool` chip fallback). Signature:

```tsx
export function ChatMessageRow(props: {
  message: UIMessage;
  userName: string;
  isStreaming: boolean;
  xConnected: boolean;
  draftEdits: Record<string, string>;
  onDraftChange: (dedupeKey: string, text: string) => void;
  addToolOutput: (arg: { toolCallId: string; tool: string; output: unknown }) => void;
  sendMessage: (msg: { text: string }) => void;
}) { /* ... */ }
```

Assistant row layout: `<div className="agent-msg is-assistant"><OparaxAvatar/><div className="agent-msg-body">{parts}</div></div>`. User row: `<div className="agent-msg is-user"><div className="agent-bubble">{text}</div><UserAvatar name={userName}/></div>`.

- [ ] **Step 3:** Append message CSS to `app/globals.css`:

```css
.agent-msg { display: flex; gap: 11px; align-items: flex-start; }
.agent-msg.is-user { flex-direction: row-reverse; }
.agent-msg-body { max-width: 82%; padding-top: 4px; font: 400 0.9375rem/1.6 var(--font-sans); color: var(--fg); }
.agent-bubble { max-width: 78%; background: oklch(0.27 0 0); border-radius: 16px 16px 5px 16px; padding: 10px 15px; font: 400 0.9375rem/1.5 var(--font-sans); color: var(--fg); }
```

- [ ] **Step 4:** Verify + commit.

Manual: send a message; user bubble right-aligned with initials avatar, Oparax replies with logo avatar + plain text. Then:
```bash
git add components/agents/chat-message-row.tsx components/agents/chat-glyphs.tsx components/agents/agent-chat.tsx app/globals.css
git commit -m "feat(agents): ChatMessageRow with avatars + glyphs"
```

---

## Phase 3 — System prompt + flow

### Task 3.1: Rewrite the setup system prompt

**Files:**
- Modify: `lib/chat/system-prompt.ts`

- [ ] **Step 1:** Rewrite `CHAT_SYSTEM_PROMPT` to encode the new flow order and rules. Required changes vs. current:
  - Topic order: **beat (scanning) → sources → handles/domains → voice/examples → schedule → name LAST** (name is suggested after purpose is understood; ask the user to confirm/adjust).
  - **Never recommend domains/sites before validating them.** Only suggest sites if the user asks for help, and when you do, call `validateSites` first and present only reachable ones.
  - Sources step: instruct the model to call the `proposeSources` client tool (Task 4.1) to render the picker rather than free-texting the question. Still accept typed answers.
  - Voice step: offer "paste tweet URLs (yours or anyone's)", "connect X to use your posts", or "skip"; call `fetchExampleTweets` when URLs are given. Do not require X.
  - Remove the stale line claiming the scan "will be wired in the next step" — `runScan` exists; call it when config is ready and the user confirms.
  - Keep: sentence case, one question at a time, never invent values, confirm inferred timezone, `verifyHandles`/`validateSites`/`fetchExampleTweets` on user input.

- [ ] **Step 2:** Verify + commit.

Manual: new chat asks for the beat first and only proposes the name near the end. Then:
```bash
git add lib/chat/system-prompt.ts
git commit -m "feat(chat): rewrite setup prompt — name last, validate-before-suggest, picker/voice flow"
```

---

## Phase 4 — Interactive controls (client tool-UI-parts)

### Task 4.1: `proposeSources` client tool + SourcePicker control

**Files:**
- Modify: `lib/chat/tools.ts` (add `proposeSources` client tool — no `execute`)
- Modify: `app/api/agents/chat/route.ts` (already spreads `configTools`; no change if added to the map)
- Create: `components/agents/source-picker.tsx`
- Modify: `components/agents/agent-chat.tsx` (`onToolCall`: do NOT auto-resolve `proposeSources`; it resolves on user click)
- Modify: `components/agents/chat-message-row.tsx` (render `SourcePicker` for the `proposeSources` tool part)

- [ ] **Step 1:** Add the client tool in `tools.ts`:

```ts
const proposeSources = tool({
  description:
    "Render the source picker so the user can choose where to watch (X and/or the web). Call this when asking about sources instead of asking in plain text.",
  inputSchema: z.object({}),
  // no execute — resolved on the client when the user clicks Add.
});
```

Add `proposeSources` to the exported `configTools` map.

- [ ] **Step 2:** `source-picker.tsx` — port the approved picker: two single-line chips (`X Posts/Tweets`, `Web Search Articles`), highlight-select (no tick), an **Add sources** button, "ask me below" hint. Local `useState<{x:boolean;web:boolean}>`. On Add: call `onAdd({ x, web })`.

```tsx
"use client";
import { useState } from "react";

export function SourcePicker({ onAdd }: { onAdd: (sel: { x: boolean; web: boolean }) => void }) {
  const [sel, setSel] = useState({ x: false, web: false });
  const chosen = sel.x || sel.web;
  return (
    <div className="src-pick">
      <div className="src-pick-row">
        <button type="button" className={`src-chip${sel.x ? " is-on" : ""}`} onClick={() => setSel((s) => ({ ...s, x: !s.x }))}>
          <span className="src-xbadge">X</span> X Posts/Tweets
        </button>
        <button type="button" className={`src-chip${sel.web ? " is-on" : ""}`} onClick={() => setSel((s) => ({ ...s, web: !s.web }))}>
          <span className="src-globe" aria-hidden="true">◍</span> Web Search Articles
        </button>
      </div>
      <div className="src-pick-foot">
        <button type="button" className="btn btn-primary btn-sm" disabled={!chosen} onClick={() => onAdd(sel)}>
          Add sources
        </button>
        <span className="src-hint">Not sure? Just ask me below.</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** Append picker CSS to `globals.css` (chips highlight via `--accent-soft` bg + `--accent-line` border when `.is-on`; `.src-xbadge` is the small black "X" square; blue `Add` from `btn-primary`).

- [ ] **Step 4:** In `chat-message-row.tsx`, when a part is the `proposeSources` tool and `state !== "output-available"`, render `<SourcePicker onAdd={(sel) => { addToolOutput({ toolCallId, tool: "proposeSources", output: sel }); }} />`. When already resolved, render a compact summary (e.g. "Watching: X · Web"). Also merge the choice into config (call the same `setConfig`/`setAgentConfig` path so `sources.x.enabled`/`sources.web.enabled` update — simplest: have `onToolCall` ignore `proposeSources`, and let the model call `setAgentConfig` after seeing the tool output).

- [ ] **Step 5:** In `agent-chat.tsx` `onToolCall`, leave `proposeSources` unhandled (it has no `execute` and must wait for the user). Confirm `setAgentConfig` handling is unchanged.

- [ ] **Step 6:** Verify + commit.

Manual: when Oparax asks about sources, the picker renders; selecting X + Add advances the chat. Then:
```bash
git add lib/chat/tools.ts components/agents/source-picker.tsx components/agents/chat-message-row.tsx components/agents/agent-chat.tsx app/globals.css
git commit -m "feat(chat): source picker as a client tool-UI-part"
```

### Task 4.2: Verify/validate result chips

**Files:**
- Create: `components/agents/result-chips.tsx`
- Modify: `components/agents/chat-message-row.tsx` (render chips for `verifyHandles` / `validateSites` outputs)

- [ ] **Step 1:** `result-chips.tsx` — `VerifyChips` renders confirmed (`✓ @handle`, green) and not-found (`✗ @handle`, red) from the `verifyHandles` output shape; `SiteChips` renders reachable/paywalled/unreachable from `validateSites`. (Read those tools' return shapes in `lib/x/verify.ts` and `lib/sites/validate.ts` to match fields exactly.)

- [ ] **Step 2:** In `chat-message-row.tsx`, render `VerifyChips`/`SiteChips` when the corresponding tool part is `output-available`, instead of the generic `Tool` chip.

- [ ] **Step 3:** Append chip CSS (`--live` for confirmed, `--err` for not-found, `--accent` for paywall note).

- [ ] **Step 4:** Verify + commit.

Manual: providing handles shows ✓/✗ chips. Then:
```bash
git add components/agents/result-chips.tsx components/agents/chat-message-row.tsx app/globals.css
git commit -m "feat(chat): verify/validate result chips"
```

### Task 4.3: Voice/examples step

**Files:**
- Modify: `lib/chat/tools.ts` (add `proposeVoiceStep` client tool, no `execute`)
- Create: `components/agents/voice-step.tsx`
- Modify: `components/agents/chat-message-row.tsx`

- [ ] **Step 1:** Add `proposeVoiceStep` client tool (empty input schema) to `configTools`, described as "render the voice/examples options".

- [ ] **Step 2:** `voice-step.tsx` — three actions: **Paste tweet URLs** (reveals a small textarea; on submit, `onUrls(urls)` → the row calls `addToolOutput({...output:{mode:"urls",urls}})` and the model calls `fetchExampleTweets`), **Connect X to use my posts** (calls `startXConnect("/dashboard/agents/new")` from `lib/x/link-identity.ts` when `!xConnected`, else `onUrls([])` with a "use my recent posts" intent), **Skip for now** (`output:{mode:"skip"}`). Pass `xConnected` through.

- [ ] **Step 3:** Render in `chat-message-row.tsx` for the `proposeVoiceStep` part; compact summary once resolved.

- [ ] **Step 4:** Verify + commit.

Manual: voice step offers paste / connect / skip; paste URLs advances; skip advances. Then:
```bash
git add lib/chat/tools.ts components/agents/voice-step.tsx components/agents/chat-message-row.tsx app/globals.css
git commit -m "feat(chat): optional voice/examples step (paste URLs / connect X / skip)"
```

---

## Phase 5 — Scan source enrichment

### Task 5.1: Structured sources in the scan output

**Files:**
- Modify: `lib/scan/schema.ts` (add a structured `sources` array to the item schema)
- Modify: `lib/scan/types.ts` (`PreviewStory.sources: StorySource[]`)
- Modify: `lib/scan/ui-stream.ts` (`storiesFromOutput` maps model output → `StorySource[]`)
- Modify: `lib/scan/run.ts` (prompt the model to emit per-source metadata; keep `urls` for back-compat if persisted)
- Modify: `lib/scan/system-prompt` for scan (wherever the scan instructions are authored) to request structured sources

- [ ] **Step 1:** Add the source schema (zod) in `lib/scan/schema.ts`:

```ts
export const storySourceSchema = z.object({
  type: z.enum(["tweet", "article"]),
  url: z.url(),
  authorName: z.string().optional(), // tweet display name OR article site name
  handle: z.string().optional(),     // tweet @handle (no @)
  title: z.string().optional(),      // article headline
  text: z.string().optional(),       // tweet text
  postedAt: z.string().optional(),   // ISO 8601 if known
});
```

Add `sources: z.array(storySourceSchema).default([])` to `scanItemSchema` (keep existing `urls` for persistence/back-compat).

- [ ] **Step 2:** `lib/scan/types.ts` — add and export:

```ts
export interface StorySource {
  type: "tweet" | "article";
  url: string;
  authorName?: string;
  handle?: string;
  title?: string;
  text?: string;
  postedAt?: string;
}
```

Add `sources: StorySource[];` to `PreviewStory`.

- [ ] **Step 3:** `lib/scan/ui-stream.ts` `storiesFromOutput` — populate `sources` from the model output; if absent, synthesize minimal `{type:"article", url}` entries from `urls` so older shapes still render.

- [ ] **Step 4:** `lib/scan/run.ts` + scan prompt — instruct the model to return, per story, a `sources` array with `type`, `url`, and the metadata it has (tweet author/handle/text/postedAt; article title/postedAt). Do not invent avatars.

- [ ] **Step 5:** Verify + commit.

Manual: run a scan (as an X-connected user via farzanmrz); confirm `runScan` returns `stories[].sources` populated (log once or inspect network). Then:
```bash
git add lib/scan/schema.ts lib/scan/types.ts lib/scan/ui-stream.ts lib/scan/run.ts
git commit -m "feat(scan): structured per-source metadata (tweet/article) in scan output"
```

---

## Phase 6 — Artifacts

### Task 6.1: Source cards

**Files:**
- Create: `components/agents/source-cards.tsx` (`SourceTweetCard`, `SourceArticleCard`)

- [ ] **Step 1:** Port the approved cards. Tweet: initials `UserAvatar` (from `authorName`) + name + date (right) + open icon + text clamped 3 lines. Article: favicon (`https://www.google.com/s2/favicons?domain=<domain>&sz=64`, with an initials-square fallback) + domain + date + open icon + headline clamped 3 lines. Both take a `StorySource` and a `variant?: "carousel" | "full"`. Derive `domain` from `url` via `new URL(url).hostname.replace(/^www\./,"")`. Date: format `postedAt` as `MMM D` (fallback: omit).

- [ ] **Step 2:** Append `.src-card` CSS (fixed-width 232px in carousel; `-webkit-line-clamp:3`).

- [ ] **Step 3:** Verify + commit.

Then:
```bash
git add components/agents/source-cards.tsx app/globals.css
git commit -m "feat(agents): source tweet + article cards"
```

### Task 6.2: Scan news card (grid item) with expandable carousel

**Files:**
- Create: `components/agents/scan-news-card.tsx` (`ScanNewsCard`, `ScanNewsGrid`)

- [ ] **Step 1:** `ScanNewsCard` — compact: straight `summary` (clamp 2 lines, no title) → type-count pills derived from `sources` (`N tweets`, `M articles`) → overlapping author-avatar preview → **View sources** button. Local `expanded` state; when expanded, render the full source **carousel** (horizontal scroll row of `SourceTweetCard`/`SourceArticleCard` `variant="carousel"`). `ScanNewsGrid` lays `ScanNewsCard`s in `display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:11px`.

- [ ] **Step 2:** Append `.scan-grid` / `.scan-card` / `.scan-carousel` CSS (pills via accent-soft + inset; carousel `overflow-x:auto`; right-edge fade).

- [ ] **Step 3:** Verify + commit.

Then:
```bash
git add components/agents/scan-news-card.tsx app/globals.css
git commit -m "feat(agents): scan news grid + expandable source carousel"
```

### Task 6.3: Draft card (posted-style) — display + selection only

**Files:**
- Create: `components/agents/draft-card.tsx`

- [ ] **Step 1:** `DraftCard` — posted-style: `UserAvatar` + "You" + "@handle · now" + draft text + **soft** char count ("N characters", no `/280`). Props:

```tsx
export function DraftCard(props: {
  story: PreviewStory;
  draft: string;
  onDraftChange: (text: string) => void;
  xConnected: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}) { /* ... */ }
```

Selection: a checkbox/affordance top-right (`onToggleSelected`). Editing: inline `textarea` bound to `draft`/`onDraftChange` (revealed by an Edit pencil), per spec "edit inline, or tell me what to change". **No per-card Post/Connect button** — posting is the shared bar (Task 7.2). When `!xConnected`, the inline hint reads "Connect X at the bottom to post."

- [ ] **Step 2:** Append `.draft-card` CSS (accent-tinted border; selected = `--accent-line` ring).

- [ ] **Step 3:** Verify + commit.

Then:
```bash
git add components/agents/draft-card.tsx app/globals.css
git commit -m "feat(agents): posted-style draft card (display + select + inline edit)"
```

---

## Phase 7 — Wire artifacts into the chat + posting

### Task 7.1: Render scan grid + drafts from the runScan result

**Files:**
- Modify: `components/agents/chat-message-row.tsx` (replace the `ScanPreview` branch)

- [ ] **Step 1:** When a part is the `runScan` tool with `output-available`, render two sections in the assistant body: (1) `<ScanNewsGrid stories={stories} />` (the news), then (2) a drafts section mapping each story to `<DraftCard ... />` with selection state lifted to `agent-chat.tsx` (see Task 7.2). Keep `extractRunScanOutput` as the source of `stories`/`metrics`. Remove the old `ScanPreview` import here.

- [ ] **Step 2:** Verify + commit.

Manual (farzanmrz): a scan renders the grid then the draft cards. Then:
```bash
git add components/agents/chat-message-row.tsx
git commit -m "feat(chat): render scan grid + draft cards from runScan result"
```

### Task 7.2: Draft multiselect + shared post/connect bar + Save

**Files:**
- Modify: `components/agents/agent-chat.tsx` (selection state; the sticky action bar)

- [ ] **Step 1:** Add selection state: `const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set())` keyed by `dedupeKey`; pass `selected`/`onToggleSelected` down through `ChatMessageRow` to `DraftCard`. When a new scan arrives (fingerprint change, reuse the existing `scanFingerprintRef` effect) reset the selection.

- [ ] **Step 2:** Add a sticky action bar above the composer, shown when `scanResult?.stories.length`:

```tsx
{scanResult && scanResult.stories.length > 0 && (
  <div className="agent-actionbar">
    <button type="button" className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving}>
      {saving ? <Spinner className="size-4" /> : "Save agent"}
    </button>
    <button
      type="button"
      className="btn btn-primary btn-sm"
      disabled={selectedDrafts.size === 0}
      onClick={xConnected ? handlePostSelected : handleConnectThenPost}
    >
      {xConnected ? `Post (${selectedDrafts.size})` : "Connect X to post"}
    </button>
  </div>
)}
```

- [ ] **Step 2b:** `handleConnectThenPost` calls `startXConnect("/dashboard/agents/new")` (from `lib/x/link-identity.ts`). `handlePostSelected` is a stub that posts the selected drafts via the existing per-item post path (or, if none exists for the create flow yet, save first then post on the detail page) — **scope note:** real bulk posting wiring may reuse the detail page's post action; if not present, this button may Save then route to the detail page. Keep `handleSave` unchanged.

- [ ] **Step 3:** Append `.agent-actionbar` CSS (sticky, sits just above `.agent-composer-wrap`, `--chrome` bg, space-between).

- [ ] **Step 4:** Verify + commit.

Manual: select drafts → bar shows "Post (N)" when connected, "Connect X to post" when not; "Save agent" persists and routes to the detail page. Then:
```bash
git add components/agents/agent-chat.tsx app/globals.css
git commit -m "feat(chat): draft multiselect + shared post/connect/save action bar"
```

---

## Phase 8 — Branding pass + final gate

### Task 8.1: Accent pass + dead-code cleanup

**Files:**
- Modify: `components/agents/agent-chat.tsx`, `app/globals.css` (accent on `+`, send, focus ring, primary CTAs — already applied; audit for consistency)
- Remove: stale code paths in `agent-chat.tsx` no longer used (old inline part switch, `ScanPreview`/`MessageContent` imports if fully replaced). Verify `components/agents/scan-preview.tsx` + `story-card.tsx` are still used by the **detail page** (`app/dashboard/agents/[id]`); if so, keep them; do not delete.

- [ ] **Step 1:** Grep for unused imports in `agent-chat.tsx`; remove. Confirm `scan-preview`/`story-card` usage: `grep -rn "ScanPreview\|StoryCard" app components`.

- [ ] **Step 2:** Verify + commit.

Then:
```bash
git add -A
git commit -m "chore(agents): accent pass + remove dead chat code"
```

### Task 8.2: Full build + lint + manual verification checklist

- [ ] **Step 1:** Run the gates.

Run `pnpm format`, then `pnpm build` (expect exit 0), then `pnpm lint` (clean — scope to touched dirs if it OOMs: `pnpm biome check components/agents lib/chat lib/scan app/api/agents app/dashboard`).

- [ ] **Step 2:** Manual checklist (hand to the developer — needs farzanmrz for X-bound steps):
  - No X linked: `/dashboard` → agents list; `/dashboard/agents/new` loads chat (no gate); greeting shows; toggle switches Chat/Form.
  - Source picker renders, highlight-select, Add advances; handles show ✓/✗ chips; sites validated before any suggestion.
  - Voice step: paste URLs / connect X / skip all advance.
  - Name proposed at the end.
  - Scan (farzanmrz): news grid renders, View sources expands the carousel; drafts render posted-style; multiselect → "Post (N)" (connected) / "Connect X to post" (not).
  - Duplicate-X link (testuser, same X as farzanmrz): masked-email error on connect-x.
  - Save agent persists and routes to detail; detail page still posts/redrafts.

- [ ] **Step 3:** Commit any final formatting and hand off the checklist. Then return to the `/feature` Phase 4 ship gate.

---

## Self-review notes
- **Spec coverage:** shell (2.1), branding avatar/sidebar (0.2, 1.3, 8.1), greeting+prompt (2.1, 3.1), source picker + verify chips (4.1, 4.2), voice step (4.3), gate removal + merge (0.1, 1.1–1.3), artifacts incl. scan/draft split (5.1, 6.1–6.3, 7.1), bulk post bar (7.2), branding accents (8.1). All spec sections map to tasks.
- **Out of scope (not planned), per spec:** usage analytics (#36), char-limit-by-tier (soft count only in 6.3), scan tuning loop, multi-platform drafting, media attach (the `+` is disabled), monitored-handle candidate fetch.
- **Known soft edge:** Task 7.2 bulk-posting may route through Save→detail if a create-flow bulk-post action doesn't exist yet; flagged inline rather than inventing an endpoint. Confirm during execution and tighten if a direct post path is available.
