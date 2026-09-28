import { type NextRequest, NextResponse } from "next/server";
import { authContent } from "@/lib/auth/content";
import { signedInDestination } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next");
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(await signedInDestination(next));
  } else if (tokenHash && (type === "magiclink" || type === "email" || type === "signup")) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (type === "signup") {
        // Checkout also creates new users; their paid account should open immediately.
        const { data: monitor, error: monitorError } = await supabase
          .from("monitors")
          .select("id")
          .eq("user_id", data.user?.id ?? "")
          .maybeSingle();
        if (monitorError) throw monitorError;
        if (!monitor) {
          await supabase.auth.signOut();
          return redirectTo("/login", { message: authContent.emailVerified });
        }
      }
      return redirectTo(await signedInDestination(next));
    }
  }
  return redirectTo(type === "signup" ? "/signup" : "/login", {
    error: type === "signup" ? authContent.confirmationFailed : authContent.signinFailed,
  });
}
