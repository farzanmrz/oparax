# Oparax — feature flow (reference)

My feature flow, ordered the way I first pictured a user living it. This is a **reference, not a contract**: the ordering is a hypothesis, and per-slice decisions get made *when we build that slice* — this doc records the flow and the **open questions**, not locked choices. Build one piece at a time; test it as a user *and* as a developer before starting the next.

Legend:
- **eve:** what the eve framework already provides for this feature (eve runs on Vercel Workflow and ships AI SDK, Cron, and Connect integrations — noted to correct earlier assumptions that it didn't).
- **fact:** a grounded technical fact worth remembering (not a decision).
- **open:** a question to settle when we reach the slice.
- **status:** where it already stands today.

## Where it stands today

- Auth works on localhost: login / signup / forgot-password / reset, password-only.
- Login lands on **`/agents`** (flat route; the old `/dashboard` shell is gone). Structure: `/agents` (listing) · `/agents/new` (create → the chat) · `/agents/[id]` (details, stub) · `/agents/settings`. One auth guard in `app/agents/layout.tsx`.
- The create-agent chat is the existing eve chat (`app/agents/new/agent-chat.tsx`, ai-elements + eve) — already the trimmed chatbot layout (no web-search / mic / model-select / attachment buttons). Model `deepseek/deepseek-v4-flash`; one tool `grok_twitter_search` (Grok `x_search`). Deployed it 401s (no channel auth yet) → localhost-only.
- Settings is a raw stub. No data store, no persistence across reload, no cost tracking yet.

---

## 1. Landing page
- `app/page.tsx` is the root `/` route (App Router: a folder = a URL segment; there is no `landing/` folder). Signed-in users are redirected to `/agents`.
- **status:** done; nothing to build. A visual refresh is optional, much later.

## 2. Core auth
- Verify login / signup / forgot-password end-to-end against Supabase; fix only what breaks.
- **status:** the six-folder question is mostly resolved — `signout/` (empty, dead) was removed; the auth pages are `login/`, `signup/`, `forgot-password/`, and `auth/confirm` + `auth/reset-password`.
- **fact:** `auth/confirm` and `auth/reset-password` are frozen — their URLs are baked into Supabase email templates and the redirect allow-list; never rename/move them.
- **open:** anything left to consolidate is cosmetic — decide if it's even worth touching.

## 3. SSO — Continue with Google and X
- Google (popular, straightforward) and X (the base use case) sign-in.
- **fact — the collision explained:** `linkIdentity()` wrote an X identity onto `testuser@oparax.com` whose email field was `farzanmrz@gmail.com`. Supabase's duplicate-signup check scans *all* identities' emails, so that linked identity reserved `farzanmrz@gmail.com` and blocked a fresh signup. Untangle: sign in as testuser → `getUserIdentities()` → `unlinkIdentity(x)`; the email frees up again.
- **fact — the model that stops the collisions:** Supabase identities are *sign-in credentials only*. "X account linked for posting" should NOT be a Supabase identity — Supabase doesn't even retain provider tokens. Model X-for-posting as an app connection (see step 8), separate from login.
- **eve:** X sign-in *for posting* is a Vercel Connect **custom OAuth connector** — eve's `connect()` runs the per-user consent, stores/refreshes tokens, and parks the turn until authorized. (Requires a real user principal on the eve channel → depends on the channel-auth work.)
- **open:** build Google now or defer? (It converts new strangers; at one user there are none.) X-as-login is risky — X OAuth often returns no email, forcing duplicate accounts.

## 4. Agent listing page (post-login landing)
- Land here after login; trigger create-new-agent; reach existing agents and their details. Simple sort/search, **not a data table**.
- **status:** the route + shell exist (`/agents`, empty state + "New agent"). Design (card grid) is a v0 job; wiring to real agents comes once agents persist (step 6/7 data).
- **open:** what a persisted "agent" record contains — decided when the create flow first needs to save one.

## 5. Account basics
- Logout (**exists** — client button in the shell), plus link-X-account, delete account, change password.
- **fact:** delete-account calls a Supabase `delete_account` RPC whose comment still references legacy tables — check what's really there when we touch it.
- **open:** design + wire these in the settings page (v0 for design; change-password flow is net-new).

## 6. Create-agent page: the chat
The core. UI-wise a possible toggle between chat and form setup, focus on the chat.
- **open:** do we even build the form toggle, or chat-only for now? (A toggle doubles the surface of the thing we're validating.)

**6a. The base chat**
- The DeepSeek base agent's system prompt: how the conversation opens, understands the beat, and handles unrelated/off-topic asks (politely steer back). Flows through the ai-elements chat UI (already wired).
- Per-step cost/usage tracking if minimally possible.
- **eve:** usage is exposed per step (`step.completed` events + automatic `$eve.*` token tags on Vercel Workflow) — a hook can log `{user, session, tokens}` to our store. Tokens only, not dollars.
- **fact — model routing:** DeepSeek runs through Vercel AI Gateway. BYOK keys are team-scoped (fine — usage attributes by the project's OIDC identity, not the key). Cheapest-provider routing is per-request `providerOptions: { gateway: { sort: 'cost' } }`; default routing is uptime/latency, not price.
- **open:** where cost data lives, and whether to add cheapest-routing now or leave DeepSeek as-is (it's already cheap).

**6b. Chat up to scanning setup**
- Understand the beat, tell the user it can scan the web + specific X accounts, take those in.
- **eve:** eve ships `web_fetch` (plain URL fetch — good for pasted links) and a `web_search` that's *provider-resolved*, so with DeepSeek it may be absent. **fact:** don't build scanning on eve's built-in `web_search` — do web + X search inside the Grok tool (xAI's `web_search` + `x_search` together are the recommended news+social combo).

**6c. The Grok X-search tool**
- Minimal system prompt; pass handles + from/to dates; tell the user max ~10 handles for now.
- **fact — dates:** `from_date`/`to_date` are ISO `YYYY-MM-DD` strings (NOT Unix). The existing tool already does this correctly — the Unix worry was unfounded.
- **fact — handles:** xAI allows 20; the `@ai-sdk/xai` schema currently caps at 10. `allowed_x_handles` and `excluded_x_handles` can't be combined.
- **fact — subtool steering:** there is NO parameter to force which x_search subtool (keyword/semantic/user/thread) runs, and prompt-steering it is undocumented. So the lean build — surface matched posts from the given handles, straight up — is also the only supported one.
- **fact — model:** `grok-4-fast` is retired; use `grok-4.3` (1M context, `reasoning_effort: 'low'` for tool calls). $5 per 1k successful searches + tokens. Returns citations/post URLs by default.

**6d. Distillation into news items**
- Web + X results distilled into distinct news items, displayed to the user.
- **status:** the Grok tool already merges findings into `##` items with links; refine the item criteria rather than adding a second pass.
- **open:** context/volume limits to cap (posts in, items out).

**6e. Sharpening the scan**
- e.g. "within FabrizioRomano, ignore these players." Where does this live?
- **eve:** this is eve's **memory pattern**, not prompt surgery and not a one-off skill: `remember`/`list_memories`/`forget` tools write per-user+agent notes to our store; dynamic instructions load them into every scan. On the frontend it's seamless — the user just says it in chat.
- **open:** confirm the memory store shape when we build it.

**6f. Scan frequency**
- hourly/daily/weekly is easy; the hard case is "Mon–Fri, 9–5, every 2h."
- **eve:** eve **Schedules** run as Vercel Cron jobs (min 1-minute, UTC). Static schedules are build-time files; for user-set cadence the documented pattern is schedule rows in our store + agent CRUD tools + one dispatcher that fires due ones — so the chat *can* set up cadence at runtime. Delivery is at-least-once → scans must dedupe.
- **open:** convert natural language → cron in chat? (Yes it's doable — always echo the human-readable interpretation back to confirm.) Enforce a min/cap on scans per day? (Enforce in code, not the prompt; at one user set it generous but build the cap — it's the future free-tier + beta safety net.) How to bring in more test users later.

## 7. The fork: details page first, or drafting first?
- **Path A — details page + manual scan:** watch news items aggregate per agent across scans without re-sending already-seen sources. The details-page dashboard for curated news.
- **Path B — drafting via the same chat:** ask drafting instructions, pick a news item, preview the draft. General vs X-specific drafting instructions; can at least ask premium-vs-normal X (char limit).
- **fact — the real user's feedback points at Path B:** the one tester loved the drafting and asked for "paste any article link (incl. Spanish) → translated, formatted X post." That's drafting *without* scanning (fetch the URL → same draft pipeline; translation is model-native). It ships their request directly.
- **open:** which fork first. (Leaning Path B on the feedback, but decide when we get here.) Is general-vs-X-specific drafting overcomplicating? — probably keep it X-only until a second platform exists.

## 8. Posting to X (both paths converged)
- Details page auto-aggregates; user selects an item → auto-draft → post to X. Multiple items → one post should be easy.
- **eve:** X posting auth = Vercel Connect **custom OAuth connector**; connect just-in-time *in chat* at the first "post it" (lowest-friction point). Posting itself is a `post_to_x` tool; a per-agent **posted-items ledger** in our store guarantees never-repeat.
- **eve — sharpening from here:** natural-language "why this isn't needed" feeds the same memory pattern as 6e. Selecting items to draft together is UI + one draft call.
- **open:** where exactly to prompt the X connection; whether to mine *manual draft edits* for signal (probably overkill now — keep the edited text, extract nothing yet).

## 9. Notifications on new scans
- Ping the user when a scan finds genuinely new news — the core "don't miss breaking news" payoff.
- **eve:** eve ships **channels** — Slack, Telegram, Discord, Teams, Twilio (SMS + voice) — plus custom channels; delivery/OAuth via Vercel Connect. A schedule handler notifies only when there's something new. (No first-party email/WhatsApp channel; those would be a custom channel or a Marketplace sender.)
- **open:** which channel — one message to the tester settles it (Telegram or Slack are the cheap, real defaults).

## 10. YOLO mode: auto-posting
- Once confident, auto-post on breaking news.
- **eve:** implemented as an approval *policy* — auto-skip the post approval on scheduled runs when YOLO is on, always require it for manual runs.
- **open:** selection logic (multi-item → one post) or simplify to auto-post per item as encountered? The ledger prevents repeats either way. Gate behind an explicit per-agent toggle.

## 11. Pre-post verification in the notification channel
- Before an auto-post, notify for final approval: stop it, text back changes, get the corrected draft, approve — same loop on the website.
- **eve:** approval is first-class — `approval: always()` parks the run durably; Slack/Telegram render approve/deny natively; the web surface answers via `inputResponses`.
- **fact:** "edit from the notification" isn't a built-in — model it as *deny-with-feedback* → the agent re-drafts → a fresh approval arrives.

## 12. Agent details page: trace UI
- A trackable view of scans, what was posted, and the reasoning behind it. Two audiences.
- **eve:** every session stream is durably recorded and replayable (`GET /eve/v1/session/:id/stream`), so a past scheduled run's trace can be rendered after the fact. **User-facing:** a curated narrative (text + tool names/outcomes), not raw thinking. **Developer-facing:** the full event stream + `$eve.*` token tags in the Vercel Workflow dashboard.
- **fact:** no session-listing API — record run sessionIds in our store as they happen.

## 13. Listing page, revisited
- The mature listing: create more agents, open each agent's details.
- **status:** folds into the step-4 listing + step-12 details as they get wired; not a separate build.

## 14. Cost tracking → pricing → Stripe
- Sync usage → cost → tiers; Stripe (+ Link) for subscriptions limiting agents / scan+post frequency / connected accounts / notifications.
- **fact:** the usage data comes free from the step-6a hook; a small model→price map turns tokens into dollars (note: the gateway reports $0.00 for BYOK-served requests — use market cost or token counts).
- **open:** beta mode (full flows, capped worst-case spend, no billing code — reuse the step-6f caps); freemium (same caps, low); can three tiers even be set without real usage data? (No — instrument now, run capped free betas, calibrate tiers only once a handful of real users exist.) Stripe via the Vercel Marketplace when that time comes.

## 15. Evals & validated learning
- eve-specific evals; stop testing only Barcelona/Bollywood; reconcile the paste-a-link feedback via Mom Test into a general feature.
- **eve:** evals are `evals/*.eval.ts` driving the real HTTP surface — `dispatchSchedule` + `attachSession` to eval the scan pipeline; deterministic gates (`calledTool`, counts) + LLM-judge (`factuality`, `closedQA`) for scan/draft quality.
- **the extraction:** the tester's real need behind "NYT link → post" is *"turn any source I trust into a post in my voice/format, in any language."* Scanning and paste-a-link are two intake channels for one pipeline — build the pipeline, not the one-off importer.
- **open:** define 2–3 named test beats (e.g. football transfers / a web-heavy English beat / a Spanish-language beat) as the standing fixtures; how to recruit and learn from more testers without over-fitting the one.

## 16. Slicing for v0 and implementation
- Split the above into individual implementable/testable slices (one branch each, `ft/*`), and decide the v0 page work.
- **status:** in motion — the `/agents` restructure is done; the next v0 slice is the listing + create-agent page (prompt lives outside this doc / in-session). The chat itself is never a v0 job (it's the eve-wired ai-elements component).

---

## Parking lot (carried, not now)
- More platforms in *and* out (Instagram, Bluesky, …) — each is a new intake tool + format profile + connection; the step 6/8 shapes generalize.
- User-configurable bias/beliefs (e.g. post Ronaldo news with the user's slant) — a memory-pattern variant applied at drafting time.
- Auto-reply on certain posts as an engagement feature — after posting autonomy is trusted.
