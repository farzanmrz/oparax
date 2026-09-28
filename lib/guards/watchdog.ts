import "server-only";

import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { ledgerRows } from "@/lib/guards/ledger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkSourceSpend(sourceId: string): Promise<boolean> {
  const claim = await claimRun(`source-spend:${sourceId}`, 60);
  if (!claim) {
    const { data: source, error } = await createAdminClient()
      .from("sources")
      .select("paused_at")
      .eq("id", sourceId)
      .single();
    if (error) throw error;
    return source.paused_at !== null;
  }
  try {
    const db = createAdminClient();
    const { data: source, error } = await db
      .from("sources")
      .select("paused_at,paused_reason,paused_days")
      .eq("id", sourceId)
      .single();
    if (error) throw error;
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const key = `source_spend:${sourceId}`;
    if (source.paused_at) {
      if (
        source.paused_reason !== "spend" ||
        source.paused_days >= 2 ||
        source.paused_at.slice(0, 10) === day
      )
        return true;
      // Preserve the first pause after clearing today's stop, so the 48-hour rule survives.
      const { error: historyError } = await db.from("config").upsert({
        key,
        value: { last_paused_at: source.paused_at },
        updated_at: now.toISOString(),
      });
      if (historyError) throw historyError;
      const { error: clearError } = await db
        .from("sources")
        .update({ paused_at: null, paused_reason: null })
        .eq("id", sourceId)
        .eq("paused_at", source.paused_at)
        .eq("paused_reason", "spend");
      if (clearError) throw clearError;
    }
    const rows = await ledgerRows({ sourceId, day });
    const spent = rows
      .filter((row) => row.kind !== "post_share")
      .reduce((sum, row) => sum + (row.settled ? row.usd : row.usd_reserved), 0);
    if (spent <= 1) return false;
    const { data: history, error: historyError } = await db
      .from("config")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (historyError) throw historyError;
    const previous = z
      .object({ last_paused_at: z.iso.datetime({ offset: true }) })
      .safeParse(history?.value);
    const repeat =
      source.paused_days > 0 &&
      previous.success &&
      now.getTime() - Date.parse(previous.data.last_paused_at) <= 48 * 60 * 60 * 1000;
    const { data: paused, error: pauseError } = await db
      .from("sources")
      .update({
        paused_at: now.toISOString(),
        paused_reason: "spend",
        paused_days: repeat ? source.paused_days + 1 : 1,
      })
      .eq("id", sourceId)
      .is("paused_at", null)
      .select("id")
      .maybeSingle();
    if (pauseError) throw pauseError;
    if (paused) {
      track(
        "source_paused",
        { source_id: sourceId, usd: spent, reason: "spend", held: Boolean(repeat) },
        sourceId,
      );
      const { error: saveError } = await db.from("config").upsert({
        key,
        value: { last_paused_at: now.toISOString() },
        updated_at: now.toISOString(),
      });
      if (saveError) throw saveError;
    }
    return true;
  } finally {
    await claim.release();
  }
}

export async function checkAllSources(deadline = Date.now() + 240_000): Promise<number> {
  const db = createAdminClient();
  let cursor = "";
  let checked = 0;
  while (Date.now() < deadline) {
    const { data, error } = await db
      .from("sources")
      .select("id")
      .gt("id", cursor)
      .order("id")
      .limit(20);
    if (error) throw error;
    if (!data.length) break;
    await Promise.all(data.map((source) => checkSourceSpend(source.id)));
    checked += data.length;
    cursor = data[data.length - 1].id;
  }
  return checked;
}
