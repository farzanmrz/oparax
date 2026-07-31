// Connect entry point — GET /auth/slack/link. Starts the Slack OAuth v2 install flow for one
// desk — unlike X's per-user link, Slack's link is desk-scoped (per `agent_id`), so this
// requires a signed-in Oparax user who owns the desk named by the `agentId` query param,
// then redirects to Slack's authorize endpoint with `state` carrying `agentId` (+
// `returnTo` + a CSRF nonce) for the callback to resume. Mirrors app/auth/x/route.ts's shape.
//
// QC fix: the desk-ownership re-check alone is NOT a CSRF boundary — it proves the signed-in
// user owns the target desk, not that their browser is the one that started this flow. Without
// a nonce, an attacker completes their OWN Slack OAuth grant, then lures a signed-in victim (who
// owns some desk) to GET /auth/slack/callback?code=<attacker_code>&state=<state naming the
// victim's desk>; the victim passes the ownership check and the attacker's Slack workspace gets
// bound to the victim's desk. Fixed the same way X's flow already does: a random nonce, stashed
// in an httpOnly cookie here, must round-trip back inside `state` and match at the callback.
import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth/return-path";
import { getSiteOrigin } from "@/lib/site-origin";
import { SLACK_SCOPES } from "@/lib/slack/api";
import { ownsDesk } from "@/lib/slack/link-state";
import { createClient } from "@/lib/supabase/server";

const OAUTH_COOKIE_MAX_AGE_SEC = 600;

function encodeState(input: { agentId: string; returnTo: string | null; nonce: string }): string {
  return Buffer.from(JSON.stringify([2, input.agentId, input.returnTo, input.nonce])).toString(
    "base64url",
  );
}

export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const { searchParams } = request.nextUrl;

  const agentId = searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  const returnTo = safeReturnPath(searchParams.get("returnTo"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Desk-ownership proof — shared with lib/slack/link-state.ts / lib/slack/actions.ts / the
  // callback route below (previously each reimplemented this same RLS read).
  if (!(await ownsDesk(agentId))) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL(`/agents/${agentId}/setup?slack_error=config`, origin));
  }

  const redirectUri = `${origin}/auth/slack/callback`;
  const nonce = randomBytes(32).toString("base64url");
  const state = encodeState({ agentId, returnTo, nonce });

  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SLACK_SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("slack_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SEC,
  });
  return res;
}
