// OAuth callback — GET /auth/x/callback. Verifies the CSRF state + PKCE
// cookies set by app/auth/x/route.ts, exchanges the auth code (which expires
// in ~30s, so no slow work runs before the exchange), fetches the linked X
// user, and stores the token set. Always redirects to /agents/settings —
// success sets x_linked=1, any failure sets x_error=<code>. Never puts token
// material or the auth code in a redirect URL.
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchMe } from "@/lib/x/api";
import { upsertXAccount } from "@/lib/x/store";
import { createClient } from "@/lib/supabase/server";

/** Mirrors `getSiteOrigin()` in lib/auth/actions.ts — kept local because that
 *  file is "use server" and can't export a plain helper. */
async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const { searchParams } = request.nextUrl;

  const settingsRedirect = (params: Record<string, string>) => {
    const url = new URL("/agents/settings", origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = NextResponse.redirect(url);
    res.cookies.set("x_oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("x_oauth_verifier", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (searchParams.get("error")) {
    return settingsRedirect({ x_error: "denied" });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;

  if (!code || !state || !cookieState || !codeVerifier || state !== cookieState) {
    return settingsRedirect({ x_error: "state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return settingsRedirect({ x_error: "auth" });
  }

  const redirectUri = `${origin}/auth/x/callback`;

  try {
    const tokens = await exchangeCode({ code, codeVerifier, redirectUri });
    if (!tokens.refreshToken) {
      return settingsRedirect({ x_error: "exchange" });
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
    return settingsRedirect({ x_error: "exchange" });
  }

  return settingsRedirect({ x_linked: "1" });
}
