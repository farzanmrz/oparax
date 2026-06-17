# Chat experience redesign + connect-X rework — design spec

Date: 2026-06-16 · Branch: `ft/35` (extends #35) · Status: design agreed via visual brainstorm

## Goal

Turn the new-agent chat from a bland wrapper into an assistant-led, on-brand, artifact-rich
experience; decouple X connection from agent creation; and cleanly separate the **scan** (news)
representation from the **draft** representation.

## In scope (this branch)

### 1. Shell / chrome
- Remove the surrounding card — messages render directly on the page (graphite page bg, no panel).
- Move the Chat/Form toggle to the **right edge** of the "New agent" heading (segmented control, two
  icons, Chat default).
- Branded Oparax avatar on assistant messages: white logo SVG on the blue circle. User messages use
  their profile pic / initials. Update the sidebar mark to the same scalable logo.
- **Floating** input bar (Claude/ChatGPT style): centered, max-width, rounded, `+` icon on the left
  (future file attach), taller multiline body that scrolls internally, send button on the right.
  Blue accent on the `+`, send, and focus ring.

### 2. Conversation model
- Oparax **greets first** — a seeded initial assistant message (no model call, instant, free).
- Assistant turns: avatar + plain text, plus inline interactive controls / artifacts. User turns:
  avatar + bubble.
- Interactive controls are AI-SDK **tool-UI-parts** (React components rendered from tool results);
  free-text input always works as a fallback at every step.

### 3. Flow / steps
1. **Beat** (scanning instructions) — guided capture.
2. **Sources** — picker: `X Posts/Tweets` and `Web Search Articles` as single-line logo+label chips;
   selection shown by **highlight only (no tick)**; multiselect + explicit **Add** button; free-text /
   "not sure, help me" fallback.
   - X → handle entry → `verifyHandles` → result chips (✓ confirmed / ✗ not found).
   - Web → domain entry → `validateSites` → reachability / paywall chips.
3. **Voice / examples** (optional): "paste tweet URLs — yours or anyone's", **or** "Connect X to use
   my recent posts" (optional enhancement), **or** "Skip". Reuses `lib/x/syndication.ts` fetch.
4. **Name** — suggested at the **end**, once the purpose is understood.
5. **Ready** → **Save agent** or **Run a draft**.

### 4. Connect-X rework
- Remove the creation gate everywhere it blocks creation: `app/dashboard/agents/new/page.tsx`,
  `agents/page.tsx`, `layout.tsx`, `dashboard/page.tsx`, `lib/auth/modal-actions.ts`. Configuring,
  saving, and drafting never require X.
- Connect-X is offered **optionally** at the voice step, and **required only at posting**.
- Duplicate `auth.linkIdentity` handling is done (delegated branch `fix/x-link-duplicate`): reroute to
  connect-x with a masked-email "already linked — unlink there first" error. Merge into `ft/35`.

### 5. Artifacts (scan and draft are SEPARATE representations)
- **Source tweet card:** avatar · name · handle · date (right) · open icon · text. No actions.
- **Source article card:** favicon · domain · date · visit icon · clamped headline.
- **Scan news (story):**
  - Compact card in a responsive grid (`auto-fit`, multiple per row): straight **description** (no
    title, clamp 2 lines) → type-count pills (`2 tweets`, `3 articles`) → source preview (overlapping
    author avatars) + **View sources**.
  - **View sources** expands the card inline to the full source **carousel** (fixed-width ~232px
    cards, text clamped to 3 lines, mixed tweets + articles, horizontal scroll, right-edge fade).
- **Draft:**
  - Posted-style preview (user avatar/name/handle · now · draft text · **soft** char count — no
    hard 280 limit; true limit deferred to tier detection).
  - **No inline edit/connect buttons unless X is connected.** Refine by telling Oparax what to change
    (chat → redraft).
  - Multiselect drafts → a single shared bottom bar: **Connect X to post** → **Post (N selected)**.

### 6. Branding
- Push accent blue: avatar, selected states, links, pills, and primary CTAs (Post / Add) go blue.
  Note: this bends the design system's "white = actions" rule — accepted for stronger identity, easy
  to revert.
- Logo asset: produce a white Oparax SVG on the blue circle; reuse for the avatar and sidebar.

### 7. Instruction-capture depth (v1)
- Guided capture for scanning + drafting instructions with a light confirm step. Drafting is
  **general instructions only** (no platform-specific fields yet). Heavy iterative tuning is deferred.

## Out of scope (future issues)
- **Char-limit by X tier** detection + post-error parsing — ships with the posting feature.
- **Scan "tune your beat" loop** — mine ✓/✗ examples from results to auto-improve the scan prompt.
- **Multi-platform / platform-specific drafting** — general only for now.
- **Media / image attachment** on drafts — the `+` icon is the seed.
- **Auto-fetch candidate tweets from monitored handles** for the voice step (needs per-handle timeline
  fetch). Your-own-posts-if-connected is the only cheap candidate source.
- **Usage / cost analytics overhaul** — splintered to #36 (parallel `/feature`).

## Constraints
- Keep `pnpm build` green; Biome (semicolons, double-quote, 2-space, 100-col); graphite design system
  is the source of truth; AI SDK v6 two-provider convention; zod for AI-SDK schemas + tool inputs.
- Preserve the behavior contract: server-action field names, the run → preview → save → post/redraft
  pipeline. The connect-X **creation** guard is intentionally removed; the **posting** guard remains.
