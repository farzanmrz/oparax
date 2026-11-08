import "server-only";

import { monitorContent } from "@/lib/monitor/content";
import { type Profile, profileOf, readSources } from "@/lib/monitor/read";
import { reportServerException } from "@/lib/observability/posthog-server";
import { ownedMonitor } from "@/lib/settings/sources";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

// The owner's Sources, Notifications and Account pages share one read: the ownership check through the owner's own
// session (RLS), then the agent's sources, accounts, repositories and failed deliveries, and the sources again in the
// feed's shape for the rail. Each list is null when its read failed.

export type SettingsSource = {
  id: string;
  kind: "rss" | "website";
  name: string;
  host: string;
  focus: string;
  why: string;
  noFilter: boolean;
  /** An unreadable or paused line, when the source has one. */
  note: string | null;
};
export type SettingsAccount = Pick<
  Tables<"monitor_accounts">,
  "handle" | "name" | "why" | "watched" | "posts_per_day" | "counts_checked_at"
>;
export type FollowedRepo = Pick<Tables<"followed_repos">, "repo" | "threshold" | "stars">;
export type SettingsData = {
  profile: Profile | null;
  sources: SettingsSource[] | null;
  accounts: SettingsAccount[] | null;
  repos: FollowedRepo[] | null;
  failedDeliveries: number | null;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** The owner's agent and everything its three pages show, or why it could not be shown. */
export async function readOwnerSettings(handle: string) {
  const owned = await ownedMonitor(handle);
  if (!owned.ok) return owned;
  const monitor = owned.monitor;
  const db = createAdminClient();
  const [sources, accounts, repos, deliveries, railSources] = await Promise.all([
    db
      .from("monitor_sources")
      .select("no_filter,why,sources(id,name,focus,kind,target,unreadable_streak,paused_at)")
      .eq("monitor_id", monitor.id)
      .is("removed_at", null)
      .order("created_at"),
    db
      .from("monitor_accounts")
      .select("handle,name,why,watched,posts_per_day,counts_checked_at")
      .eq("monitor_id", monitor.id)
      .order("created_at"),
    db
      .from("followed_repos")
      .select("repo,threshold,stars")
      .eq("monitor_id", monitor.id)
      .order("repo"),
    db
      .from("deliveries")
      .select("story_id", { count: "exact", head: true })
      .eq("monitor_id", monitor.id)
      .in("state", ["failed", "held"]),
    readSources(monitor),
  ]);
  for (const result of [sources, accounts, repos, deliveries]) {
    if (result.error)
      reportServerException(result.error, {
        tags: { area: "settings", stage: "read" },
        distinctId: owned.userId,
      });
  }

  const today = new Date().toISOString().slice(0, 10);
  const data: SettingsData = {
    profile: profileOf(monitor.profile),
    sources: sources.error
      ? null
      : (sources.data ?? []).flatMap(({ no_filter, why, sources: source }) =>
          source && (source.kind === "rss" || source.kind === "website")
            ? [
                {
                  id: source.id,
                  kind: source.kind,
                  name: source.name,
                  host: hostOf(source.target),
                  focus: source.focus,
                  why,
                  noFilter: no_filter,
                  note:
                    source.unreadable_streak > 0
                      ? monitorContent.unreadable(source.unreadable_streak)
                      : source.paused_at?.slice(0, 10) === today
                        ? monitorContent.sourcePaused
                        : null,
                },
              ]
            : [],
        ),
    accounts: accounts.error ? null : (accounts.data ?? []),
    repos: repos.error ? null : (repos.data ?? []),
    failedDeliveries: deliveries.error ? null : (deliveries.count ?? 0),
  };
  return {
    ok: true as const,
    monitor,
    userId: owned.userId,
    email: owned.email,
    data,
    railSources,
    agent: {
      handle: monitor.handle,
      display_handle: monitor.display_handle,
      profile: data.profile,
    },
  };
}
