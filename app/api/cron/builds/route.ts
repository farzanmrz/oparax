import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { claimBuild, runBuild } from "@/lib/onboarding/run";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 800;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  let claim: Awaited<ReturnType<typeof claimRun>> = null;
  try {
    claim = await claimRun("builds", 860);
    if (!claim) return Response.json({ skipped: "claimed" });
    const guard = await guards();
    if (guard.killSwitch || !guard.trialPollingOpen) {
      track(
        "run_skipped",
        {
          job: "builds",
          run_id: claim.runId,
          reason: guard.killSwitch ? "kill_switch" : "credits",
        },
        "server",
      );
      return Response.json({ skipped: "closed" });
    }
    const db = createAdminClient();
    const now = new Date().toISOString();
    const staleStart = new Date(Date.now() - 600_000).toISOString();
    // A fresh unclaimed row still belongs to the request performing its X lookup.
    const expired = `build_lease_until.lte.${now},and(build_lease_until.is.null,build_started_at.lte.${staleStart})`;
    const candidates: { id: string; build_tries: number }[] = [];
    let cursor = "00000000-0000-0000-0000-000000000000";
    for (;;) {
      const { data, error } = await db
        .from("monitors")
        .select("id,build_tries")
        .eq("status", "building")
        .or(expired)
        .gt("id", cursor)
        .order("id")
        .limit(1000);
      if (error) throw error;
      candidates.push(...data);
      if (data.length < 1000) break;
      cursor = data[data.length - 1].id;
    }
    const results = await Promise.allSettled(
      candidates.map(async (monitor) => {
        const runId = crypto.randomUUID();
        if (await claimBuild(monitor.id, runId)) {
          await runBuild(monitor.id, runId);
          return;
        }
        const { data, error } = await db
          .from("monitors")
          .update({
            status: "failed",
            build_error: "Building stopped: too many tries.",
            build_lease_until: null,
            build_lease_owner: null,
          })
          .eq("id", monitor.id)
          .eq("status", "building")
          .gte("build_tries", 2)
          .or(expired)
          .select("id");
        if (error) throw error;
        if (data.length) track("agent_build_failed", { reason: "tries" }, monitor.id);
      }),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    track(
      "run_completed",
      { job: "builds", run_id: claim.runId, count: candidates.length },
      "server",
    );
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "onboarding", stage: "cron" } });
    track("run_failed", { job: "builds", run_id: claim?.runId }, "server");
    return Response.json({ error: "Build recovery failed" }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "onboarding", stage: "cron_release" } });
      }
    }
  }
}
