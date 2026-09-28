import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { checkBot } from "@/lib/guards/bot";
import { isOwnerEmail } from "@/lib/monitor/read";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;
const inputSchema = z.object({ monitorId: z.uuid() });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ ok: false }, { status: 400 });
  try {
    const bot = await checkBot(request);
    if (bot.isBot) return Response.json({ ok: false }, { status: 403 });
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (isOwnerEmail(user?.email)) return Response.json({ ok: true });
    const db = createAdminClient();
    const monitorId = input.data.monitorId;
    const now = new Date().toISOString();
    const { data: monitor, error: readError } = await db
      .from("monitors")
      .select("status")
      .eq("id", monitorId)
      .maybeSingle();
    if (readError) throw readError;
    if (!monitor) return Response.json({ ok: false }, { status: 404 });
    if (monitor.status === "building" || monitor.status === "failed")
      return Response.json({ ok: true });
    const { error: resumeError } = await db
      .from("monitors")
      .update({ status: "live" })
      .eq("id", monitorId)
      .eq("status", "paused");
    if (resumeError) throw resumeError;
    const { data: firstView, error: trialError } = await db
      .from("monitors")
      .update({ trial_started_at: now })
      .eq("id", monitorId)
      .is("trial_started_at", null)
      .eq("status", "live")
      .select("id")
      .maybeSingle();
    if (trialError) throw trialError;
    // Only the request that changes the null trial date owns the first-view events.
    if (firstView) {
      track("trial_started", { monitor_id: monitorId }, monitorId);
      track("page_viewed_outside", { monitor_id: monitorId }, monitorId);
    }
    const { error: viewError } = await db
      .from("monitors")
      .update({ last_viewed_at: now })
      .eq("id", monitorId)
      .or(`last_viewed_at.is.null,last_viewed_at.lt.${now}`);
    if (viewError) throw viewError;
    const requestedZone = request.headers.get("x-vercel-ip-timezone");
    const timeZone =
      requestedZone && Intl.supportedValuesOf("timeZone").includes(requestedZone)
        ? requestedZone
        : "UTC";
    const { error: zoneError } = await db
      .from("monitors")
      .update({ alert_timezone: timeZone })
      .eq("id", monitorId)
      .is("alert_timezone", null);
    if (zoneError) throw zoneError;
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "view" } });
    return Response.json({ ok: false }, { status: 503 });
  }
}
