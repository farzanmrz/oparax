// Auth email handler — users hit this URL from Supabase signup/recovery links.
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(searchParams.get("next"));

  const redirectTo = request.nextUrl.clone();
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (type === "recovery") {
    const recoveryTarget = next ?? "/auth/reset-password";

    // Do not consume recovery tokens on GET. Email clients and spam scanners
    // can prefetch links, which would invalidate one-time tokens before users
    // actually submit their new password.
    if (token_hash) {
      redirectTo.pathname = recoveryTarget;
      redirectTo.searchParams.set("token_hash", token_hash);
      redirectTo.searchParams.set("type", "recovery");
      return NextResponse.redirect(redirectTo);
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        redirectTo.pathname = recoveryTarget;
        return NextResponse.redirect(redirectTo);
      }
    } catch {
      // Network error or unexpected failure — fall through to error redirect
    }

    redirectTo.pathname = "/forgot-password";
    redirectTo.searchParams.set(
      "error",
      "Reset link is invalid or expired. Please request a new one."
    );
    return NextResponse.redirect(redirectTo);
  }

  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });

      if (!error) {
        if (next) {
          redirectTo.pathname = next;
          return NextResponse.redirect(redirectTo);
        }

        redirectTo.pathname = "/dashboard";
        return NextResponse.redirect(redirectTo);
      }
    } catch {
      // Network error or unexpected failure — fall through to error redirect
    }
  }

  redirectTo.pathname = "/";
  redirectTo.searchParams.set("tab", "signup");
  redirectTo.searchParams.set(
    "error",
    "Email confirmation failed. Please try signing up again."
  );
  return NextResponse.redirect(redirectTo);
}
