---
paths:
  - "lib/x/**"
  - "app/auth/x/**"
  - "ingest/**"
---

# X (link + post)

Skills: `supabase` for the store/link-state work, `vercel:nextjs` for the OAuth route
handlers and server actions. The platform-level ingestion architecture (persistent
stream, one forwarder, Railway) is in AGENTS.md.

## Three things that will bite you

- **`X_BEARER_TOKEN` is used RAW.** URL-decoding the portal's `%2B` / `%3D` escapes
  produces a 401. It is the app-only stream credential, distinct from the
  `X_CLIENT_ID`/`X_CLIENT_SECRET` OAuth2 pair.
- **Never trust documented caps.** The docs say 1,000 stream rules; the live app
  returns **5 per app, 15 per project**. Re-probe
  `GET /2/tweets/search/stream/rules/counts` plus a bare stream connect after any
  account, app, tier or billing change — and before moving credentials to a new app,
  which resets every probe result.
- **Refresh-token rotation is undocumented.** Persist a new `refresh_token` whenever X
  returns one; keep the stored one when it doesn't.

## Tier: FREE, deliberately

Pay-per-use is opt-in, so a project stays Free until billing is attached — nothing is
misconfigured. A live probe confirmed filtered-stream access on the free app (`409
RuleConfigurationIssue`, not a 403 tier refusal), and at one user the caps aren't close.

The real exhaustion risk is **delivery volume, not rules**, so the ingestion worker
counts every stream delivery into `usage_events` and alarms at 80% of the observed cap.
Upgrading is then a billing flip with **zero architecture change** — same endpoint,
same code path.

## Tokens never leave `lib/x`

`x_accounts` is deny-all RLS on purpose: the browser's publishable key cannot read the
token columns. Only `lib/x/store.ts` (service-role) touches them, scoped by `user_id`.
`getXLinkState()` is the only link info that crosses to the client, and it returns
`{ linked, handle, tier }` — never a token.

Token and revoke calls use HTTP Basic with `X_CLIENT_ID:X_CLIENT_SECRET`. The callback's
auth code expires in ~30s — exchange it before any DB work.

## The post surface is the feed draft card

`app/agents/[id]/feed-item.tsx`'s `DraftCard` renders `PostToXControl` in place of an
unposted draft's actions:

| State | Renders |
|---|---|
| not linked | a **Connect X** link (`GET /auth/x?returnTo=<pathname>`) |
| linked, unposted | **Post**, flipping to an inline Confirm/Cancel panel (no modal), disabled the moment `twitter-text` says the draft would 4xx at X |
| `posted_at` + `posted_url` | a "Posted to X" pill linking the post |
| `posted_at`, null `posted_url` | a distinct warning pill with recovery-via-edit copy — X accepted but the outcome stamp failed or is ambiguous (see `draft-platform-switcher.tsx`) |

`postDraftToX` / `unlinkXAccount` (`lib/x/actions.ts`) are invoked straight from
`PostToXControl`. `page.tsx` feeds each card `getXLinkState().linked` plus the winning
draft's `posted_at` / `posted_url`.

## Settled, with the fact that settled it

- **Stream rules are shared and routed by author in Supabase — never per-user.** At 5
  rules/app, five customers would exhaust per-user rules immediately, and author-based
  routing dedups naturally. One rule holds ~40 `from:` handles → ~200 handles of
  headroom.
- **Rule shape:** `(from:h1 OR from:h2 …) -is:retweet -is:quote -is:reply` — negate
  each exclusion separately, always parenthesise the author group.
- **No `lang:` filter.** It discards posts we want (Reshad monitors English and
  Spanish). Language is a *drafting* concern.
- **Handle verification is not `x_user_search`.** Fuzzy search drops valid accounts
  outranked by popular near-matches. Identity comes from the OAuth link instead —
  `createDesk` reads `reporter_handle` off `x_accounts`, never from user input.

## Not in this repo

The X developer app must register both `http://localhost:3000/auth/x/callback` and
`https://oparax.ai/auth/x/callback` as a confidential **Web App**; a mismatch looks
like an app bug but isn't. Posting is pay-per-use — $0.015/post, $0.20 with a URL — and
a negative credit balance blocks posting.
