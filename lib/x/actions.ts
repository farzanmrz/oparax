// lib/x/actions.ts
//
// Server actions for posting a draft to X and unlinking the reporter's X account.
// postDraftToX follows the same RLS-client-proves-ownership-then-admin-client-writes
// trust path as app/agents/[id]/actions.ts's scanNow — post_drafts' post-outcome columns
// (posted_at, posted_tweet_id, posted_url) carry no owner UPDATE policy, so ownership is
// proven with an RLS read (the post_drafts -> experiments EXISTS-join SELECT policy) and
// every write runs on the admin (service-role) client. Posting is a per-action user
// decision, so a double-click must never double-post: the draft is CAS-claimed
// (posted_at set only if still null) with the admin client before any network call, and
// the claim is released on any failure so the draft can be retried.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createTweet, refreshTokens, revokeToken } from "@/lib/x/api";
import { deleteXAccount, getXAccount, updateXTokens } from "@/lib/x/store";

const postDraftIdSchema = z.string().uuid();

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
 *  draft claimed — it must never throw out of the action. */
async function releaseClaim(
  admin: ReturnType<typeof createAdminClient>,
  postDraftId: string,
): Promise<void> {
  try {
    await admin.from("post_drafts").update({ posted_at: null }).eq("id", postDraftId);
  } catch {
    // best-effort — never surface a release failure to the caller.
  }
}

/** The actual posting logic, independent of how the caller resolved ownerId. `postDraftToX`
 *  (the "use server" browser action) resolves ownerId via the live session, does its own
 *  RLS-scoped ownership proof, THEN calls this; `draft-pipeline.ts`'s auto-post path already
 *  knows ownerId from the experiment row and calls this directly, with no session. Same
 *  CAS-claim, token-refresh, createTweet, outcome-stamp behavior either way — only the
 *  ownership-resolution step differs between the two callers, so this re-reads the draft via
 *  the ADMIN client (not the RLS-scoped read `postDraftToX` already did — that read exists
 *  purely to prove a browser caller may act on this draft, and its result isn't passed in
 *  here) to get the text to post and the experiment_id for revalidation. */
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
  // Every exported function in a "use server" file is its own reachable endpoint regardless
  // of which components import it (Next.js treats server actions as public by ID, not by
  // client-bundle usage) — so `ownerId` can't be trusted just because it was passed in. Both
  // real callers already derive it from this same draft's experiment row before calling here;
  // this re-proves that instead of trusting the argument.
  if (draft.experiments?.owner_id !== ownerId) {
    return { ok: false, error: "That draft could not be found." };
  }
  if (draft.posted_at) return { ok: false, error: "This draft was already posted to X." };

  const text = draft.model_calls?.output;
  if (!text) return { ok: false, error: "This draft has no text to post." };

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
  // returned below regardless).
  const url = `https://x.com/${account.handle}/status/${tweet.id}`;
  try {
    await admin
      .from("post_drafts")
      .update({ posted_tweet_id: tweet.id, posted_url: url })
      .eq("id", postDraftId);
  } catch {
    // ignore — the post is live.
  }

  // Meter the post (AGENTS.md: every touch point stamps usage_events). X posting is
  // pay-per-use and was the one real-money touch point writing no ledger row at all, so
  // per-owner spend under-reported by exactly the posting cost. Stamped only after X
  // confirmed the post, matching every other metering call site in the repo. Best-effort:
  // the post is already live, so a ledger failure must never surface as a posting failure.
  try {
    await admin.from("usage_events").insert({
      owner_id: ownerId,
      kind: "x_post",
      units: 1,
      cost_usd: X_POST_COST_USD(text),
      ref_id: postDraftId,
    });
  } catch (err) {
    console.error("postDraftToXForOwner: usage_events stamp failed", err);
  }

  revalidatePath(`/agents/${draft.experiment_id}`);
  return { ok: true, url };
}

export async function postDraftToX(
  postDraftId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsedId = postDraftIdSchema.safeParse(postDraftId);
  if (!parsedId.success) return { ok: false, error: "Select a draft to post." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  // RLS-scoped read proves ownership via post_drafts' EXISTS-join-through-experiments SELECT
  // policy — `id` only: postDraftToXForOwner does the one real fetch (text, posted_at) via
  // the admin client right after, so this doesn't re-select and re-validate the same row
  // twice per browser click.
  const { data: draft, error: draftError } = await supabase
    .from("post_drafts")
    .select("id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };

  return postDraftToXForOwner(parsedId.data, user.id);
}

export async function unlinkXAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const account = await getXAccount(user.id);
  if (account) {
    try {
      await revokeToken(account.access_token);
    } catch {
      // revoke is best-effort; never block the unlink
    }
  }

  try {
    await deleteXAccount(user.id);
  } catch {
    return { ok: false, error: "Could not unlink your X account. Please try again." };
  }

  revalidatePath("/agents/settings");
  return { ok: true };
}
