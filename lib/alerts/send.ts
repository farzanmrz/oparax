import "server-only";

import { DM_STORIES, packStories } from "@/lib/alerts/pack";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { BudgetRefused, CostUnbounded } from "@/lib/guards/ledger";
import { dueDailySlot, monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { xSendDm } from "@/lib/x/client";

const DAILY_SEND_LIMIT = 1_440;
type Monitor = Tables<"monitors">;
export type AlertCounts = {
  dms: number;
  stories: number;
  held: number;
  failed: number;
  failed_monitors: number;
};

async function holdInterrupted(deadline: number): Promise<number> {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  let held = 0;
  while (Date.now() < deadline) {
    const { data: stale, error } = await db
      .from("deliveries")
      .select("monitor_id,story_id")
      .eq("state", "sending")
      .lt("attempted_at", cutoff)
      .limit(100);
    if (error) throw error;
    if (!stale.length) break;
    for (const row of stale) {
      const { data, error: updateError } = await db
        .from("deliveries")
        .update({ state: "held", error: "Send was interrupted; delivery is unknown" })
        .eq("monitor_id", row.monitor_id)
        .eq("story_id", row.story_id)
        .eq("state", "sending")
        .lt("attempted_at", cutoff)
        .select("story_id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (data) {
        held++;
        track("delivery_held", {}, row.monitor_id);
      }
    }
  }
  return held;
}

async function pendingStories(monitor: Monitor, deadline: number) {
  const db = createAdminClient();
  const candidates: Pick<Tables<"stories">, "id" | "card">[] = [];
  for (let offset = 0; Date.now() < deadline; offset += 100) {
    let query = db
      .from("stories")
      .select("id,card,deliveries(state,tries)")
      .eq("monitor_id", monitor.id)
      .eq("status", "written")
      .is("alerted_at", null)
      .order("opened_at")
      .order("id")
      .range(offset, offset + 99);
    if (monitor.bot_connected_at) query = query.gte("opened_at", monitor.bot_connected_at);
    const { data, error } = await query;
    if (error) throw error;
    for (const story of data) {
      if (story.deliveries.some((row) => row.state !== "failed" || row.tries !== 1)) continue;
      if (!packStories(monitor.handle, [story]).stories.length) continue;
      candidates.push(story);
      if (candidates.length === DM_STORIES) return packStories(monitor.handle, candidates);
    }
    if (data.length < 100) break;
  }
  return packStories(monitor.handle, candidates);
}

async function claimStory(monitorId: string, storyId: string, attemptedAt: string) {
  const db = createAdminClient();
  const { error } = await db.from("deliveries").insert({
    monitor_id: monitorId,
    story_id: storyId,
    state: "sending",
    attempted_at: attemptedAt,
    tries: 1,
  });
  if (!error) return true;
  if (error.code !== "23505") throw error;
  const { data, error: retryError } = await db
    .from("deliveries")
    .update({ state: "sending", attempted_at: attemptedAt, tries: 2, error: null })
    .eq("monitor_id", monitorId)
    .eq("story_id", storyId)
    .eq("state", "failed")
    .eq("tries", 1)
    .select("story_id")
    .maybeSingle();
  if (retryError) throw retryError;
  return data !== null;
}

async function sendForMonitor(
  monitor: Monitor,
  deadline: number,
  counts: AlertCounts,
  now: Date,
): Promise<boolean> {
  const state = monitorState(monitor, now);
  if (
    monitor.bot_state !== "active" ||
    !monitor.subscriber_x_user_id ||
    (state.state !== "trial" && state.state !== "paid")
  )
    return false;
  // The verified subscriber must remain the owner even after a manual table edit.
  if (monitor.subscriber_x_user_id !== monitor.x_user_id) return false;
  const slot =
    state.cadence === "daily"
      ? dueDailySlot(monitor, now)
      : new Date(Math.floor(now.getTime() / 900_000) * 900_000);
  if (monitor.last_alert_at && Date.parse(monitor.last_alert_at) >= slot.getTime()) return false;
  const db = createAdminClient();
  // A successful or uncertain send consumes the slot even if updating the monitor crashed.
  const { count: slotSends, error: slotError } = await db
    .from("deliveries")
    .select("story_id", { count: "exact", head: true })
    .eq("monitor_id", monitor.id)
    .in("state", ["sent", "sending", "held"])
    .gte("attempted_at", slot.toISOString());
  if (slotError) throw slotError;
  if (slotSends) return false;
  const packed = await pendingStories(monitor, deadline);
  if (Date.now() >= deadline) return false;
  if (!packed.stories.length) {
    if (state.cadence === "daily") {
      const { error } = await db
        .from("monitors")
        .update({ last_alert_at: now.toISOString() })
        .eq("id", monitor.id)
        .eq("bot_state", "active");
      if (error) throw error;
    }
    return false;
  }
  // Include unresolved reservations: an unknown send may have reached X too.
  const { count: sends, error: countError } = await db
    .from("cost_ledger")
    .select("id", { count: "exact", head: true })
    .eq("service", "x")
    .eq("kind", "dm_send")
    .or("settled.eq.false,usd.gt.0")
    .eq("day", new Date().toISOString().slice(0, 10));
  if (countError) throw countError;
  if ((sends ?? 0) >= DAILY_SEND_LIMIT) {
    counts.held += packed.stories.length;
    track("delivery_held", {}, monitor.id);
    return true;
  }
  const attemptedAt = new Date().toISOString();
  const claimed = [];
  try {
    for (const story of packed.stories) {
      if (await claimStory(monitor.id, story.id, attemptedAt)) claimed.push(story);
    }
  } catch (error) {
    const { error: deleteError } = await db
      .from("deliveries")
      .delete()
      .eq("monitor_id", monitor.id)
      .eq("state", "sending")
      .eq("attempted_at", attemptedAt);
    if (deleteError)
      reportServerException(deleteError, {
        tags: { area: "alerts", stage: "claim_cleanup" },
        distinctId: monitor.id,
      });
    throw error;
  }
  const message = packStories(monitor.handle, claimed);
  if (!message.stories.length) return false;
  const ids = message.stories.map((story) => story.id);
  let result: Awaited<ReturnType<typeof xSendDm>>;
  try {
    result = await xSendDm(monitor.subscriber_x_user_id, message.text, { monitorId: monitor.id });
  } catch (error) {
    if (!(error instanceof BudgetRefused || error instanceof CostUnbounded)) throw error;
    const { error: deleteError } = await db
      .from("deliveries")
      .delete()
      .eq("monitor_id", monitor.id)
      .in("story_id", ids)
      .eq("state", "sending")
      .eq("attempted_at", attemptedAt);
    if (deleteError) throw deleteError;
    return false;
  }
  const finishedAt = new Date().toISOString();
  if (result.ok) {
    const { error } = await db
      .from("deliveries")
      .update({
        state: "sent",
        dm_event_id: result.dmEventId,
        sent_at: finishedAt,
        error: null,
      })
      .eq("monitor_id", monitor.id)
      .in("story_id", ids)
      .eq("state", "sending")
      .eq("attempted_at", attemptedAt);
    if (error) throw error;
    const { error: storyError } = await db
      .from("stories")
      .update({ alerted_at: finishedAt })
      .eq("monitor_id", monitor.id)
      .in("id", ids)
      .is("alerted_at", null);
    if (storyError) throw storyError;
    const { error: monitorError } = await db
      .from("monitors")
      .update({ last_alert_at: finishedAt })
      .eq("id", monitor.id);
    if (monitorError) throw monitorError;
    counts.dms++;
    counts.stories += ids.length;
    for (const _id of ids) track("story_alerted", {}, monitor.id);
  } else {
    const { data, error } = await db
      .from("deliveries")
      .update({
        state: result.uncertain ? "held" : "failed",
        error: result.error,
      })
      .eq("monitor_id", monitor.id)
      .in("story_id", ids)
      .eq("state", "sending")
      .eq("attempted_at", attemptedAt)
      .select("story_id");
    if (error) throw error;
    if (result.uncertain) {
      counts.held += data.length;
      for (const _row of data) track("delivery_held", {}, monitor.id);
    } else counts.failed += data.length;
  }
  return false;
}

export async function sendAlerts(deadline: number) {
  const startedAt = new Date();
  const counts: AlertCounts = {
    dms: 0,
    stories: 0,
    held: await holdInterrupted(deadline),
    failed: 0,
    failed_monitors: 0,
  };
  const db = createAdminClient();
  let cursor = "00000000-0000-0000-0000-000000000000";
  while (Date.now() < deadline) {
    const { data, error } = await db
      .from("monitors")
      .select("id,subscriber_x_user_id")
      .eq("bot_state", "active")
      .not("subscriber_x_user_id", "is", null)
      .gt("id", cursor)
      .order("id")
      .limit(100);
    if (error) throw error;
    if (!data.length) break;
    for (const row of data) {
      if (Date.now() >= deadline) return { ...counts, capped: false };
      const claim = await claimRun(`dm:${row.subscriber_x_user_id}`, 360);
      if (!claim) continue;
      try {
        const { data: monitor, error: readError } = await db
          .from("monitors")
          .select("*")
          .eq("id", row.id)
          .single();
        if (readError) throw readError;
        if (await sendForMonitor(monitor, deadline, counts, startedAt))
          return { ...counts, capped: true };
      } catch (error) {
        reportServerException(error, {
          tags: { area: "alerts", stage: "send" },
          distinctId: row.id,
        });
        counts.failed_monitors++;
      } finally {
        await claim.release();
      }
    }
    cursor = data[data.length - 1].id;
  }
  return { ...counts, capped: false };
}
