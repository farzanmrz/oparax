// OAuth callback — GET /auth/x/callback. Verifies the CSRF state + PKCE
// cookies set by app/auth/x/route.ts, exchanges the auth code (which expires
// in ~30s, so no slow work runs before the exchange), fetches the linked X
// user, and stores the token set. Redirects back to wherever the connect flow
// started (the x_oauth_return cookie, validated to an internal /agents/ path;
// falls back to /agents/settings) — success sets x_linked=1, any failure sets
// x_error=<code>. Never puts token material or the auth code in a redirect URL.
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, fetchMe } from "@/lib/x/api";
import { upsertXAccount } from "@/lib/x/store";

export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const { searchParams } = request.nextUrl;
  const cookieStore = await cookies();

  // Return to the page the connect flow started from (a desk), falling back to
  // settings. Only an app-internal `/agents/` path is honored — never an external
  // origin — so a tampered cookie can't turn the callback into an open redirect.
  const rawReturn = cookieStore.get("x_oauth_return")?.value;
  const returnPath = rawReturn?.startsWith("/agents/") ? rawReturn : "/agents/settings";

  const redirectBack = (params: Record<string, string>) => {
    const url = new URL(returnPath, origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = NextResponse.redirect(url);
    res.cookies.set("x_oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("x_oauth_verifier", "", { maxAge: 0, path: "/" });
    res.cookies.set("x_oauth_return", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (searchParams.get("error")) {
    return redirectBack({ x_error: "denied" });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;

  if (!code || !state || !cookieState || !codeVerifier || state !== cookieState) {
    return redirectBack({ x_error: "state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectBack({ x_error: "auth" });
  }

  const redirectUri = `${origin}/auth/x/callback`;

  try {
    const tokens = await exchangeCode({ code, codeVerifier, redirectUri });
    if (!tokens.refreshToken) {
      return redirectBack({ x_error: "exchange" });
    }

    const me = await fetchMe(tokens.accessToken);
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresInSec * 1000).toISOString();

    await upsertXAccount(user.id, {
      xUserId: me.id,
      handle: me.username,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt,
      scopes: tokens.scope,
    });
  } catch {
    return redirectBack({ x_error: "exchange" });
  }

  return redirectBack({ x_linked: "1" });
}
