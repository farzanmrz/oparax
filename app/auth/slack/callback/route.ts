// OAuth callback — GET /auth/slack/callback. Decodes the `state` this app's own link route
// put there (desk id + return path — see app/auth/slack/link/route.ts), re-verifies desk
// ownership via the cookie (RLS) client exactly as the link route did, exchanges the code,
// persists the link, and redirects back. Mirrors app/auth/x/callback/route.ts's shape;
// Slack's link is desk-scoped rather than user-scoped, so there is no PKCE/CSRF cookie pair
// to clear here — the desk-ownership re-check IS the security boundary: a forged or stale
// `state` pointing at a desk the signed-in user doesn't own fails this read and Slack never
// gets linked to it. Never puts token material or the auth code in a redirect URL.
import { type NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/site-origin";
import { exchangeCodeForToken } from "@/lib/slack/api";
import { upsertSlackAccount } from "@/lib/slack/store";
import { createClient } from "@/lib/supabase/server";

function decodeState(raw: string): { experimentId: string; returnTo: string | null } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { experimentId?: unknown }).experimentId !== "string"
    ) {
      return null;
    }
    const returnTo = (parsed as { returnTo?: unknown }).returnTo;
    return {
      experimentId: (parsed as { experimentId: string }).experimentId,
      returnTo: typeof returnTo === "string" ? returnTo : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const { searchParams } = request.nextUrl;

  const rawState = searchParams.get("state");
  const decoded = rawState ? decodeState(rawState) : null;
  // No decodable state means no desk to return to but the desk-less listing — this can only
  // happen from a tampered/expired link, never from this app's own link route.
  if (!decoded) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  const returnPath = decoded.returnTo?.startsWith("/agents/")
    ? decoded.returnTo
    : `/agents/${decoded.experimentId}/setup`;

  const redirectBack = (params: Record<string, string>) => {
    const url = new URL(returnPath, origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url);
  };

  if (searchParams.get("error")) {
    return redirectBack({ slack_error: "denied" });
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectBack({ slack_error: "state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectBack({ slack_error: "auth" });
  }

  // Desk-ownership re-check — see the file header. `experiments` is owner-scoped, so no row
  // back means the signed-in user doesn't own the desk `state` claims, and the link is
  // refused rather than silently applied to the wrong desk.
  const { data: experiment, error: experimentError } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", decoded.experimentId)
    .maybeSingle();
  if (experimentError || !experiment) {
    return redirectBack({ slack_error: "ownership" });
  }

  const redirectUri = `${origin}/auth/slack/callback`;

  try {
    const result = await exchangeCodeForToken({ code, redirectUri });
    await upsertSlackAccount(decoded.experimentId, {
      teamId: result.team.id,
      teamName: result.team.name,
      channelId: result.channel.id,
      channelName: result.channel.name,
      accessToken: result.accessToken,
      botUserId: result.botUserId,
      scopes: result.scopes,
    });
  } catch (err) {
    console.error("auth/slack/callback: link failed", err);
    return redirectBack({ slack_error: "exchange" });
  }

  return redirectBack({ slack_linked: "1" });
}
