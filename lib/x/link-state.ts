// The frozen accessor for the UI issue (#65). Server-only — call from a Server Component or
// Server Action. Uses the cookie (RLS) client only to identify the signed-in user, then delegates
// to `lib/x/store.ts` (the admin client) — never touches `x_accounts` directly, and returns NO
// token material, ever.
import { createClient } from "@/lib/supabase/server";
import { getXAccount } from "./store";

/** The frozen accessor for the UI issue (#65). Server-only — call from a Server
 *  Component or Server Action. Returns NO token material, ever. */
export async function getXLinkState(): Promise<{ linked: boolean; handle: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { linked: false, handle: null };

  const account = await getXAccount(user.id);
  return { linked: account !== null, handle: account?.handle ?? null };
}
