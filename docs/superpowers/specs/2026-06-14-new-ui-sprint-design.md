# New UI Sprint — Sidebar + Settings + Scan/Detail redesign

_Design spec · 2026-06-14 · drives the GitHub sprint issues_

## Problem / Context

A new Claude Design export (settings + sidebar) is ready and must be reconciled
with the repo. In Claude Design (chat6) the user restructured the sidebar and
designed a full Settings page; the export's agent card is outdated ("reset" it).
Separately, the manual scan loop (create → scan → preview → save → detail → run →
post) is built and re-skinned but never live-verified, and the user wants the
**scan + agent-detail pages redesigned in-code** on the design system as part of
this sprint (the export does NOT cover those pages).

**Outcome:** the new-UI app is coherent and trustworthy — new sidebar + Settings
wired in, scan/detail pages reworked on the design system, and the manual loop
verified end-to-end — manual-only, no new backend subsystems.

## Scope

**In:**
- Sidebar restructure (per export): nav Agents · Insights (Soon) · Settings with
  an inline submenu (Profile · Connections · Notifications · Account settings) +
  scroll-spy; remove the Accounts list; footer = avatar + username (→ Profile) +
  always-visible red sign-out icon; collapse control on the header edge.
- New Settings page (per export): single-scroll `.card-sec` sections, scroll-spied
  by the submenu. Profile (avatar + Name/Email/Phone side-by-side + Save-on-change),
  Connections (split pills), Notifications (toggles), Account settings (password +
  delete; only Delete is red).
- Redesign the create-agent/scan page and agent-detail page **in-code** on the
  design system (no export design for these), preserving all behavior.
- Verify the manual scan loop end-to-end on the new UI.

**Backend depth (confirmed): UI now, wire only what exists.**
- Wire: username save, X connect/disconnect (existing flows) + disconnect modal,
  delete account (existing RPC).
- Stub/UI-only: non-X connections (greyed "Soon"), Notifications toggles, password
  change. No new OAuth providers, no notifications table, no password flow.

**Out / Not Doing (and why):**
- Scheduled/automated scanning — strictly manual this sprint (cron stays inert).
- Non-X OAuth, notification-preference storage, password-change flow — no backend;
  built as UI/stubs only.
- Porting the export's agent card — it's outdated; keep the current agents pages.
- X-account uniqueness — intentionally not enforced (prior decision).

## Reconciliation summary (export → repo)

- **New component classes** to port into `app/globals.css` / `app/workspace.css`:
  `.pill`/`.pill-logo`/`.pill-body`/`.pblink`, `.snav`/`.snav-item`,
  `.you-line`/`.foot-signout`, `.card-sec`/`.sec-title`, `.switch`/`.knob`,
  `.arow`/`.ghost-btn`, `.avatar-up`, `.lt` (letter tile).
- **Tokens unchanged** (same pure-black/graphite system; export's standalone
  `styles.css` vs our Tailwind `@theme` is a tooling difference, not a design one).
- **Disabled button**: keep the current opacity-fade (already reverted to that).
- **Reference files** (read-only, in the extracted bundle `/tmp/oparax-ds2/...` or
  re-fetch): `templates/agents-home/AgentsHome.dc.html`, `preview/sidebar.html`,
  `preview/connections.html`, `styles.css`, `explorations/*` (rationale).

## Sprint issues (each → an `ft/*` branch → merged to `dev`)

1. **Foundation: design-system classes** — port the new classes above into
   `globals.css`/`workspace.css`; no page wiring yet. Blocks 2–5.
2. **Sidebar restructure** — remove Accounts list; Settings nav item + inline
   submenu + scroll-spy; footer (avatar + username → Profile; red sign-out icon);
   collapse control on header. Preserve X-gating + username display.
3. **Settings page: shell + Profile + Notifications + Account settings** —
   single-scroll page with the 4 `.card-sec` sections + scroll-spy; Profile
   (avatar UI, Name/Email/Phone side-by-side, Save-on-change wired to `username`;
   email/phone UI-only); Notifications (toggles, UI-only); Account settings
   (password stub + delete wired).
4. **Settings page: Connections** — split pills (logo-fill + uniform body, green/
   red/grey states); X wired via existing connect/disconnect + disconnect modal;
   other platforms greyed "Soon".
5. **Redesign scan + agent-detail pages (in-code)** — rework `prompt-lab.tsx` and
   `agent-detail.tsx` UI on the design system; preserve the run → preview → save →
   post/redraft pipeline, server-action field names, and gating. May split 5a/5b.
6. **Verify the manual loop end-to-end** — build/lint/browser self-check across
   the new shell + settings + scan/detail; hand off a live-run checklist (user
   runs real X + Grok).

**Sequencing:** 1 first (foundation). 2, 3+4, and 5 parallelize after 1
(independent areas). 6 last.

## Behavior contracts to preserve (do not break)

- Server-action field `name`s and request bodies across scan/draft/save/post/
  redraft + the `username` field.
- Auth + connect-x guards and `?next=` clamping via `lib/safe-next.ts`.
- The run → preview → save → post/redraft pipeline and its API routes.
- The delete-account RPC flow; username shown in sidebar + editable in Profile.
- One way to reach Settings (sidebar item + footer) — no gear popups.

## Definition of Done

- `pnpm build` + `pnpm lint` green per issue.
- I self-verify (build/lint + `browser-agent`); the **user runs the live X + Grok
  scan** to confirm the loop (no paid API calls without asking).
- Each issue lands on its `ft/*` branch and merges into `dev`; no push to
  `beta`/`main` without explicit instruction.

## Operating model (how the sprint runs)

**Branches.** `dev` is the integration/staging trunk (already == `ft/20` ==
`c21df50`). Each issue gets a branch `ft/<issue#>-<slug>` off `dev`, implemented,
PR'd into `dev`, and merged. `main` and `beta` are untouched — ask before those.

**Per-issue loop** (superpowers process skills + the repo's quality commands):
1. `writing-plans` → a per-issue implementation plan from this spec.
2. Branch off `dev` (optionally `using-git-worktrees` for isolation).
3. Implement via `subagent-driven-development` / `executing-plans`.
4. Verify with `verification-before-completion` — build + lint + `browser-agent`.
   This repo has **no test runner** (AGENTS.md), so TDD-via-tests does not apply;
   build/lint/browser is the verification substitute.
5. `/simplify` then `/code-review` (repo slash commands) — fix findings.
6. Open a PR into `dev` → CI auto-runs the Claude review; use
   `requesting-code-review` / `receiving-code-review` for feedback.
7. `finishing-a-development-branch` → merge into `dev`.

**CI is already wired** (`.github/workflows/`, `CLAUDE_CODE_OAUTH_TOKEN` set):
- `claude.yml` — `@claude` in an issue/PR runs Claude Code in CI on it.
- `claude-code-review.yml` — every PR is auto-reviewed by Claude.
- Optional tweak: scope `claude-code-review.yml` to PRs targeting `dev`.

## Open questions / assumptions

- Scan + detail redesign is **in-code** (no export design) — assumed to follow the
  current design system, not a forthcoming bundle. Confirm if a design is coming.
- Email/phone in Profile are **display/edit UI only** unless an existing backend
  field is found; not new auth.
- Notifications toggles persist nothing this sprint (visual only).
