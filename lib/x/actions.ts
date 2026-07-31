// lib/x/actions.ts
//
// Server actions for posting a draft to X and unlinking the reporter's X account. The actual
// posting logic lives in lib/x/post-core.ts, deliberately OUTSIDE this "use server" file —
// every export here is its own reachable Server Action endpoint by build-time id, regardless
// of which component imports it, so the ownerId-trusting core must not live in this file (see
// post-core.ts's header comment). postDraftToX follows the same RLS-client-proves-ownership-
// then-admin-client-writes trust path as app/agents/[id]/actions.ts's scanNow: ownership is
// proven with an RLS read (the drafts -> agents EXISTS-join SELECT policy), then
// post-core.ts does every write on the admin (service-role) client.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revokeToken } from "@/lib/x/api";
import { publishDraftToXForOwner } from "@/lib/x/post-core";
import { deleteXAccount, getXAccount } from "@/lib/x/store";

const draftIdSchema = z.string().uuid();

export async function publishDraftToX(
  draftId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsedId = draftIdSchema.safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: "Select a draft to post." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  // RLS-scoped read proves ownership via drafts' EXISTS-join-through-agents SELECT
  // policy — `id` only: postDraftToXForOwner does the one real fetch (text, posted_at) via
  // the admin client right after, so this doesn't re-select and re-validate the same row
  // twice per browser click.
  const { data: draft, error: draftError } = await supabase
    .from("drafts")
    .select("id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (draftError || !draft) return { ok: false, error: "That draft could not be found." };

  return publishDraftToXForOwner(parsedId.data, user.id);
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
