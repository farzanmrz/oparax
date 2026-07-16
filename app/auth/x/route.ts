// Connect entry point — GET /auth/x. Starts the X OAuth2 Authorization-Code +
// PKCE link flow: requires a signed-in Oparax user, then redirects to X's
// authorize endpoint with a fresh PKCE pair + CSRF state stashed in cookies for
// the callback to verify.
import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/x/api";
import { createClient } from "@/lib/supabase/server";

const OAUTH_COOKIE_MAX_AGE_SEC = 600;

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

export async function GET() {
  const origin = await getSiteOrigin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectUri = `${origin}/auth/x/callback`;

  const url = buildAuthorizeUrl({ state, codeChallenge, redirectUri });

  const res = NextResponse.redirect(url);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SEC,
  };
  res.cookies.set("x_oauth_state", state, cookieOptions);
  res.cookies.set("x_oauth_verifier", codeVerifier, cookieOptions);

  return res;
}
