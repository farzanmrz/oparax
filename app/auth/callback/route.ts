// Imports
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { saveConnection } from "@/lib/x/tokens"
import { isSafeNextPath } from "@/lib/safe-next"

// Node runtime: token capture + AES encryption use node:crypto.
export const runtime = "nodejs"

// Scopes requested via linkIdentity.
const REQUESTED_SCOPES = [
  "users.email",
  "tweet.read",
  "users.read",
  "offline.access",
  "tweet.write",
]

/**
 * Restrict the post-callback redirect to a safe in-app path.
 * @param next - the requested next path
 * @returns a safe path (defaults to the Settings page)
 */
function getSafeNextPath(next: string | null): string {
  return isSafeNextPath(next) ? next : "/dashboard/settings"
}

/**
 * OAuth callback for linking X: exchange the code, capture the provider tokens
 * before any session refresh nulls them (R3), identify the X account, encrypt +
 * store the connection, then redirect back to Settings.
 * @param request - the callback request from Supabase
 * @returns a redirect response
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = getSafeNextPath(searchParams.get("next"))
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error")

  // Helper to redirect with a status query param.
  const redirectWith = (key: "x_connected" | "x_error", value: string) => {
    const url = new URL(next, origin)
    url.searchParams.set(key, value)
    return NextResponse.redirect(url)
  }

  if (oauthError) {
    return redirectWith("x_error", oauthError)
  }
  if (!code) {
    return redirectWith("x_error", "Missing authorization code.")
  }

  // Exchange code for session.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return redirectWith("x_error", error.message)
  }

  // Capture tokens immediately before Supabase nulls them on refresh.
  const accessToken = data.session?.provider_token
  const refreshToken = data.session?.provider_refresh_token
  const userId = data.session?.user.id
  if (!accessToken || !refreshToken || !userId) {
    return redirectWith(
      "x_error",
      "X tokens were not returned. Please try connecting again.",
    )
  }

  // Fetch the X account profile to confirm token access.
  let xUserId = ""
  let xUsername = ""
  try {
    const meResponse = await fetch("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const me = (await meResponse.json()) as {
      data?: { id?: string; username?: string }
    }
    xUserId = me.data?.id ?? ""
    xUsername = me.data?.username ?? ""
  } catch {
    // Fall through to the missing-profile error below.
  }
  if (!xUserId || !xUsername) {
    return redirectWith("x_error", "Could not read your X profile.")
  }

  // Estimate the ~2h access token expiry.
  const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString()

  const saveError = await saveConnection(supabase, {
    userId,
    xUserId,
    xUsername,
    accessToken,
    refreshToken,
    scopes: REQUESTED_SCOPES,
    expiresAt,
  })

  if (saveError) {
    return redirectWith("x_error", "Failed to save your X connection.")
  }

  return redirectWith("x_connected", xUsername)
}
