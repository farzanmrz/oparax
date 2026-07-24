// Connect entry point — GET /auth/slack/link. Starts the Slack OAuth v2 install flow for one
// desk — unlike X's per-user link, Slack's link is desk-scoped (per `experiment_id`), so this
// requires a signed-in Oparax user who owns the desk named by the `experimentId` query param,
// then redirects to Slack's authorize endpoint with `state` carrying `experimentId` (+
// `returnTo`) for the callback to resume. Mirrors app/auth/x/route.ts's shape. No PKCE and no
// signed/opaque state token here — Slack's own state round-trip plus this app's
// desk-ownership re-check at the callback (see the callback route) is the actual security
// boundary, same as X's existing pattern.
import { type NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/site-origin";
import { SLACK_SCOPES } from "@/lib/slack/api";
import { createClient } from "@/lib/supabase/server";

function encodeState(input: { experimentId: string; returnTo: string | null }): string {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const { searchParams } = request.nextUrl;

  const experimentId = searchParams.get("experimentId");
  if (!experimentId) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  // Only an app-internal `/agents/` path is accepted for the post-link return — never an
  // external origin — so this can't be abused as an open redirect.
  const rawReturn = searchParams.get("returnTo");
  const returnTo = rawReturn?.startsWith("/agents/") ? rawReturn : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Desk-ownership proof — the same cookie-client (RLS) read `lib/slack/link-state.ts` and
  // `lib/slack/actions.ts` use: `experiments` is owner-scoped, so no row back means either
  // "not signed in" or "not this reporter's desk", and both are treated as "can't link".
  const { data: experiment, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", experimentId)
    .maybeSingle();
  if (error || !experiment) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/agents/${experimentId}/setup?slack_error=config`, origin),
    );
  }

  const redirectUri = `${origin}/auth/slack/callback`;
  const state = encodeState({ experimentId, returnTo });

  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SLACK_SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}
