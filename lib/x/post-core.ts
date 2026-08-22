// lib/x/post-core.ts
//
// The actual X-posting logic, deliberately NOT in a "use server" file. Every export in a
// "use server" file becomes its own reachable Server Action endpoint by build-time id,
// regardless of which client component (if any) references it — so a function that trusts a
// caller-supplied ownerId, like this one, must never live in that file. `lib/x/actions.ts`'s
// `postDraftToX` (the real browser-facing Server Action) resolves ownerId from the live
// session, proves RLS ownership, then calls this; `lib/agent/draft-pipeline.ts`'s auto-post
// path already resolves ownerId server-side with no user session available, and imports this
// module directly — never through the Action surface.

import { checkXPostable, resolveDeskTier, xUnpostableMessage } from "@/lib/agent/desk-config";
import { reportServerLog } from "@/lib/observability/posthog-server";
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

/** Releases a `posting_claimed_at` CAS-claim. Best-effort: a failed release just leaves the
 *  draft claimed — it must never throw out of the action. Logged (not silently
 *  swallowed) since an unreleased claim permanently blocks retry. */
async function releaseClaim(
  admin: ReturnType<typeof createAdminClient>,
  draftId: string,
): Promise<void> {
  const { error } = await admin
    .from("drafts")
    .update({ posting_claimed_at: null })
    .eq("id", draftId)
    .not("posting_claimed_at", "is", null);
  if (error) {
    console.error(`releaseClaim: failed to release claim for draft ${draftId}`, error);
  }
}

/** The actual posting logic, independent of how the caller resolved ownerId. `postDraftToX`
 *  (the "use server" browser action in lib/x/actions.ts) resolves ownerId via the live
 *  session, does its own RLS-scoped ownership proof, THEN calls this; `draft-pipeline.ts`'s
 *  auto-post path already knows ownerId from the agent row and calls this directly, with
 *  no session. Same CAS-claim, token-refresh, createTweet, outcome-stamp behavior
 *  either way — only the ownership-resolution step differs between callers, so this re-reads
 *  the draft via the ADMIN client (not any RLS-scoped read a caller may already have done — that
 *  read exists purely to prove a browser caller may act on this draft, and its result isn't
 *  passed in here) to get the text to post and the agent_id for revalidation, and
 *  cross-checks the passed `ownerId` against the draft's OWN owner (defense in depth — this is
 *  not itself an authentication check, since this function is never reachable as a Server
 *  Action; every real caller already resolved ownerId server-side before calling here). */
