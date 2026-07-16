// Connect entry point — GET /auth/x. Starts the X OAuth2 Authorization-Code +
// PKCE link flow: requires a signed-in Oparax user, then redirects to X's
// authorize endpoint with a fresh PKCE pair + CSRF state stashed in cookies for
// the callback to verify.
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildAuthorizeUrl } from "@/lib/x/api";
import { createClient } from "@/lib/supabase/server";

const OAUTH_COOKIE_MAX_AGE_SEC = 600;

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
