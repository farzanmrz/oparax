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
    .select("id, text, agent_id, posted_at, posted_url")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };
  if (draft.posted_at) return { ok: false, error: "This draft was already posted to X." };

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

  const releaseClaim = async () => {
    await admin.from("drafts").update({ posted_at: null }).eq("id", parsedId.data);
  };

  try {
    const account = await getXAccount(user.id);
    if (!account) {
      await releaseClaim();
      return { ok: false, error: "Connect your X account first." };
    }

    let accessToken = account.access_token;
    if (new Date(account.token_expires_at).getTime() - Date.now() < 60_000) {
      const refreshed = await refreshTokens(account.refresh_token);
      accessToken = refreshed.accessToken;
      const newRefresh = refreshed.refreshToken ?? account.refresh_token;
      const tokenExpiresAt = new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString();
      await updateXTokens(user.id, { accessToken, refreshToken: newRefresh, tokenExpiresAt });
    }

    const tweet = await createTweet(accessToken, draft.text);
    const url = `https://x.com/${account.handle}/status/${tweet.id}`;

    // posted_at was already stamped by the claim above.
    await admin
      .from("drafts")
      .update({ posted_tweet_id: tweet.id, posted_url: url })
      .eq("id", parsedId.data);

    revalidatePath(`/agents/${draft.agent_id}`);
    return { ok: true, url };
  } catch (e) {
    await releaseClaim();
    const message = e instanceof Error ? e.message : "";
    if (/\b(401|403)\b/.test(message)) {
      return {
        ok: false,
        error: "Your X connection expired — reconnect your X account in settings.",
      };
    }
    return { ok: false, error: "Could not post to X. Please try again." };
  }
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
