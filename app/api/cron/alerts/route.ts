import { sendAlerts } from "@/lib/alerts/send";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deadline = Date.now() + 240_000;
  let claim: Awaited<ReturnType<typeof claimRun>> = null;
  try {
    claim = await claimRun("alerts", 360);
    if (!claim) return Response.json({ skipped: "claimed" });
    const limits = await guards();
    if (limits.killSwitch) {
      track("run_skipped", { job: "alerts", run_id: claim.runId, reason: "kill_switch" }, "server");
      return Response.json({ skipped: "kill_switch" });
    }
    const { capped, ...counts } = await sendAlerts(deadline);
    track(
      counts.failed_monitors ? "run_failed" : "run_completed",
      {
        job: "alerts",
        run_id: claim.runId,
        counts,
        failed_monitors: counts.failed_monitors,
        ...(counts.failed_monitors ? { error: "Monitor delivery failed" } : {}),
        capped,
        stopped_at_deadline: Date.now() >= deadline,
      },
      "server",
    );
    return Response.json({ ok: true, counts, capped });
  } catch (error) {
    reportServerException(error, { tags: { area: "alerts", stage: "cron" } });
    track(
      "run_failed",
      {
        job: "alerts",
        run_id: claim?.runId,
        error: error instanceof Error ? error.message : String(error),
      },
      "server",
    );
    return Response.json({ error: "Alert delivery failed" }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "alerts", stage: "release" } });
      }
    }
  }
}
