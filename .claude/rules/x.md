---
paths:
  - "lib/x/**"
  - "app/auth/x/**"
---

# X (link + post)

- `supabase:supabase` for the store/link-state Supabase work; `vercel:nextjs` for the OAuth route handlers + server actions.

## Tokens never leave `lib/x`

`x_accounts` has RLS enabled with NO policies (deny-all) on purpose — the browser's publishable key can't read the token columns. Only `lib/x/store.ts` (service-role) reads/writes them, scoped by `user_id`. `getXLinkState()` is the ONLY link info that crosses to the client, and it returns `{ linked, handle }` — never a token.

## Refresh-token rotation is undocumented

Always persist a new `refresh_token` when X returns one, keep the stored one when it doesn't.

## Confidential client

Token/revoke calls use HTTP Basic auth with `X_CLIENT_ID:X_CLIENT_SECRET`. The auth code from the callback expires in ~30s — exchange it before any DB work.

## The reporter's post surface is the desk Drafts tab

`app/agents/[id]` (`agent-dashboard.tsx`'s `DraftsTab`) is where a reporter links X and posts. A **Connect X** control (a plain link to `GET /auth/x`) shows when `getXLinkState().linked` is false; when linked, each unposted draft gets a **Post to X** button — behind an explicit Confirm step, since posting is real money and irreversible — that calls `postDraftToX`. A posted draft renders a link to its `posted_url` instead. `postDraftToX` / `unlinkXAccount` are `"use server"` actions invoked straight from that client component; `page.tsx` feeds it `getXLinkState().linked` plus each draft's `posted_at` / `posted_url`.

## Dashboard-side config (not in this repo)

The X developer app must register both callback URIs — `http://localhost:3000/auth/x/callback` and `https://oparax.ai/auth/x/callback` — as a confidential **Web App**; a mismatch looks like an app bug but isn't.

## Cost

X posting is pay-per-use ($0.015/post, $0.20 if the post contains a URL); a negative credit balance blocks posting.
