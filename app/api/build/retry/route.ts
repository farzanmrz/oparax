import { after } from "next/server";
import { z } from "zod";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { claimBuild, runBuild } from "@/lib/onboarding/run";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 800;

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return Response.json({ error: "Invalid retry" }, { status: 400 });
  }
  const input = z.object({ monitorId: z.uuid() }).safeParse(raw);
  if (!input.success) return Response.json({ error: "Invalid retry" }, { status: 400 });
  try {
    const db = createAdminClient();
    const { data: monitor, error } = await db
      .from("monitors")
      .select("id,handle,user_id,status,build_tries")
      .eq("id", input.data.monitorId)
      .maybeSingle();
    if (error) throw error;
    if (!monitor) return Response.json({ error: "Monitor not found" }, { status: 404 });
    if (monitor.user_id) {
      const session = await createClient();
      const owned = await session.from("monitors").select("id").eq("id", monitor.id).maybeSingle();
      if (owned.error) throw owned.error;
      if (!owned.data) return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const redirect = () => Response.redirect(new URL(`/${monitor.handle}`, request.url), 303);
    if (monitor.status !== "failed" || monitor.build_tries >= 2) return redirect();
    const guard = await guards();
    if (guard.killSwitch || !guard.trialPollingOpen) return redirect();
    const runId = crypto.randomUUID();
    if (await claimBuild(monitor.id, runId)) after(() => runBuild(monitor.id, runId));
    return redirect();
  } catch (error) {
    reportServerException(error, { tags: { area: "onboarding", stage: "retry" } });
    return Response.json({ error: "Retry unavailable" }, { status: 503 });
  }
}
