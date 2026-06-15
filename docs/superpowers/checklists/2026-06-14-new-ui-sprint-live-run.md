# New UI Sprint — live-run verification checklist

_Hand-off for the developer · 2026-06-14 · issue #27_

The sprint is **code-complete and self-verified** (build + lint green per issue and
on the integrated branch; the new UI was browser-driven end-to-end with the
test account). What remains is the **live run with real external calls**, which
was intentionally NOT executed (no paid Grok calls, no real X OAuth without you).

Run the app on the integrated branch (or after merging the PRs into `dev`) and
walk this list. Login: `testuser@oparax.com` / `hello123` (or your account).

## Sidebar (#23)
- [ ] Nav shows **Agents · Insights (Soon, dimmed) · Settings**; no Accounts list, no gear popup.
- [ ] On `/dashboard/settings` the **Settings submenu** appears (Profile · Connections · Notifications · Account settings).
- [ ] Footer shows avatar + username; the **sign-out icon** is always visible and turns red on hover; one click signs out.
- [ ] Collapse toggle on the header edge works (labels hide, icons remain); submenu + sign-out hide while collapsed.
- [ ] Username still drives the footer label; the **Agents** link points to `connect-x` until X is linked (X-gate intact).

## Settings page (#24 / #25)
- [ ] Single-scroll page; scrolling highlights the matching submenu item, **including "Account settings" at the very bottom** (scroll-spy fix).
- [ ] **Profile:** edit the Name field → it saves on change/blur and "Saved." appears; the **sidebar username updates** (router refresh). Email/Phone are display-only.
- [ ] **Connections:** the X pill shows your handle + green pulse when connected, or "Connect" + red pulse when not; other platforms are greyed "Soon".
- [ ] **Connect X (LIVE):** click the X "Connect" pill → real X OAuth → returns to settings connected (`?next=` returns you here). _Real external flow._
- [ ] **Disconnect X (LIVE):** click the connected X pill → confirm modal (warns about N saved agents) → disconnect → falls back to "Connect". _Real route + RPC._
- [ ] **Notifications:** toggles flip visually (they persist nothing this sprint — expected).
- [ ] **Account settings:** "Change password" is an inert "Coming soon" stub; **Delete account** is the only red control. Open its confirm modal and **Cancel** (don't delete) to confirm the modal works.

## Scan + agent-detail (#26)
- [ ] `/dashboard/agents/new` (create/scan) renders on the design system (it's behind the connect-x gate until X is linked — expected).
- [ ] **Run a scan (LIVE Grok):** create an agent, run it → one Grok call scans X and drafts stories → the in-memory **preview** renders (story cards + per-platform drafts). _Paid Grok call._
- [ ] **Save Agent** persists the run and routes to the detail page; the agent appears in the list.
- [ ] **Agent detail:** stat cards + run history render; a run item shows its status pill (draft/posted/failed), a labelled draft editor, and the grouped source/evidence block (tweet embed + source links).
- [ ] **Redraft / Post (LIVE X):** redraft a draft, then **Post** one item → it posts to X via the existing route. _Real post._
- [ ] **Edit agent settings** on the detail page saves (name/handles/monitoring/drafting) via the existing PATCH.

## Behavior contracts (should be unchanged — spot-check)
- [ ] `name="username"` + `updateUsername`; `deleteAccount` RPC; X connect `startXConnect("/dashboard/settings")` + disconnect `POST /api/x/disconnect`.
- [ ] The run → preview → save → post/redraft fetch pipeline and all request bodies are byte-identical (verified in review; confirm nothing regressed live).

## Known minor items (not blockers — your call to fix or defer)
- **Profile "Saved." note lingers** while you start typing a new name (it clears once the next save resolves). Cosmetic; a clean fix collides with `useActionState`'s latched `success` + the refs-in-render lint rule, so it was left as-is.
- **Same-value retry after a server error**: if a username save fails server-side, re-submitting the *identical* value is short-circuited by the optimistic dedupe (change-and-revert to retry). Narrow (needs a server error).
- **Dead code from the restyle**: `components/loop/connect-x.tsx` (`ConnectX`), `components/loop/disconnect-x-button.tsx` (`DisconnectXButton`), `components/sign-out-button.tsx` (`SignOutButton`) lost their last consumers; the old `?section=` settings CSS in `app/workspace.css` is now unused. Flagged for a separate cleanup PR.
