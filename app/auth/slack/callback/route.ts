// OAuth callback — GET /auth/slack/callback. Decodes the `state` this app's own link route
// put there (desk id + return path + CSRF nonce — see app/auth/slack/link/route.ts),
// verifies the nonce against the httpOnly cookie the link route set, re-verifies desk
// ownership via the cookie (RLS) client, exchanges the code, persists the link, and redirects
// back. Mirrors app/auth/x/callback/route.ts's shape. Never puts token material or the auth
// code in a redirect URL.
//
// QC fix: desk ownership alone is not a CSRF boundary (it proves the signed-in user owns the
// desk `state` names, not that their browser started this flow) — an attacker completing
// their own Slack grant could otherwise bind their workspace to a victim's desk by luring the
// victim to this URL with the attacker's `code`. The nonce round-trip (state ↔ cookie, exactly
// like app/auth/x/callback/route.ts's `x_oauth_state`) closes that: a forged `state` has no
// matching cookie on the victim's browser and fails here before any exchange happens.
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth/return-path";
import { getSiteOrigin } from "@/lib/site-origin";
import { exchangeCodeForToken } from "@/lib/slack/api";
import { ownsDesk } from "@/lib/slack/link-state";
import { upsertSlackAccount } from "@/lib/slack/store";
import { createClient } from "@/lib/supabase/server";

function decodeState(
  raw: string,
): { agentId: string; returnTo: string | null; nonce: string } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (Array.isArray(parsed)) {
      if (
        parsed.length !== 4 ||
        parsed[0] !== 2 ||
        typeof parsed[1] !== "string" ||
        (typeof parsed[2] !== "string" && parsed[2] !== null) ||
        typeof parsed[3] !== "string"
      ) {
        return null;
      }
      return { agentId: parsed[1], returnTo: parsed[2], nonce: parsed[3] };
    }
    if (typeof parsed !== "object" || parsed === null) return null;
    const values = Object.values(parsed);
    if (
      values.length !== 3 ||
      typeof values[0] !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        values[0],
      ) ||
      (values[1] !== null && safeReturnPath(values[1] as string | null) === null) ||
      typeof values[2] !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(values[2])
    ) {
      return null;
    }
    return { agentId: values[0], returnTo: values[1], nonce: values[2] };
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

  const returnPath = safeReturnPath(decoded.returnTo, `/agents/${decoded.agentId}/sources`);

  const redirectBack = (params: Record<string, string>) => {
    const url = new URL(returnPath, origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = NextResponse.redirect(url);
    res.cookies.set("slack_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (searchParams.get("error")) {
    return redirectBack({ slack_error: "denied" });
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectBack({ slack_error: "state" });
  }

  // CSRF nonce check — see the file header. A forged state (or a state replayed on a
  // different browser than the one that started the flow) has no matching cookie here.
  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get("slack_oauth_state")?.value;
  if (!cookieNonce || cookieNonce !== decoded.nonce) {
    return redirectBack({ slack_error: "state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectBack({ slack_error: "auth" });
  }

  // Desk-ownership re-check — see the file header. Shared with lib/slack/link-state.ts /
  // lib/slack/actions.ts / the link route above: no row back means the signed-in user doesn't
  // own the desk `state` claims, and the link is refused rather than silently applied to the
  // wrong desk.
  if (!(await ownsDesk(decoded.agentId))) {
    return redirectBack({ slack_error: "ownership" });
  }

  const redirectUri = `${origin}/auth/slack/callback`;

  try {
    const result = await exchangeCodeForToken({ code, redirectUri });
    await upsertSlackAccount(decoded.agentId, {
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
