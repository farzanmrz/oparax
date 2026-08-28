// app/l/[token]/route.ts
//
// The short link an alert DM carries. Resolves the alert by its link token, counts the click
// server-side (skipping obvious non-browser bots, the redirect itself never skips), and 302s
// to the desk's public feed with the alert stamped into the query string. An unknown token
// falls back to the landing page: no handle is resolvable from it.

import { type NextRequest, NextResponse } from "next/server";
import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

const HOME_URL = "https://oparax.ai/";
const BOT_UA = /bot|crawler|spider|preview|facebookexternalhit|slack|curl|python|go-http/i;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  try {
    const admin = createAdminClient();
    const { data: alert, error } = await admin
      .from("alerts")
      .select("id, agent_id, link_token")
      .eq("link_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!alert) return NextResponse.redirect(HOME_URL, 302);

    const { data: agent, error: agentError } = await admin
      .from("agents")
      .select("public_handle")
      .eq("id", alert.agent_id)
      .maybeSingle();
    if (agentError) throw agentError;
    const publicHandle = agent?.public_handle;
    if (!publicHandle) return NextResponse.redirect(HOME_URL, 302);

    const userAgent = request.headers.get("user-agent") ?? "";
    if (!BOT_UA.test(userAgent)) {
      captureServerEvent("alert_link_clicked", {
        distinctId: `x:${publicHandle.toLowerCase()}`,
        properties: { alert_id: alert.id, pilot_handle: publicHandle, user_agent: userAgent },
      });
    }

    return NextResponse.redirect(
      `https://oparax.ai/feed/${publicHandle}?utm_source=x_dm&utm_campaign=alert&li=${alert.id}`,
      302,
    );
  } catch (error) {
    reportServerException(error, { tags: { area: "public_feed", stage: "short_link" } });
    return NextResponse.redirect(HOME_URL, 302);
  }
}
