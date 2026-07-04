// Auth email handler — users hit this URL from Supabase signup/recovery links.
// Both flows land on the routed auth pages: signup confirmation verifies the
// email, signs the session back out, and seeds /login with a success notice
// (no auto-login); recovery forwards the token to /auth/reset-password
// without consuming it.
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Build a clean same-origin redirect (drops the incoming token params).
  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return NextResponse.redirect(url);
  };

  if (type === "recovery") {
    // Do not consume recovery tokens on GET. Email clients and spam scanners
    // can prefetch links, which would invalidate one-time tokens before users
    // actually submit their new password. The reset-password form submits the
    // token together with the new password instead.
    if (token_hash) {
      return redirectTo("/auth/reset-password", {
        token_hash,
        type: "recovery",
      });
    }

    // Defensive net for recovery arrivals WITHOUT a token: unreachable under
    // README's documented `{{ .TokenHash }}` email templates (every recovery
    // link carries token_hash); covers misconfigured/legacy templates and
    // hand-typed URLs. A live session can still reset without a token.
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        return redirectTo("/auth/reset-password");
      }
    } catch {
      // Network error or unexpected failure — fall through to error redirect
    }

    return redirectTo("/forgot-password", {
      error: "Reset link is invalid or expired. Please request a new one.",
    });
  }

  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        // Email verified. verifyOtp signs the user in as a side effect —
        // sign back out so they log in deliberately from the login page.
        await supabase.auth.signOut();
        return redirectTo("/login", {
          message: "Email verified successfully. Please log in.",
        });
      }
    } catch {
      // Network error or unexpected failure — fall through to error redirect
    }
  }

  return redirectTo("/signup", {
    error: "Email confirmation failed. Please try signing up again.",
  });
}
