import { after } from "next/server";
import { z } from "zod";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { claimBuild, runBuild } from "@/lib/onboarding/run";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 800;

export async function POST(request: Request) {
  const json = request.headers.get("content-type")?.includes("application/json") ?? false;
  const fail = (error: string, status: number) =>
    json
      ? Response.json({ ok: false, error }, { status })
      : Response.redirect(new URL("/onboarding?error=build_unavailable", request.url), 303);
  const open = (path: string) =>
    json
      ? Response.json({ ok: true, redirect: path })
      : Response.redirect(new URL(path, request.url), 303);
  let raw: unknown;
  try {
    raw = json ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return fail("invalid_request", 400);
  }
  const input = z.object({ monitorId: z.uuid() }).safeParse(raw);
  if (!input.success) return fail("invalid_request", 400);

  try {
    const session = await createClient();
    const auth = await session.auth.getUser();
    if (!auth.data.user) return fail("signed_out", 401);
    const owner = await session
      .from("monitors")
      .select("id,handle,status,build_tries,x_user_id,build_lease_owner,build_lease_until")
      .eq("id", input.data.monitorId)
      .eq("user_id", auth.data.user.id)
      .maybeSingle();
    if (owner.error) throw owner.error;
    if (!owner.data) return fail("build_unavailable", 503);
    const monitor = owner.data;
    const page = () => open(`/${monitor.handle}`);
    if (monitor.status !== "failed") return page();

    if (!monitor.x_user_id) {
      const leaseUntil = monitor.build_lease_until;
      if (!monitor.build_lease_owner || !leaseUntil || leaseUntil > new Date().toISOString())
        return fail("build_unavailable", 503);
      const expired = await createAdminClient().rpc("expire_unconfirmed_build", {
        p_monitor: monitor.id,
        p_run_id: monitor.build_lease_owner,
      });
      if (expired.error)
        reportServerException(expired.error, {
          tags: { area: "onboarding", stage: "retry_expiry" },
        });
      const reread = await session
        .from("monitors")
        .select("handle")
        .eq("user_id", auth.data.user.id)
        .maybeSingle();
      if (reread.error) {
        reportServerException(reread.error, {
          tags: { area: "onboarding", stage: "retry_read" },
        });
        return fail("build_unavailable", 503);
      }
      return open(reread.data ? `/${reread.data.handle}` : "/onboarding?error=build_unavailable");
    }

    if (monitor.build_tries >= 2) return page();
    const guard = await guards();
    if (guard.killSwitch || !guard.trialPollingOpen) return page();
    const runId = crypto.randomUUID();
    if (await claimBuild(monitor.id, runId)) after(() => runBuild(monitor.id, runId));
    return page();
  } catch (error) {
    reportServerException(error, { tags: { area: "onboarding", stage: "retry" } });
    return fail("build_unavailable", 503);
  }
}
