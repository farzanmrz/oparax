import { after } from "next/server";
import { pollAccounts } from "@/lib/accounts/poll";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deadline = Date.now() + 240_000;
  after(async () => {
    let claim: Awaited<ReturnType<typeof claimRun>> = null;
    try {
      claim = await claimRun("accounts", maxDuration + 60);
      if (!claim) return;
      const guard = await guards();
      if (guard.killSwitch) {
        track(
          "run_skipped",
          { job: "accounts", run_id: claim.runId, reason: "kill_switch" },
          "server",
        );
        return;
      }
      const result = await pollAccounts({
        runId: claim.runId,
        trialPollingOpen: guard.trialPollingOpen,
        deadline,
      });
      track(
        "run_completed",
        {
          job: "accounts",
          run_id: claim.runId,
          counts: result.counts,
          stopped_at_deadline: result.stoppedAtDeadline,
        },
        "server",
      );
    } catch (error) {
      reportServerException(error, { tags: { area: "accounts", stage: "cron" } });
      track(
        "run_failed",
        {
          job: "accounts",
          run_id: claim?.runId,
          error: error instanceof Error ? error.message : String(error),
        },
        "server",
      );
    } finally {
      if (claim) {
        try {
          await claim.release();
        } catch (error) {
          reportServerException(error, { tags: { area: "accounts", stage: "release" } });
        }
      }
    }
  });
  return Response.json({ accepted: true }, { status: 202 });
}
