// lib/x/post-core.ts
//
// The actual X-posting logic, deliberately NOT in a "use server" file. Every export in a
// "use server" file becomes its own reachable Server Action endpoint by build-time id,
// regardless of which client component (if any) references it — so a function that trusts a
// caller-supplied ownerId, like this one, must never live in that file. `lib/x/actions.ts`'s
// `postDraftToX` (the real browser-facing Server Action) resolves ownerId from the live
// session, proves RLS ownership, then calls this; `app/api/slack/interactions/route.ts` and
// `lib/agent/draft-pipeline.ts`'s auto-post path both already resolve ownerId server-side with
// no user session available, and import this module directly — never through the Action
// surface.
import * as Sentry from "@sentry/nextjs";
import twitterText from "twitter-text";
import { X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTweet, refreshTokens } from "@/lib/x/api";
import { getXAccount, updateXTokens } from "@/lib/x/store";

/** X posting is pay-per-use, and a post containing a URL costs materially more (see
 *  `.claude/rules/x.md`). Priced here rather than left null so per-owner spend in
 *  `usage_events` is real money, not a bare event count — that ledger is what a future
 *  subscription tier would meter against. Update both numbers here if X changes its rates. */
function X_POST_COST_USD(text: string): number {
  return /https?:\/\//i.test(text) ? 0.2 : 0.015;
}

/** Pulls the HTTP status out of an api.ts error ("X <endpoint> <status>: <body>"),
 *  anchored at the start so a status-like number inside the response body can't spoof
 *  it. Returns null for a timeout/network error, which carries no status. */
function httpStatusOf(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/^X \S+ (\d{3}): /);
  return match ? Number(match[1]) : null;
}

/** Releases a `posted_at` CAS-claim. Best-effort: a failed release just leaves the
 *  draft claimed — it must never throw out of the action. Logged (not silently
 *  swallowed) since an unreleased claim permanently blocks retry. */
async function releaseClaim(
  admin: ReturnType<typeof createAdminClient>,
  postDraftId: string,
): Promise<void> {
  const { error } = await admin
    .from("post_drafts")
    .update({ posted_at: null })
    .eq("id", postDraftId);
  if (error) {
    console.error(`releaseClaim: failed to release claim for draft ${postDraftId}`, error);
  }
}

/** The actual posting logic, independent of how the caller resolved ownerId. `postDraftToX`
 *  (the "use server" browser action in lib/x/actions.ts) resolves ownerId via the live
 *  session, does its own RLS-scoped ownership proof, THEN calls this; `draft-pipeline.ts`'s
 *  auto-post path already knows ownerId from the experiment row and calls this directly, with
 *  no session; `app/api/slack/interactions/route.ts` resolves ownerId from the linked
 *  `slack_accounts` row. Same CAS-claim, token-refresh, createTweet, outcome-stamp behavior
 *  either way — only the ownership-resolution step differs between callers, so this re-reads
 *  the draft via the ADMIN client (not any RLS-scoped read a caller may already have done — that
 *  read exists purely to prove a browser caller may act on this draft, and its result isn't
 *  passed in here) to get the text to post and the experiment_id for revalidation, and
 *  cross-checks the passed `ownerId` against the draft's OWN owner (defense in depth — this is
 *  not itself an authentication check, since this function is never reachable as a Server
 *  Action; every real caller already resolved ownerId server-side before calling here). */
