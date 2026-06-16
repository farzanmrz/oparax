// Auth email handler — users hit this URL from Supabase signup/recovery links.
// Both flows land on the landing page's auth modals: signup confirmation
// verifies the email, signs the session back out, and seeds the login modal
// with a success notice (no auto-login); recovery forwards the token to the
// reset-password modal without consuming it.
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
    // actually submit their new password. The reset modal submits the token
    // together with the new password instead.
    if (token_hash) {
      return redirectTo("/", {
        auth: "reset",
        token_hash,
        type: "recovery",
      });
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        return redirectTo("/", {
          auth: "reset",
        });
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
        // sign back out so they log in deliberately from the landing page.
        await supabase.auth.signOut();
        return redirectTo("/", {
          auth: "login",
          message: "Email verified successfully. Please log in.",
        });
      }
    } catch {
      // Network error or unexpected failure — fall through to error redirect
    }
  }

  return redirectTo("/", {
    auth: "signup",
    error: "Email confirmation failed. Please try signing up again.",
  });
}
