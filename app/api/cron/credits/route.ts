import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { refreshXBalance, type XBalance } from "@/lib/guards/guards";
import { reserveCost, settleCost } from "@/lib/guards/ledger";
import { checkAllSources } from "@/lib/guards/watchdog";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { xGet } from "@/lib/x/client";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let claim: Awaited<ReturnType<typeof claimRun>> = null;
  try {
    claim = await claimRun("credits", 360);
    if (!claim) return Response.json({ skipped: "claimed" });
    const deadline = Date.now() + 240_000;
    const db = createAdminClient();
    const { data, error } = await db.from("config").select("key,value");
    if (error) throw error;
    const config = Object.fromEntries(data.map((row) => [row.key, row.value]));
    if (config.kill_switch !== false) {
      track(
        "run_skipped",
        { job: "credits", run_id: claim.runId, reason: "kill_switch" },
        "server",
      );
      return Response.json({ skipped: "kill_switch" });
    }
    const previous = z
      .object({
        console: z.number().nullable(),
        checked_at: z.string().nullable(),
        status: z.enum(["ok", "unknown", "failed"]),
      })
      .safeParse(config.x_balance);
    const balance: XBalance = await refreshXBalance(previous.success ? previous.data : undefined);
    if (balance.status === "ok") track("x_balance_read", { usd: balance.console }, "server");
    try {
      const bot = z
        .object({ x_user_id: z.string().nullable(), handle: z.string().nullable() })
        .safeParse(config.bot);
      if (!bot.success || !bot.data.x_user_id || !bot.data.handle) {
        const reservation = await reserveCost({
          service: "x",
          kind: "credits",
          usdReserved: 0.01,
          runId: claim.runId,
        });
        if ("refused" in reservation) throw new Error("Bot identity reservation refused");
        const response = await xGet(
          "users/me",
          {},
          { token: "bot", funding: { reservationId: reservation.id }, maxPosts: 0 },
        );
        if (response.status !== 200 || response.uncertain)
          throw new Error(`Bot identity ${response.status}`);
        const identity = z
          .object({ data: z.object({ id: z.string().regex(/^\d+$/), username: z.string() }) })
          .parse(response.body).data;
        const { error: botError } = await db.from("config").upsert({
          key: "bot",
          value: { x_user_id: identity.id, handle: identity.username },
          updated_at: new Date().toISOString(),
        });
        if (botError) throw botError;
      }
    } catch (error) {
      reportServerException(error, { tags: { area: "credits", stage: "bot_identity" } });
    }
    const sources = await checkAllSources(deadline);
    let reconciled = 0;
    let cursor = 0;
    while (Date.now() < deadline) {
      const { data: rows, error: ledgerError } = await db
        .from("cost_ledger")
        .select("id,usd_reserved")
        .eq("settled", false)
        .lt("created_at", new Date(Date.now() - 600_000).toISOString())
        .gt("id", cursor)
        .order("id")
        .limit(100);
      if (ledgerError) throw ledgerError;
      if (!rows.length) break;
      await Promise.all(rows.map((row) => settleCost(row.id, { usd: row.usd_reserved })));
      reconciled += rows.length;
      cursor = rows[rows.length - 1].id;
    }
    let paused = 0;
    let monitorCursor = "00000000-0000-0000-0000-000000000000";
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
    while (Date.now() < deadline) {
      const { data: monitors, error: monitorError } = await db
        .from("monitors")
        .select("id")
        .eq("tier", "free")
        .eq("status", "live")
        .is("paid_through", null)
        .lte("build_finished_at", cutoff)
        .or(`last_viewed_at.is.null,last_viewed_at.lte.${cutoff}`)
        .gt("id", monitorCursor)
        .order("id")
        .limit(100);
      if (monitorError) throw monitorError;
      if (!monitors.length) break;
      const { data: changed, error: pauseError } = await db
        .from("monitors")
        .update({ status: "paused" })
        .in(
          "id",
          monitors.map((m) => m.id),
        )
        .eq("tier", "free")
        .eq("status", "live")
        .is("paid_through", null)
        .lte("build_finished_at", cutoff)
        .or(`last_viewed_at.is.null,last_viewed_at.lte.${cutoff}`)
        .select("id");
      if (pauseError) throw pauseError;
      paused += changed.length;
      monitorCursor = monitors[monitors.length - 1].id;
    }
    if (balance.status !== "ok") throw new Error("X balance read failed");
    track(
      "run_completed",
      {
        job: "credits",
        run_id: claim.runId,
        counts: { sources, reconciled, paused },
        stopped_at_deadline: Date.now() >= deadline,
      },
      "server",
    );
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "credits", stage: "cron" } });
    track(
      "run_failed",
      {
        job: "credits",
        run_id: claim?.runId,
        error: error instanceof Error ? error.message : String(error),
      },
      "server",
    );
    return Response.json({ error: "Credits maintenance failed" }, { status: 500 });
  } finally {
    if (claim) {
      try {
        await claim.release();
      } catch (error) {
        reportServerException(error, { tags: { area: "credits", stage: "release" } });
      }
    }
  }
}
