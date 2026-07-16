// lib/x/actions.ts
//
// Server actions for posting a draft to X and unlinking the reporter's X account.
// postDraftToX follows the same RLS-client-proves-ownership-then-admin-client-writes
// trust path as app/agents/[id]/actions.ts's scanNow — the draft's post-state columns
// (posted_at, posted_tweet_id, posted_url) are service-role-write-only, so ownership is
// proven with an RLS read and the writes run on the admin client. Posting is a per-action
// user decision, so a double-click must never double-post: the draft is CAS-claimed
// (posted_at set only if still null) with the admin client before any network call, and
// the claim is released on any failure so the draft can be retried.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createTweet, refreshTokens, revokeToken } from "@/lib/x/api";
import { deleteXAccount, getXAccount, updateXTokens } from "@/lib/x/store";

const draftIdSchema = z.string().uuid();

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
  draftId: string,
): Promise<void> {
  try {
    await admin.from("drafts").update({ posted_at: null }).eq("id", draftId);
  } catch {
    // best-effort — never surface a release failure to the caller.
  }
}

export async function postDraftToX(
  draftId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsedId = draftIdSchema.safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: "Select a draft to post." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  // RLS-scoped read proves ownership (scoped to the reporter's own agents' drafts).
  const { data: draft, error: draftError } = await supabase
    .from("drafts")
    .select("id, text, agent_id, posted_at")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };
  if (draft.posted_at) return { ok: false, error: "This draft was already posted to X." };

  // Resolve a usable access token BEFORE claiming: a missing account or a failed refresh
  // means nothing was posted, so there is no claim to release and no double-post risk.
  const account = await getXAccount(user.id);
  if (!account) return { ok: false, error: "Connect your X account first." };

  let accessToken = account.access_token;
  if (new Date(account.token_expires_at).getTime() - Date.now() < 60_000) {
    try {
      const refreshed = await refreshTokens(account.refresh_token);
      accessToken = refreshed.accessToken;
      // rotation is undocumented — keep the prior refresh token when X omits a new one.
      const newRefresh = refreshed.refreshToken ?? account.refresh_token;
      const tokenExpiresAt = new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString();
      await updateXTokens(user.id, { accessToken, refreshToken: newRefresh, tokenExpiresAt });
    } catch {
      return {
        ok: false,
        error: "Your X connection expired — reconnect your X account in settings.",
      };
    }
  }

  const admin = createAdminClient();

  // CAS-claim: only succeeds if posted_at is still null, so a concurrent double-click loses.
  const { data: claimed, error: claimError } = await admin
    .from("drafts")
    .update({ posted_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .is("posted_at", null)
    .select("id");
  if (claimError || !claimed || claimed.length === 0) {
    return { ok: false, error: "This draft was already posted to X." };
  }

  let tweet: { id: string };
  try {
    tweet = await createTweet(accessToken, draft.text);
  } catch (error) {
    // The claim is held. Only release it when X DEFINITELY did not create the post —
    // i.e. it answered with a 4xx client error. On a timeout, dropped connection, or 5xx
    // the post MAY have gone through, so keep the claim (fail closed) rather than risk a
    // double-post on retry.
    const status = httpStatusOf(error);
    if (status !== null && status >= 400 && status < 500) {
      await releaseClaim(admin, parsedId.data);
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
      .from("drafts")
      .update({ posted_tweet_id: tweet.id, posted_url: url })
      .eq("id", parsedId.data);
  } catch {
    // ignore — the post is live.
  }

  revalidatePath(`/agents/${draft.agent_id}`);
  return { ok: true, url };
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
