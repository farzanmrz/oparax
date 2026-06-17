// Imports
import { type NextRequest, NextResponse } from "next/server";
import { isSafeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { findConflictingXOwnerMaskedEmail } from "@/lib/x/identity-owner";
import { saveConnection } from "@/lib/x/tokens";

// Node runtime: token capture + AES encryption use node:crypto.
export const runtime = "nodejs";

// Scopes requested via linkIdentity.
const REQUESTED_SCOPES = [
  "users.email",
  "tweet.read",
  "users.read",
  "offline.access",
  "tweet.write",
];

// Where to bounce the user when the X account they authorized is already linked
// to a different Oparax account. They must unlink it there first, so we land
// them back on the connect-X gate (not Settings) with a clear error banner.
const CONNECT_X_PATH = "/dashboard/connect-x";

/**
 * Detect Supabase's "this X identity already belongs to another user" failure.
 *
 * GoTrue rejects `linkIdentity` with error code `identity_already_exists`
 * (message "Identity is already linked to another user") and bounces back to
 * this callback as an OAuth error redirect carrying `error_code` /
 * `error_description` (never the provider id or conflicting email). We match the
 * stable error code first and fall back to the message text so a wording change
 * upstream doesn't silently reclassify it as a generic OAuth error.
 * @param searchParams - the callback URL query params
 * @returns true if this is the duplicate-identity case
 */
function isIdentityAlreadyLinked(searchParams: URLSearchParams): boolean {
  const code = searchParams.get("error_code")?.toLowerCase() ?? "";
  const description = searchParams.get("error_description")?.toLowerCase() ?? "";
  return (
    code === "identity_already_exists" ||
    description.includes("identity is already linked") ||
    description.includes("already linked to another user")
  );
}

/**
 * Restrict the post-callback redirect to a safe in-app path.
 * @param next - the requested next path
 * @returns a safe path (defaults to the Settings page)
 */
function getSafeNextPath(next: string | null): string {
  return isSafeNextPath(next) ? next : "/dashboard/settings";
}

/**
 * OAuth callback for linking X: exchange the code, capture the provider tokens
 * before any session refresh nulls them (R3), identify the X account, encrypt +
 * store the connection, then redirect back to Settings.
 * @param request - the callback request from Supabase
 * @returns a redirect response
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  // Helper to redirect with a status query param.
  const redirectWith = (key: "x_connected" | "x_error", value: string) => {
    const url = new URL(next, origin);
    url.searchParams.set(key, value);
    return NextResponse.redirect(url);
  };

  // Supabase client scoped to this request (reused below for the code exchange).
  const supabase = await createClient();

  // Special-case the "this X account is already linked to a different Oparax
  // account" failure: route the user back to the connect-X gate with a friendly,
  // self-service message naming the conflicting account (email masked). GoTrue
  // doesn't tell us which X account it was, so we look up the owner via the
  // service-role Admin API (see findConflictingXOwnerMaskedEmail).
  if (oauthError && isIdentityAlreadyLinked(searchParams)) {
    const { data: userData } = await supabase.auth.getUser();
    const maskedEmail = userData.user
      ? await findConflictingXOwnerMaskedEmail(userData.user.id)
      : null;

    const url = new URL(CONNECT_X_PATH, origin);
    url.searchParams.set("x_error", "x_already_linked");
    if (maskedEmail) {
      url.searchParams.set("lockedEmail", maskedEmail);
    }
    return NextResponse.redirect(url);
  }

  if (oauthError) {
    return redirectWith("x_error", oauthError);
  }
  if (!code) {
    return redirectWith("x_error", "Missing authorization code.");
  }

  // Exchange code for session.
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWith("x_error", error.message);
  }

  // Capture tokens immediately before Supabase nulls them on refresh.
  const accessToken = data.session?.provider_token;
  const refreshToken = data.session?.provider_refresh_token;
  const userId = data.session?.user.id;
  if (!accessToken || !refreshToken || !userId) {
    return redirectWith("x_error", "X tokens were not returned. Please try connecting again.");
  }

  // Fetch the X account profile to confirm token access.
  let xUserId = "";
  let xUsername = "";
  try {
    const meResponse = await fetch("https://api.x.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const me = (await meResponse.json()) as {
      data?: {
        id?: string;
        username?: string;
      };
    };
    xUserId = me.data?.id ?? "";
    xUsername = me.data?.username ?? "";
  } catch {
    // Fall through to the missing-profile error below.
  }
  if (!xUserId || !xUsername) {
    return redirectWith("x_error", "Could not read your X profile.");
  }

  // Estimate the ~2h access token expiry.
  const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();

  const saveError = await saveConnection(supabase, {
    userId,
    xUserId,
    xUsername,
    accessToken,
    refreshToken,
    scopes: REQUESTED_SCOPES,
    expiresAt,
  });

  if (saveError) {
    return redirectWith("x_error", "Failed to save your X connection.");
  }

  return redirectWith("x_connected", xUsername);
}
