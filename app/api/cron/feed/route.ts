import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { emptyCounts, processMonitor } from "@/lib/feed/process";
import { errorMessage } from "@/lib/feed/types";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;
const PARALLEL_MONITORS = 8;
const ADMIT_MS = 150_000;
const FINISH_MS = 270_000;
const MONITOR_BATCH = 80;
const PENDING_PAGE = 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = z.string().min(1).safeParse(request.headers.get("authorization"));
  if (!secret || !header.success || header.data !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  let claim: Awaited<ReturnType<typeof claimRun>> = null;
  try {
    claim = await claimRun("feed", maxDuration + 60);
    if (!claim) return Response.json({ skipped: "claimed" });
    if ((await guards()).killSwitch) {
      track("run_skipped", { job: "feed", run_id: claim.runId, reason: "kill_switch" }, "server");
      await claim.release();
      return Response.json({ skipped: "kill_switch" });
    }
  } catch (error) {
    reportServerException(error, { tags: { area: "feed", stage: "claim" } });
    if (claim) {
      try {
        await claim.release();
      } catch (releaseError) {
        reportServerException(releaseError, { tags: { area: "feed", stage: "release" } });
      }
    }
    return Response.json({ error: "Feed could not start" }, { status: 500 });
  }
  const lease = claim;
  after(async () => {
    const counts = emptyCounts();
    let failedMonitors = 0;
    const admitUntil = started + ADMIT_MS;
    const deadline = started + FINISH_MS;
    try {
      const db = createAdminClient();
      let cursor = "00000000-0000-0000-0000-000000000000";
      while (Date.now() < admitUntil) {
        const { data: pending, error } = await db
          .from("monitor_items")
          .select("monitor_id")
          .eq("status", "pending")
          .gt("monitor_id", cursor)
          .order("monitor_id")
          .limit(PENDING_PAGE);
        if (error) throw error;
        if (!pending.length) break;
        const ids = [...new Set(pending.map((row) => row.monitor_id))];
        cursor = ids[ids.length - 1];
        for (
          let offset = 0;
          offset < ids.length && Date.now() < admitUntil;
          offset += MONITOR_BATCH
        ) {
          const { data: monitors, error: monitorError } = await db
            .from("monitors")
            .select("*")
            .in("id", ids.slice(offset, offset + MONITOR_BATCH))
            .order("id");
          if (monitorError) throw monitorError;
          const eligible = monitors.filter((monitor) =>
            ["trial", "paid"].includes(monitorState(monitor).state),
          );
          let next = 0;
          await Promise.all(
            Array.from({ length: Math.min(PARALLEL_MONITORS, eligible.length) }, async () => {
              while (next < eligible.length && Date.now() < admitUntil) {
                const monitor = eligible[next++];
                try {
                  const result = await processMonitor(monitor, lease.runId, admitUntil, deadline);
                  counts.judged += result.judged;
                  counts.on += result.on;
                  counts.skipped += result.skipped;
                  counts.stories += result.stories;
                  counts.cards += result.cards;
                  counts.failed += result.failed;
                } catch (error) {
                  failedMonitors++;
                  reportServerException(error, {
                    tags: { area: "feed", stage: "monitor", monitor_id: monitor.id },
                  });
                }
              }
            }),
          );
        }
        if (pending.length < PENDING_PAGE) break;
      }
      track(
        failedMonitors ? "run_failed" : "run_completed",
        {
          job: "feed",
          run_id: lease.runId,
          counts,
          failed_monitors: failedMonitors,
          stopped_at_deadline: Date.now() >= admitUntil,
          ...(failedMonitors ? { error: "Monitor processing failed" } : {}),
        },
        "server",
      );
    } catch (error) {
      reportServerException(error, { tags: { area: "feed", stage: "cron" } });
      track(
        "run_failed",
        { job: "feed", run_id: lease.runId, counts, error: errorMessage(error) },
        "server",
      );
    } finally {
      try {
        await lease.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "feed", stage: "release" } });
      }
    }
  });
  return Response.json({ ok: true, run_id: lease.runId });
}