export async function publishDraftToXForOwner(
  draftId: string,
  ownerId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: draft, error: draftError } = await admin
    .from("drafts")
    .select("id, agent_id, posted_at, posting_claimed_at, model_call_id, is_winner")
    .eq("id", draftId)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };
  const [{ data: agent, error: agentError }, { data: modelCall, error: modelCallError }] =
    await Promise.all([
      admin.from("agents").select("owner_id, reporter_tier").eq("id", draft.agent_id).maybeSingle(),
      admin.from("model_calls").select("output").eq("id", draft.model_call_id).maybeSingle(),
    ]);
  if (agentError || modelCallError || agent?.owner_id !== ownerId) {
    return { ok: false, error: "That draft could not be found." };
  }
  if (!draft.is_winner)
    return { ok: false, error: "This draft was updated — refresh and try again." };
  if (draft.posting_claimed_at)
    return { ok: false, error: "This draft is currently being posted to X." };
  if (draft.posted_at) return { ok: false, error: "This draft was already posted to X." };

  const text = modelCall?.output;
  if (!text) return { ok: false, error: "This draft has no text to post." };

  const account = await getXAccount(ownerId);
  if (!account) return { ok: false, error: "Connect your X account first." };

  // Server-side validity gate, mirroring the client's twitter-text check (post-to-x-control.tsx)
  // through the SHARED `checkXPostable` helper editDraft also calls — a repair failure, a human
  // edit, or a bypassed UI path (e.g. a hand-crafted API request) could otherwise reach
  // here over the ceiling with no server-side check at all. The desk-resolved tier is the same
  // ceiling drafting, the feed counter, and editDraft enforce; X remains the final arbiter.
  const postable = checkXPostable(text, resolveDeskTier(agent.reporter_tier, account.tier));
  if (!postable.ok) {
    return {
      ok: false,
      error: xUnpostableMessage(postable.reason),
    };
  }

  // CAS-claim FIRST: only succeeds if neither posting state is set, so a concurrent double-click
  // loses here. Claiming before the token refresh also means only the winner ever refreshes
  // — otherwise two concurrent clicks would both spend the same rotating refresh token,
  // invalidating one another.
  const { data: claimed, error: claimError } = await admin
    .from("drafts")
    .update({ posting_claimed_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("is_winner", true)
    .is("posted_at", null)
    .is("posting_claimed_at", null)
    .select("id, posting_claimed_at");
  if (claimError || !claimed || claimed.length === 0) {
    return { ok: false, error: "This draft was already posted to X." };
  }

  const claimTimestamp = claimed[0].posting_claimed_at;
  if (!claimTimestamp) {
    // The update just wrote the claim, so a missing selected value is an unexpected database
    // response. Release rather than leaving the draft permanently unavailable.
    await releaseClaim(admin, draftId);
    return { ok: false, error: "Could not start posting this draft. Please try again." };
  }

  // Resolve a usable access token. A missing account or a failed refresh means nothing was
  // posted, so releasing the claim here is safe and lets the reporter retry after fixing it.
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
      await releaseClaim(admin, draftId);
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
      await releaseClaim(admin, draftId);
      // Definitive failure: release the claim, log the context, and surface the response.
      console.error("x-post: definitive create failure", {
        error,
        draftId,
        ownerId,
        xStatus: status,
      });
      reportServerLog(
        "x-post: definitive create failure",
        {
          error,
          draftId,
          ownerId,
          xStatus: status,
        },
        { distinctId: ownerId },
      );
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
    // X might have accepted the post before the response was lost. Keep it out of the retry
    // path, but clear the in-flight claim so the reporter can use the durable Unconfirmed edit
    // recovery state after checking their account.
    const { error: uncertainStampError } = await admin
      .from("drafts")
      .update({ posted_at: new Date().toISOString(), posting_claimed_at: null })
      .eq("id", draftId)
      .eq("is_winner", true)
      .is("posted_at", null)
      .eq("posting_claimed_at", claimTimestamp);
    if (uncertainStampError) {
      console.error(
        `postDraftToXForOwner: uncertain-outcome stamp failed for draft ${draftId}`,
        uncertainStampError,
      );
    }
    return {
      ok: false,
      error: "Couldn't confirm the post reached X. Check your X account before trying again.",
    };
  }

  // Posted. Clear the claim and atomically stamp the definitive outcome. A stamp failure must
  // not release the claim or fail the action: the post is already live and retrying could
  // duplicate it. Logged (not silently swallowed) for support follow-up.
  const url = `https://x.com/${account.handle}/status/${tweet.id}`;
  const { error: stampError } = await admin
    .from("drafts")
    .update({
      posted_at: new Date().toISOString(),
      posted_tweet_id: tweet.id,
      posted_url: url,
      posting_claimed_at: null,
    })
    .eq("id", draftId)
    .eq("is_winner", true)
    .is("posted_at", null)
    .eq("posting_claimed_at", claimTimestamp);
  if (stampError) {
    console.error(
      `postDraftToXForOwner: post-outcome stamp failed for draft ${draftId} (post IS live at ${url})`,
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
    ref_id: draftId,
  });
  if (meterError) {
    console.error("postDraftToXForOwner: usage_events stamp failed", meterError);
  }

  return { ok: true, url };
}
