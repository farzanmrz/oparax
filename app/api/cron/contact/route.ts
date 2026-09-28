import { track } from "@/lib/analytics/events";
import { retryContact } from "@/lib/contact/save";
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
    claim = await claimRun("contact", 360);
    if (!claim) return Response.json({ skipped: "claimed" });
    if ((await guards()).killSwitch) {
      track(
        "run_skipped",
        { job: "contact", run_id: claim.runId, reason: "kill_switch" },
        "server",
      );
      return Response.json({ skipped: "kill_switch" });
    }
    const counts = await retryContact(deadline);
    track("run_completed", { job: "contact", run_id: claim.runId, counts }, "server");
    return Response.json({ ok: true, counts });
  } catch (error) {
    reportServerException(error, { tags: { area: "contact", stage: "cron" } });
    track(
      "run_failed",
      {
        job: "contact",
        run_id: claim?.runId,
        error: error instanceof Error ? error.message : String(error),
      },
      "server",
    );
    return Response.json({ error: "Contact retry failed" }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "contact", stage: "release" } });
      }
    }
  }
}
