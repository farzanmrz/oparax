// lib/x/actions.ts
//
// Server actions for the reporter's X account link. Unlink revokes the token (best-effort)
// and deletes the stored row; the token store itself lives in lib/x/store.ts and is only ever
// touched through the admin client (deny-all RLS on x_accounts).
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { revokeToken } from "@/lib/x/api";
import { deleteXAccount, getXAccount } from "@/lib/x/store";

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
