import "server-only";

import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { authContent } from "@/lib/auth/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export const authProviderSchema = z.enum(["google", "twitter"]);

export async function signedInDestination(next: unknown): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";
  const { data: monitor, error } = await supabase
    .from("monitors")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!monitor) return "/?noagent=1";
  return safeNextPath(next) ?? `/${monitor.handle}`;
}

export async function requestSigninLink(email: string, next: unknown, origin: string) {
  const redirectTo = new URL("/auth/confirm", origin);
  redirectTo.searchParams.set("next", safeNextPath(next) ?? "/");
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
