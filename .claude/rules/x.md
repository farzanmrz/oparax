---
paths:
  - "lib/x/**"
  - "app/auth/x/**"
  - "ingest/**"
---

# X (link + post)

## API tier: FREE, deliberately (decided 2026-07-21)

The dev console shows Free tier because pay-per-use is opt-in — a project stays Free until
billing is explicitly attached; nothing is misconfigured. **We stay on Free until a meter says
otherwise.** Grounds: the live probe confirmed filtered-stream access on the free app (`409
RuleConfigurationIssue`, not a 403 tier refusal), and with one user the binding caps aren't
close (1 rule ≈ 40 handles; live caps 5 rules/app, 15/project). The real exhaustion risk is
**delivery/read volume**, not rules — so the ingestion worker must count every stream delivery
into the `usage_events` ledger and alarm (Slack) at 80% of the observed cap; upgrading is then
a billing flip with **zero architecture change** (same endpoint, same code path).

**Caveats that must survive into every session:**
- **Never trust documented caps.** Docs said 1,000 rules; the live app returns 5/15. After ANY
  account, app, tier, or billing change, re-probe `GET /2/tweets/search/stream/rules/counts`
  and a bare stream connect before trusting anything.
- **Decided 2026-07-21: stick with the existing app for now.** If a company-account app is
  ever created, it resets all probe results — re-probe `rules/counts` + a bare stream connect
  before moving `X_BEARER_TOKEN` + client keys.
- **`X_BEARER_TOKEN` is used RAW** — URL-decoding the portal's `%2B`/`%3D` escapes produces a
  401. It is app-only (the stream credential), distinct from the `X_CLIENT_ID/SECRET` OAuth2
  pair. The token exposed in chat was rotated 2026-07-21; the fresh value lives only in
  `.env.local` — never commit it.

- `supabase` for the store/link-state Supabase work; `vercel:nextjs` for the OAuth route handlers + server actions.

## Tokens never leave `lib/x`

`x_accounts` has RLS enabled with NO policies (deny-all) on purpose — the browser's publishable key can't read the token columns. Only `lib/x/store.ts` (service-role) reads/writes them, scoped by `user_id`. `getXLinkState()` is the ONLY link info that crosses to the client, and it returns `{ linked, handle, tier }` — never a token.

## Refresh-token rotation is undocumented

Always persist a new `refresh_token` when X returns one, keep the stored one when it doesn't.

## Confidential client

Token/revoke calls use HTTP Basic auth with `X_CLIENT_ID:X_CLIENT_SECRET`. The auth code from the callback expires in ~30s — exchange it before any DB work.

## The reporter's post surface is the feed draft card

`app/agents/[id]` (the desk Feed) is where a reporter links X and posts — `agent-dashboard.tsx` and its `DraftsTab` are gone, deleted with the rest of the old desk pipeline. Each story's draft card (`app/agents/[id]/feed-item.tsx`'s `DraftCard`) renders `PostToXControl` (`app/agents/[id]/post-to-x-control.tsx`) in place of an unposted draft's actions: a **Connect X** link (`GET /auth/x?returnTo=<pathname>`) when `getXLinkState().linked` is false; when linked, a **Post** button that flips to an inline Confirm/Cancel panel (no modal — the confirm-before-Confirm gate ported from the old `DraftsTab` pattern) before calling `postDraftToX`, disabled the moment `twitter-text` says the draft would 4xx at X. A posted draft's card instead shows a "Posted to X" pill and, when captured, a link to `posted_url`. A third state exists when `posted_at` is set but `posted_url` is null (X accepted the post but the outcome stamp failed, or the outcome is genuinely ambiguous): the card renders a distinct warning-pill state with recovery-via-edit copy instead — see `draft-platform-switcher.tsx` for the exact rendering. `postDraftToX` / `unlinkXAccount` (`lib/x/actions.ts`, `"use server"`) are invoked straight from `PostToXControl`; `page.tsx` feeds each `FeedItemCard` `getXLinkState().linked` plus the story's winning draft `posted_at` / `posted_url` off `post_drafts`.

## Dashboard-side config (not in this repo)

The X developer app must register both callback URIs — `http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback` — as a confidential **Web App**; a mismatch looks like an app bug but isn't.

## Cost

X posting is pay-per-use ($0.015/post, $0.20 if the post contains a URL); a negative credit balance blocks posting.

## Settled, with the fact that settled it

The platform-level ingestion architecture (persistent stream, one forwarder, Railway) is in `AGENTS.md`. These are the X-specific ones:

- **Stream rules are shared and routed by author in Supabase — never per-user.** Live caps are **5 rules/app, 15/project** (the docs claimed 1,000). Five customers would exhaust per-user rules immediately, and author-based routing dedups naturally across users. One rule holds ~40 `from:` handles, so ~200 tracked handles of headroom.
- **Rule shape:** `(from:h1 OR from:h2 …) -is:retweet -is:quote -is:reply` — negate each exclusion separately, always parenthesise the author group.
- **No `lang:` filter.** It discards posts we want (Reshad monitors English and Spanish). Language is a *drafting* concern: translate the source, then draft in the reporter's voice.
- **Handle verification is not `x_user_search`.** Fuzzy search drops valid accounts outranked by popular near-matches, and a wrong handle simply returns nothing. Identity now comes from the X OAuth link at agent creation instead — `createDesk` reads `reporter_handle` off `x_accounts` and never from user input.
