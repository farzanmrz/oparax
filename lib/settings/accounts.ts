import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { guards } from "@/lib/guards/guards";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { type SettingsResult, settingsContent } from "@/lib/settings/content";
import { changeSettings, handleSchema } from "@/lib/settings/sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { xCounts } from "@/lib/x/client";

const errors = settingsContent.errors;
const repoSchema = z
  .string()
  .trim()
  .max(140)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/)
  .refine((repo) => ![".", ".."].includes(repo.split("/")[1]))
  .transform((repo) => repo.toLowerCase());
const timezones = new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]);

export async function setWatchedForOwner(
  handle: unknown,
  accountHandle: unknown,
  on: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, accountHandle: handleSchema, on: z.boolean() }),
    { handle, accountHandle, on },
    async (input, monitor, userId) => {
      const db = createAdminClient();
      const { data: account, error: readError } = await db
        .from("monitor_accounts")
        .select("watched")
        .eq("monitor_id", monitor.id)
        .eq("handle", input.accountHandle)
        .maybeSingle();
      if (readError) throw readError;
      if (!account) return { ok: false, error: errors.missingAccount };
      if (account.watched === input.on) return { ok: true };
      const { data, error } = await db
        .from("monitor_accounts")
        .update({
          watched: input.on,
          ...(input.on ? { watched_at: new Date().toISOString() } : {}),
        })
        .eq("monitor_id", monitor.id)
        .eq("handle", input.accountHandle)
        .eq("watched", !input.on)
        .select("handle");
      if (error) throw error;
      if (data.length)
        track(
          "account_watch_changed",
          { monitor_id: monitor.id, account_handle: input.accountHandle, on: input.on },
          userId,
        );
      return { ok: true };
    },
  );
}

export async function refreshCountsForOwner(handle: unknown): Promise<SettingsResult> {
  return changeSettings(z.object({ handle: handleSchema }), { handle }, async (_input, monitor) => {
    const gate = await guards();
    if (gate.killSwitch) return { ok: false, error: errors.countsClosed };
    const claim = await claimRun(`settings-counts:${monitor.id}`, 360);
    if (!claim) return { ok: true };
    after(async () => {
      try {
        const db = createAdminClient();
        const { data: current, error: monitorError } = await db
          .from("monitors")
          .select("*")
          .eq("id", monitor.id)
          .eq("user_id", monitor.user_id ?? "")
          .maybeSingle();
        if (monitorError) throw monitorError;
        if (!current || monitorState(current).state !== "paid") return;
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data, error } = await db
          .from("monitor_accounts")
          .select("handle")
          .eq("monitor_id", monitor.id)
          .or(`counts_checked_at.is.null,counts_checked_at.lt.${cutoff}`);
        if (error) throw error;
        const results = await Promise.allSettled(
          data.map(async (account) => {
            const postsPerDay = await xCounts(account.handle, { monitorId: monitor.id });
            // A failed count remains unknown, never zero or freshly checked.
            if (postsPerDay === null) return;
            const { error: saveError } = await db
              .from("monitor_accounts")
              .update({ posts_per_day: postsPerDay, counts_checked_at: new Date().toISOString() })
              .eq("monitor_id", monitor.id)
              .eq("handle", account.handle);
            if (saveError) throw saveError;
          }),
        );
        for (const result of results) if (result.status === "rejected") throw result.reason;
        revalidatePath(`/${monitor.handle}/settings`);
      } catch (error) {
        reportServerException(error, { tags: { area: "settings", stage: "counts" } });
      } finally {
        await claim.release();
      }
    });
    return { ok: true };
  });
}

export async function setAlertHourForOwner(
  handle: unknown,
  hour: unknown,
  timezone: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({
      handle: handleSchema,
      hour: z.number().int().min(0).max(23),
      timezone: z.string().refine((zone) => timezones.has(zone)),
    }),
    { handle, hour, timezone },
    async (input, monitor, userId) => {
      const { error } = await createAdminClient()
        .from("monitors")
        .update({ alert_hour: input.hour, alert_timezone: input.timezone })
        .eq("id", monitor.id);
      if (error) throw error;
      track(
        "alert_hour_changed",
        { monitor_id: monitor.id, hour: input.hour, timezone: input.timezone },
        userId,
      );
      return { ok: true };
    },
  );
}

export async function setDigestForOwner(
  handle: unknown,
  kind: unknown,
  on: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, kind: z.enum(["github", "product_hunt"]), on: z.boolean() }),
    { handle, kind, on },
    async (input, monitor, userId) => {
      const { error } = await createAdminClient()
        .from("monitors")
        .update(
          input.kind === "github" ? { digest_github: input.on } : { digest_product_hunt: input.on },
        )
        .eq("id", monitor.id);
      if (error) throw error;
      track("digest_switched", { monitor_id: monitor.id, kind: input.kind, on: input.on }, userId);
      return { ok: true };
    },
  );
}

export async function followRepoForOwner(
  handle: unknown,
  repo: unknown,
  threshold: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({
      handle: handleSchema,
      repo: repoSchema,
      threshold: z.number().int().min(1).max(2147483647),
    }),
    { handle, repo, threshold },
    async (input, monitor, userId) => {
      const db = createAdminClient();
      const { error: resetError } = await db
        .from("followed_repos")
        .update({ threshold: input.threshold, crossed_at: null })
        .eq("monitor_id", monitor.id)
        .eq("repo", input.repo)
        .neq("threshold", input.threshold);
      if (resetError) throw resetError;
      const { error } = await db.from("followed_repos").upsert(
        {
          monitor_id: monitor.id,
          repo: input.repo,
          threshold: input.threshold,
        },
        { onConflict: "monitor_id,repo" },
      );
      if (error) throw error;
      track(
        "repo_followed",
        { monitor_id: monitor.id, repo: input.repo, threshold: input.threshold },
        userId,
      );
      return { ok: true };
    },
  );
}

export async function unfollowRepoForOwner(
  handle: unknown,
  repo: unknown,
): Promise<SettingsResult> {
  return changeSettings(
    z.object({ handle: handleSchema, repo: repoSchema }),
    { handle, repo },
    async (input, monitor) => {
      const { error } = await createAdminClient()
        .from("followed_repos")
        .delete()
        .eq("monitor_id", monitor.id)
        .eq("repo", input.repo);
      if (error) throw error;
      return { ok: true };
    },
  );
}

export async function portalForOwner(handle: unknown) {
  return changeSettings<{ handle: string }, { ok: true; url: string; monitorId: string }>(
    z.object({ handle: handleSchema }),
    { handle },
    async (_input, monitor) => {
      if (!monitor.stripe_customer_id) return { ok: false as const, error: errors.billing };
      return { ok: true as const, url: "/api/stripe/portal", monitorId: monitor.id };
    },
    true,
  );
}