export async function postDraftToXForOwner(
  postDraftId: string,
  ownerId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: draft, error: draftError } = await admin
    .from("post_drafts")
    .select("id, experiment_id, posted_at, model_calls(output), experiments(owner_id)")
    .eq("id", postDraftId)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };
  if (draft.experiments?.owner_id !== ownerId) {
    return { ok: false, error: "That draft could not be found." };
  }
  if (draft.posted_at) return { ok: false, error: "This draft was already posted to X." };

  const text = draft.model_calls?.output;
  if (!text) return { ok: false, error: "This draft has no text to post." };

  // Server-side length gate, mirroring the client's twitter-text check (post-to-x-control.tsx) —
  // a repair failure, a human edit, or a bypassed UI path (e.g. a hand-crafted Slack button
  // value) could otherwise reach here over the ceiling with no server-side check at all.
  // accountTier is hard-declared "standard" at every drafting call site this slice (Deferred:
  // real tier resolution) — the same ceiling drafting itself enforces.
  const weightedLength = twitterText.parseTweet(text).weightedLength;
  if (weightedLength > X_CHAR_LIMITS.standard) {
    return {
      ok: false,
      error: "This draft is over X's length limit and can't be posted as-is.",
    };
  }

  // CAS-claim FIRST: only succeeds if posted_at is still null, so a concurrent double-click
  // loses here. Claiming before the token refresh also means only the winner ever refreshes
  // — otherwise two concurrent clicks would both spend the same rotating refresh token,
  // invalidating one another.
  const { data: claimed, error: claimError } = await admin
    .from("post_drafts")
    .update({ posted_at: new Date().toISOString() })
    .eq("id", postDraftId)
    .is("posted_at", null)
    .select("id");
  if (claimError || !claimed || claimed.length === 0) {
    return { ok: false, error: "This draft was already posted to X." };
  }

  // Resolve a usable access token. A missing account or a failed refresh means nothing was
  // posted, so releasing the claim here is safe and lets the reporter retry after fixing it.
  const account = await getXAccount(ownerId);
  if (!account) {
    await releaseClaim(admin, postDraftId);
    return { ok: false, error: "Connect your X account first." };
  }

  let accessToken = account.access_token;
  if (new Date(account.token_expires_at).getTime() - Date.now() < 60_000) {
    try {
      const refreshed = await refreshTokens(account.refresh_token);
      accessToken = refreshed.accessToken;
      // rotation is undocumented — keep the prior refresh token when X omits a new one.
      const newRefresh = refreshed.refreshToken ?? account.refresh_token;
      const tokenExpiresAt = new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString();
      await updateXTokens(ownerId, { accessToken, refreshToken: newRefresh, tokenExpiresAt });
    } catch {
      await releaseClaim(admin, postDraftId);
      return {
        ok: false,
        error: "Your X connection expired — reconnect your X account in settings.",
      };
    }
  }

  let tweet: { id: string };
  try {
    tweet = await createTweet(accessToken, text);
  } catch (error) {
    // The claim is held. Only release it when X DEFINITELY did not create the post —
    // i.e. it answered with a 4xx client error. On a timeout, dropped connection, or 5xx
    // the post MAY have gone through, so keep the claim (fail closed) rather than risk a
    // double-post on retry.
    const status = httpStatusOf(error);
    if (status !== null && status >= 400 && status < 500) {
      await releaseClaim(admin, postDraftId);
      // Definitive failure — release + surface + unsampled Sentry capture is the frozen
      // three-leg protocol (AGENTS.md); error capture is unsampled regardless of
      // tracesSampleRate, so this is always recorded, not subject to the 10% trace sample.
      Sentry.captureException(error, {
        tags: { postDraftId, ownerId, xStatus: status },
      });
      if (status === 401) {
        return {
          ok: false,
          error: "Your X connection expired — reconnect your X account in settings.",
        };
      }
      if (status === 403) {
        return {
          ok: false,
          error: "X rejected this post — it may be a duplicate, too long, or against X's rules.",
        };
      }
      return { ok: false, error: "X rejected this post. Please review the draft and try again." };
    }
    return {
      ok: false,
      error: "Couldn't confirm the post reached X. Check your X account before trying again.",
    };
  }

  // Posted. Stamp the outcome best-effort — the post already succeeded and posted_at is
  // set, so a stamp failure must NOT release the claim or fail the action (the URL is
  // returned below regardless). Logged (not silently swallowed): a missing posted_url/
  // posted_tweet_id after a real post is a real support-relevant discrepancy.
  const url = `https://x.com/${account.handle}/status/${tweet.id}`;
  const { error: stampError } = await admin
    .from("post_drafts")
    .update({ posted_tweet_id: tweet.id, posted_url: url })
    .eq("id", postDraftId);
  if (stampError) {
    console.error(
      `postDraftToXForOwner: post-outcome stamp failed for draft ${postDraftId} (post IS live at ${url})`,
      stampError,
    );
  }

  // Meter the post (AGENTS.md: every touch point stamps usage_events). X posting is
  // pay-per-use and was the one real-money touch point writing no ledger row at all, so
  // per-owner spend under-reported by exactly the posting cost. Stamped only after X
  // confirmed the post, matching every other metering call site in the repo. Best-effort:
  // the post is already live, so a ledger failure must never surface as a posting failure.
  const { error: meterError } = await admin.from("usage_events").insert({
    owner_id: ownerId,
    kind: "x_post",
    units: 1,
    cost_usd: X_POST_COST_USD(text),
    ref_id: postDraftId,
  });
  if (meterError) {
    console.error("postDraftToXForOwner: usage_events stamp failed", meterError);
  }

  return { ok: true, url };
}
