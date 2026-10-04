import { track } from "@/lib/analytics/events";
import { githubCandidates, githubReader } from "@/lib/digests/github";
import { type LaunchCandidate, productHuntCandidates } from "@/lib/digests/product-hunt";
import { saveDigestCandidates } from "@/lib/digests/prompts";
import { checkThresholds } from "@/lib/digests/thresholds";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 800;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const admissionDeadline = started + 700_000;
  const workDeadline = started + 790_000;
  const counts = { monitors: 0, repos: 0, launches: 0, thresholds: 0 };
  let claim: Awaited<ReturnType<typeof claimRun>> = null;
  let failures = 0;
  let deferred = false;
  try {
    claim = await claimRun("digests", 860);
    if (!claim) return Response.json({ skipped: "claimed" });
    if ((await guards()).killSwitch) {
      track(
        "run_skipped",
        { job: "digests", run_id: claim.runId, reason: "kill_switch" },
        "server",
      );
      return Response.json({ skipped: "kill_switch" });
    }
    const db = createAdminClient();
    const reader = githubReader(workDeadline);
    let launches: Promise<LaunchCandidate[]> | undefined;
    let cursor = "00000000-0000-0000-0000-000000000000";
    while (Date.now() < admissionDeadline) {
      const { data: monitors, error } = await db
        .from("monitors")
        .select("*")
        .gt("paid_through", new Date().toISOString())
        .or("digest_github.eq.true,digest_product_hunt.eq.true")
        .gt("id", cursor)
        .order("id")
        .limit(100);
      if (error) throw error;
      if (!monitors.length) break;
      for (const monitor of monitors) {
        if (Date.now() >= admissionDeadline) break;
        cursor = monitor.id;
        if (monitorState(monitor).state !== "paid") continue;
        if ((await guards()).killSwitch) {
          track(
            "run_skipped",
            { job: "digests", run_id: claim.runId, reason: "kill_switch", counts },
            "server",
          );
          return Response.json({ skipped: "kill_switch", counts });
        }
        if (Date.now() >= admissionDeadline) break;
        counts.monitors++;
        const jobs: { stage: string; work: Promise<void> }[] = [];
        if (monitor.digest_github) {
          jobs.push({
            stage: "github",
            work: githubCandidates(monitor.brief, reader)
              .then((candidates) => saveDigestCandidates(monitor, candidates, workDeadline))
              .then((saved) => {
                counts.repos += saved.repos;
                deferred ||= saved.deferred;
              }),
          });
          jobs.push({
            stage: "thresholds",
            work: checkThresholds(monitor.id, reader, workDeadline).then((crossed) => {
              counts.thresholds += crossed;
            }),
          });
        }
        if (monitor.digest_product_hunt) {
          // Every monitor sees the same ranked launches from this run's one provider read.
          launches ??= productHuntCandidates(new Date(started));
          jobs.push({
            stage: "product_hunt",
            work: launches
              .then((candidates) => saveDigestCandidates(monitor, candidates, workDeadline))
              .then((saved) => {
                counts.launches += saved.launches;
                deferred ||= saved.deferred;
              }),
          });
        }
        const results = await Promise.allSettled(jobs.map((job) => job.work));
        for (const [index, result] of results.entries()) {
          if (result.status === "fulfilled") continue;
          failures++;
          reportServerException(result.reason, {
            tags: { area: "digests", stage: jobs[index].stage },
            extra: { monitor_id: monitor.id, run_id: claim.runId },
          });
        }
      }
    }
    if (failures) throw new Error(`${failures} digest tasks failed`);
    track(
      "run_completed",
      {
        job: "digests",
        run_id: claim.runId,
        counts,
        stopped_at_deadline: deferred || Date.now() >= admissionDeadline,
      },
      "server",
    );
    return Response.json({ ok: true, counts });
  } catch (error) {
    reportServerException(error, { tags: { area: "digests", stage: "cron" } });
    track(
      "run_failed",
      {
        job: "digests",
        run_id: claim?.runId,
        counts,
        error: error instanceof Error ? error.message : String(error),
      },
      "server",
    );
    return Response.json({ error: "Digest update failed", counts }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "digests", stage: "release" } });
      }
    }
  }
}
