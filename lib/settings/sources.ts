import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { type SettingsResult, settingsContent } from "@/lib/settings/content";
import { discoverFeedOrListing, isSafeDiscoveredUrl } from "@/lib/sources/discovery";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { normalizeValidHandle } from "@/lib/x/handle";

export const handleSchema = z
  .string()
  .max(32)
  .transform(normalizeValidHandle)
  .pipe(z.string())
  .transform((handle) => handle.toLowerCase());
const sourceIdSchema = z.string().min(1).max(300);
const errors = settingsContent.errors;

export async function ownedMonitor(rawHandle: unknown) {
  const parsed = handleSchema.safeParse(rawHandle);
  if (!parsed.success) return { ok: false as const, error: errors.invalid, reason: "invalid" };
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false as const, error: errors.signedOut, reason: "signedOut" };
  const { data: monitor, error } = await db
    .from("monitors")
    .select("*")
    .eq("handle", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!monitor) return { ok: false as const, error: errors.wrongAccount, reason: "wrongAccount" };
  return { ok: true as const, monitor, userId: user.id, email: user.email ?? null };
}

export async function changeSettings<T, R extends { ok: true } = { ok: true }>(
  schema: z.ZodType<T>,
  raw: unknown,
  work: (
    input: T,
    monitor: Tables<"monitors">,
    userId: string,
  ) => Promise<R | { ok: false; error: string }>,
  /**
   * Who may make the change beyond owning the agent: anyone signed up ("owner", the owner's October 6 ruling for
   * sources: "gated only by sign-up, not by payment"), a paid plan ("paid", for work that spends on paid Twitter
   * calls), or a paid or lapsed plan ("billing", the subscription portal).
   */
  gate: "owner" | "paid" | "billing" = "owner",
): Promise<R | { ok: false; error: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: errors.invalid };
  // Every mutation uses the same ownership boundary and its gate, including crafted calls.
  const handle = z.object({ handle: handleSchema }).safeParse(raw);
  if (!handle.success) return { ok: false, error: errors.invalid };
  try {
    const owned = await ownedMonitor(handle.data.handle);
    if (!owned.ok) return { ok: false, error: owned.error };
    const state = monitorState(owned.monitor).state;
    if (gate === "paid" && state !== "paid") return { ok: false, error: errors.paidOnly };
    if (gate === "billing" && state !== "paid" && state !== "lapsed")
      return { ok: false, error: errors.billing };
    const result = await work(parsed.data, owned.monitor, owned.userId);
    if (result.ok && gate !== "billing") {
      revalidatePath(`/${owned.monitor.handle}/settings`);
      revalidatePath(`/${owned.monitor.handle}`);
    }
    return result;
  } catch (error) {
    reportServerException(error, { tags: { area: "settings" } });
    return { ok: false, error: errors.unavailable };
  }
}

export async function addSourceForOwner(handle: unknown, url: unknown): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, url: z.url().max(2048) }),
    { handle, url },
    async (input, monitor, userId) => {
      const candidate = new URL(input.url);
      if (
        candidate.username ||
        candidate.password ||
        !isSafeDiscoveredUrl(input.url, candidate.hostname)
      )
        return { ok: false, error: errors.source };
      candidate.hash = "";
      const source = await discoverFeedOrListing(candidate);
      if (!source) return { ok: false, error: errors.source };
      const target = new URL(source.target);
      const id = `web-${target.hostname}-${createHash("sha1").update(source.target).digest("hex").slice(0, 8)}`;
      const db = createAdminClient();
      const { error: sourceError } = await db
        .from("sources")
        .upsert({ id, ...source }, { onConflict: "id", ignoreDuplicates: true });
      if (sourceError) throw sourceError;
      const { error } = await db.from("monitor_sources").upsert(
        {
          monitor_id: monitor.id,
          source_id: id,
          added_by: "person",
          removed_at: null,
          prefilled_at: null,
        },
        { onConflict: "monitor_id,source_id" },
      );
      if (error) throw error;
      track("source_added", { monitor_id: monitor.id, source_id: id, kind: source.kind }, userId);
      return { ok: true };
    },
  );
}

export async function removeSourceForOwner(
  handle: unknown,
  sourceId: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, sourceId: sourceIdSchema }),
    { handle, sourceId },
    async (input, monitor, userId) => {
      const { data, error } = await createAdminClient()
        .from("monitor_sources")
        .update({ removed_at: new Date().toISOString() })
        .eq("monitor_id", monitor.id)
        .eq("source_id", input.sourceId)
        .is("removed_at", null)
        .select("source_id");
      if (error) throw error;
      if (data.length)
        track("source_removed", { monitor_id: monitor.id, source_id: input.sourceId }, userId);
      return { ok: true };
    },
  );
}

export async function setNoFilterForOwner(
  handle: unknown,
  sourceId: unknown,
  on: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, sourceId: sourceIdSchema, on: z.boolean() }),
    { handle, sourceId, on },
    async (input, monitor, userId) => {
      const { data, error } = await createAdminClient()
        .from("monitor_sources")
        .update({ no_filter: input.on })
        .eq("monitor_id", monitor.id)
        .eq("source_id", input.sourceId)
        .is("removed_at", null)
        .select("source_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ok: false, error: errors.missingSource };
      track(
        "source_no_filter_changed",
        { monitor_id: monitor.id, source_id: input.sourceId, on: input.on },
        userId,
      );
      return { ok: true };
    },
  );
}
