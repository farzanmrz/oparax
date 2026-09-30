import { type NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/analytics/events";
import { authContent } from "@/lib/auth/content";
import { signedInDestination } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const method = searchParams.get("method");
  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = new URL(path, request.url);
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
    return NextResponse.redirect(url);
  };
  const supabase = await createClient();
  if (type === "recovery") {
    // Email scanners must not consume password-recovery tokens before form submission.
    if (tokenHash)
      return redirectTo("/auth/reset-password", { token_hash: tokenHash, type: "recovery" });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return redirectTo("/auth/reset-password");
    return redirectTo("/forgot-password", { error: authContent.resetInvalid });
  }
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (method === "oauth" || method === "email_link") {
        if (data.user) track("signed_in", { method }, data.user.id);
      } else {
        console.warn("auth: sign-in method marker missing or invalid");
      }
      return redirectTo(await signedInDestination(next));
    }
  } else if (tokenHash && (type === "magiclink" || type === "email" || type === "signup")) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (data.user) track("signed_in", { method: "email_link" }, data.user.id);
      return redirectTo(await signedInDestination(next));
    }
  }
  return redirectTo(type === "signup" ? "/signup" : "/login", {
    error: type === "signup" ? authContent.confirmationFailed : authContent.signinFailed,
  });
}
