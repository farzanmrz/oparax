import { track } from "@/lib/analytics/events";
import { type CollectionCounts, pollSource, type SourceWatcher } from "@/lib/collect/poll";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

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
    claim = await claimRun("collect", maxDuration + 60);
    if (!claim) return Response.json({ skipped: "claimed" });
    if ((await guards()).killSwitch) {
      track(
        "run_skipped",
        { job: "collect", run_id: claim.runId, reason: "kill_switch" },
        "server",
      );
      return Response.json({ skipped: "kill_switch" });
    }
    // Leave time to persist completed reads and release the claim before the function expires.
    const signal = AbortSignal.timeout(Math.max(1, deadline - Date.now()));
    const now = new Date();
    const db = createAdminClient();
    const watchers = new Map<string, SourceWatcher[]>();
    const prefill = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("monitor_sources")
        .select("monitor_id,source_id,prefilled_at,monitors!inner(*)")
        .is("removed_at", null)
        .order("source_id")
        .order("monitor_id")
        .range(offset, offset + 499)
        .abortSignal(signal);
      if (error) throw error;
      for (const row of data) {
        const state = monitorState(row.monitors, now).state;
        if (state !== "dormant" && state !== "trial" && state !== "paid") continue;
        const sourceWatchers = watchers.get(row.source_id) ?? [];
        sourceWatchers.push({
          monitor_id: row.monitor_id,
          source_id: row.source_id,
          prefilled_at: row.prefilled_at,
        });
        watchers.set(row.source_id, sourceWatchers);
        if (row.prefilled_at === null) prefill.add(row.source_id);
      }
      if (data.length < 500) break;
    }
    const sourceIds = [...watchers.keys()];
    const sources: Tables<"sources">[] = [];
    for (let offset = 0; offset < sourceIds.length; offset += 200) {
      const { data, error } = await db
        .from("sources")
        .select("*")
        .in("id", sourceIds.slice(offset, offset + 200))
        .in("kind", ["rss", "website"])
        .is("paused_at", null)
        .order("next_fetch_at")
        .limit(200)
        .abortSignal(signal);
      if (error) throw error;
      sources.push(
        ...data.filter(
          (source) => prefill.has(source.id) || Date.parse(source.next_fetch_at) <= now.getTime(),
        ),
      );
    }
    sources.sort(
      (a, b) =>
        Number(prefill.has(b.id)) - Number(prefill.has(a.id)) ||
        Date.parse(a.next_fetch_at) - Date.parse(b.next_fetch_at) ||
        a.id.localeCompare(b.id),
    );
    const selected = sources.slice(0, 60);
    const counts: CollectionCounts = { sources: 0, items: 0, unreadable: 0 };
    for (let offset = 0; offset < selected.length; offset += 8) {
      if (signal.aborted) break;
      const results = await Promise.all(
        selected
          .slice(offset, offset + 8)
          .map((source) => pollSource(source, watchers.get(source.id) ?? [], signal)),
      );
      for (const result of results) {
        counts.sources += result.sources;
        counts.items += result.items;
        counts.unreadable += result.unreadable;
      }
    }
    track(
      "run_completed",
      { job: "collect", run_id: claim.runId, counts, stopped_at_deadline: signal.aborted },
      "server",
    );
    return Response.json({ ok: true, ...counts });
  } catch (error) {
    reportServerException(error, { tags: { area: "collect", stage: "cron" } });
    track(
      "run_failed",
      {
        job: "collect",
        run_id: claim?.runId,
        error: error instanceof Error ? error.message : String(error),
      },
      "server",
    );
    return Response.json({ error: "Collection failed" }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "collect", stage: "release" } });
      }
    }
  }
}
