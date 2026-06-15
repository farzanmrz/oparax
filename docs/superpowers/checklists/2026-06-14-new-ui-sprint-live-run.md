# New UI — live-run verification checklist

_Hand-off for the developer · 2026-06-14_

The new UI is **code-complete and self-verified** (`pnpm build` + `pnpm lint`
green; browser self-check of the new shell, settings, and scan/detail with the
test account). What remains is the **live run with real external calls**, which
was intentionally left for you (no paid Grok calls, no real X OAuth).

Everything is on one branch (`ft/new-ui-sprint`) with one PR into `dev`. Run it
and walk this list. Login: `testuser@oparax.com` / `hello123` (or your account).

```bash
git checkout ft/new-ui-sprint && pnpm install && pnpm dev
```

## Sidebar
- [ ] Nav: **Agents · Insights (Soon) · Settings**; no Accounts list, no gear popup.
- [ ] On `/dashboard/settings` the **Settings submenu** shows three items: Profile · Notifications · Account settings.
- [ ] Footer: avatar + username; the **sign-out icon** is always visible, red on hover, one click.
- [ ] Collapse toggle works (labels hide, icons remain).
- [ ] Agents link points to `connect-x` until X is linked (X-gate intact); username still shown.

## Settings — Profile (now includes connections)
- [ ] Single-scroll page; scrolling highlights the matching submenu item, **including "Account settings" at the bottom**.
- [ ] Profile is one card: avatar + **Change photo**, full-width **Name**, **Email/Phone** paired, the **connection pills** inline (live X pill + greyed "Soon" platforms, no "Connected accounts" header), then **Save**.
- [ ] **Save** is disabled until you edit Name or Phone; editing enables it. Click Save → name persists, "Saved." shows, and the **sidebar username updates**. Email/Phone are display-only.
- [ ] **Connect X (LIVE):** click the X pill → real X OAuth → returns connected (`?next=` brings you back here). _Real external flow._
- [ ] **Disconnect X (LIVE):** click the connected X pill → it **always** opens the confirm modal (Disconnect / Cancel) — it never disconnects instantly. Confirm → disconnects + falls back to "Connect". _Real route + RPC._

## Settings — Notifications / Account
- [ ] Notifications toggles are **greyed / inert** (with a "coming soon" hint) — they persist nothing.
- [ ] Account settings: "Change password" is an inert "Coming soon" stub; **Delete account** is a small red button in a neutral row (not a big red-outlined block). Open its confirm modal and **Cancel** (don't delete).

## Settings — unsaved-changes guard
- [ ] Edit Name or Phone (don't Save), then try to: click a sidebar item, reload, press browser Back, or sign out → each warns "you have unsaved changes…" and lets you cancel. Saving (or discarding) clears the guard.

## Scan + agent-detail
- [ ] `/dashboard/agents/new` renders on the design system (behind the connect-x gate until X is linked — expected).
- [ ] **Run a scan (LIVE Grok):** create an agent, run it → preview (story cards + drafts) → **Save Agent** → detail page. _Paid Grok call._
- [ ] **Agent detail:** stat cards + run history; a run item shows its status pill, draft editor, and source/evidence block.
- [ ] **Redraft / Post (LIVE X):** redraft, then **Post** one item to X. **Edit agent settings** saves. _Real post._

## Behavior contracts (should be unchanged — spot-check)
- [ ] `name="username"` + `updateUsername`; `deleteAccount` RPC; X connect `startXConnect("/dashboard/settings")` + disconnect `POST /api/x/disconnect`; the run → preview → save → post/redraft pipeline + request bodies.

## Known follow-ups (not blockers)
- **Dead code from the restyle:** `components/loop/connect-x.tsx` (`ConnectX`), `components/loop/disconnect-x-button.tsx` (`DisconnectXButton`), `components/sign-out-button.tsx` (`SignOutButton`) lost their last consumers (the connect-x gate uses a different `ConnectXButton`). Plus some old `?section=` settings CSS in `app/workspace.css`. Safe to remove in a separate cleanup pass.
- **Browser-back guard** is best-effort (a `popstate` sentinel); reload / tab-close / sidebar-nav / sign-out are covered reliably via `beforeunload` + in-app confirms.
