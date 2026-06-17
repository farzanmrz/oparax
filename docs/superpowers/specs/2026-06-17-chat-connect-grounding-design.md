# Chat-first agent creation: connect-X flow, grounded suggestions, token-backed voice reads

Date: 2026-06-17
Branch: `ft/35`
Status: approved design → implementation

## 1. Goal & ship target

Ship a **rough but reliable** chat-first create flow to end users by merging `ft/35` all
the way to `main`. The bar is a single happy path that does not hang:

> A reporter opens **New agent**, describes their beat in chat, gets grounded source
> suggestions, optionally captures their voice, sees drafted posts, **saves the agent**,
> and **the agent runs** (drafts are persisted and visible on the agent page).

Polish and breadth are explicitly secondary. "Minimal hanging" is a first-class
requirement, not a nice-to-have (§9).

## 2. Success criteria

- A user with **no X account** can complete the flow end-to-end for **public** monitoring.
- A user **with** X connected can additionally pull their own posts / read protected
  tweets they paste as voice samples, and post drafts.
- The assistant **never proposes handles/sites from memory** — only from grounded
  discovery that is then verified/validated.
- The full path (interview → discover/verify → voice → schedule → name → scan/draft →
  **Save Agent** → agent page shows the run) completes without a stalled/"hanging" turn.
- New Grok+search discovery costs appear in the Usage dashboard.
- `pnpm build` is green; the flow is manually verified (no test runner in this repo).

## 3. The model (capability table)

| Action | No X connected | X connected |
|---|---|---|
| Monitor **public** handles | ✅ | ✅ |
| Suggest handles/sites (grounded discover) | ✅ | ✅ |
| Use a **public** tweet URL as a voice sample | ✅ | ✅ |
| Pull **your own** posts as voice samples | ❌ → offer connect | ✅ |
| Use a tweet URL from a **protected acct you follow** | ❌ → offer connect | ✅ |
| Post drafts | ❌ → connect to post | ✅ |
| Monitor **protected accts you follow** | ⏳ follow-up spec | ⏳ follow-up spec |

Rationale: monitoring runs on Grok **xSearch (public only)**, so connecting X does not
change what the scan can monitor today. Connecting is therefore framed around the things
it *does* unlock — **voice samples + posting** — and is always optional, never a gate.

## 4. Connect-X flow

### 4.1 Where connect appears
- **Source step:** choosing X never forces a connect — the interview just proceeds.
- **Voice step (primary connect moment):** the assistant offers, in prose, to pull the
  user's recent posts (connect), or accept pasted tweet URLs, or skip. If already
  connected, it leads with pulling posts via `fetchMyRecentPosts`.
- **Post step:** the existing *"Connect X to post"* action-bar button (connect required
  only to post).

### 4.2 Affordance
While disconnected, show a slim **"Connect X"** bar directly **above the composer**:
*"Connect your X account to post drafts and use your own posts as writing samples."* +
a `Connect X` button. (Chosen over a header pill to avoid crowding Recent + Chat/Form.)

### 4.3 Mid-chat connect round-trip (depends on session persistence)
The connect button **force-saves the session**, then calls
`startXConnect("/dashboard/agents/new?session=<id>")`. Browser → X OAuth →
`/auth/callback` → returns to the **same session** (now connected), conversation intact.
This is non-destructive specifically because chat-session persistence already landed.

## 5. Grounded suggestions (the "FC Barcelona from memory" fix)

New module `lib/chat/discover.ts`:
- `discoverHandles(topic)` → `xai.responses(SCAN_MODEL)` + `xai.tools.xSearch`,
  structured via `Output.object`, returns `{ handle, name, why }[]` of **real, current**
  accounts surfaced by search.
- `discoverSites(topic)` → same with `xai.tools.webSearch`, returns `{ domain, name, why }[]`.
- Both: non-throwing, timeout-bounded, usage-logged.

Registered as server tools in `lib/chat/tools.ts`. The system prompt is updated so the
assistant **must** call discover before suggesting and **may not** propose handles/sites
from its own knowledge; it then runs `verifyHandles`/`validateSites` and presents only
confirmed results. Discovery is public (correct — beat accounts are public).

## 6. Token-backed voice reads (the "Reshad Rehman / protected URL" fix)

- `fetchMyRecentPosts` and `fetchExampleTweets` authenticate **as the user** (their
  stored OAuth token via `getFreshAccessToken`, auto-refreshed) when connected, so their
  own posts and protected-but-followed URLs resolve. Public/syndication fallback when not
  connected or no token.
