import "server-only";

import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { authContent } from "@/lib/auth/content";
import { readAuthContext } from "@/lib/auth/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/validation";

export const authProviderSchema = z.enum(["google", "x"]);

export async function signedInDestination(next: unknown): Promise<string> {
  const { user, monitor } = await readAuthContext();
  if (!user) return "/login";
  if (!monitor) return "/onboarding";
  return safeAuthDestination(next) ?? safeAuthDestination(`/${monitor.handle}`) ?? "/";
}

export async function requestSigninLink(email: string, next: unknown, origin: string) {
  const redirectTo = new URL("/auth/confirm", origin);
  const destination = safeAuthDestination(next);
  if (destination) redirectTo.searchParams.set("next", destination);
  redirectTo.searchParams.set("method", "email_link");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo.toString() },
  });
  if (!error) {
    after(async () => {
      try {
        const admin = createAdminClient();
        const { data: userId, error: lookupError } = await admin.rpc("user_id_by_email", {
          p_email: email,
        });
        if (lookupError) throw lookupError;
        if (!userId) return;
        const { data: monitor, error: monitorError } = await admin
          .from("monitors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (monitorError) throw monitorError;
        if (monitor) track("signin_link_sent", {}, monitor.id);
      } catch {
        // Analytics attribution must not turn a successfully sent link into a form error.
        console.error("signin_link_sent: attribution unavailable");
      }
    });
  }
  // Existing and unknown mailboxes receive the same public response.
  return { error, message: authContent.linkSent };
}