- The user's connection already holds `tweet.read` + `users.read` (X: *"all tweets/accounts
  you can view, including protected"*), so **no reconnection is required**.
- `lib/x/link-identity.ts` scopes are made explicit
  (`tweet.read tweet.write users.read offline.access`) as hygiene — documents intent and
  guards against Supabase default drift; existing connections are unaffected.

## 7. Protected-handle handling (now)

`verifyHandles` already returns a `protected` flag. When a monitored handle is protected,
the assistant confirms it exists but notes *"monitoring protected accounts is coming
soon — for now I'll watch the public ones."* The handle is still stored (flagged) so the
follow-up can activate it; it is simply not relied upon for monitoring yet.

## 8. Cost accounting

`discoverHandles`/`discoverSites` are Grok+search calls, priced like the scan. They log to
`api_usage_events` with `kind: "scan"` + `metadata.purpose: "discover"` — no new cost
`kind` or DB migration needed (they price identically to the scan), and they surface in
the admin Usage dashboard. A dedicated `discover` kind is a later refinement.
(Protected-timeline read costs arrive with the follow-up spec.)

## 9. Reliability requirements ("minimal hanging")

- **No pausing/interactive client tools** — the flow stays text-driven (already true; keep
  it). A turn must never wait on an unresolved in-bubble control.
- **Discovery is non-throwing + timeout-bounded.** If discovery fails, the assistant
  degrades gracefully (asks the user to type handles) rather than stalling.
- **Token refresh never breaks the chat.** `getFreshAccessToken` failures are caught; the
  read falls back to app-bearer/public or returns a clean "connect to read this" result.
- **Step budget**: bump `stopWhen` from `stepCountIs(8)` to `stepCountIs(10)` so a
  discover→verify→config chain fits comfortably in one turn; the interview stays
  one-topic-per-turn to keep turns small.
- **Errors surface in the chat** (existing error row), never a silent hang.
- The **Save Agent → agent page → run visible** path is verified intact end-to-end.

## 10. Recent-chats discoverability

Already implemented: the "Recent" control renders even with zero saved sessions (empty
state), so it's discoverable; sessions persist after each completed turn.

## 11. Files touched (high level)

- `lib/chat/discover.ts` (new) — grounded discovery.
- `lib/chat/tools.ts` — register discover tools; `fetchExampleTweets` factory;
  `XConnectionContext.accessToken`.
- `lib/chat/run-chat.ts` — build per-request `fetchExampleTweets`; thread token.
- `lib/chat/system-prompt.ts` — discover-before-suggest rule; voice/connect copy; protected note.
- `lib/x/syndication.ts` — `fetchExampleTweets(urls, userToken?)`.
- `lib/x/timeline.ts` — `fetchRecentPosts({ …, accessToken? })`.
- `lib/x/link-identity.ts` — explicit scopes.
- `app/api/agents/chat/route.ts` + `app/api/agents/chat-debug/route.ts` — fetch fresh
  access token when connected; pass into `xConnection`.
- `components/agents/agent-chat.tsx` — connect bar above composer + force-save-before-connect.
- `components/agents/chat-message-row.tsx` — discover tool labels; protected note on chips.
- `lib/usage/*` — discovery cost `kind`/pricing.

## 12. Out of scope (→ follow-up spec)

- The **scan** reading protected-followed **timelines** via the X API, its cost `kind` +
  pricing, and the autonomous/scheduled path. This is what lights up the bottom row of the
  capability table.
- Bulk "Post (N)" endpoint from the chat (currently saves + routes to the agent page).
- Re-introducing clickable single-select option chips (send-on-click, non-pausing).

## 13. Manual verification checklist

1. Fresh chat (no X): describe a beat → ask for handle suggestions → confirm they come via
   `discoverHandles` (grounded), get verified, and no memory-only picks appear.
2. Provide a public tweet URL as a voice sample → text resolves.
3. Complete schedule + name → run scan → drafts render → **Save Agent** → agent page shows
   the run + drafts.
4. Connected user: "pull my recent posts" → own posts resolve; paste a protected URL of an
   account you follow → resolves.
5. Disconnected user clicks **Connect X** above composer mid-chat → returns to the same
   session connected, conversation intact.
6. Usage dashboard shows discovery cost rows.
7. `pnpm build` green.
