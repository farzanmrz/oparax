import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { monitorContent } from "@/lib/monitor/content";
import { profileOf } from "@/lib/monitor/read";
import { reportServerException } from "@/lib/observability/posthog-server";
import { settingsContent as copy } from "@/lib/settings/content";
import { ownedMonitor } from "@/lib/settings/sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";
import { SettingsElsewhere, SettingsView } from "./settings-view";

export const runtime = "nodejs";
export const maxDuration = 300;
export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default async function SettingsPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = await params;
  const valid = normalizeValidHandle(rawHandle);
  if (!valid || isReservedHandle(valid)) notFound();
  const handle = valid.toLowerCase();
  const owned = await ownedMonitor(handle);
  if (!owned.ok) {
    if (owned.reason === "signedOut")
      redirect(`/login?next=${encodeURIComponent(`/${handle}/settings`)}`);
    return (
      <SettingsElsewhere>
        <Alert>
          <AlertDescription>{copy.errors.wrongAccount}</AlertDescription>
        </Alert>
      </SettingsElsewhere>
    );
  }

  const monitor = owned.monitor;
  const db = createAdminClient();
  const [sources, accounts, repos, deliveries] = await Promise.all([
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
  ]);
  for (const result of [sources, accounts, repos, deliveries]) {
    if (result.error)
      reportServerException(result.error, {
        tags: { area: "settings", stage: "read" },
        distinctId: owned.userId,
      });
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <SettingsView
      handle={handle}
      email={owned.email}
      monitor={monitor}
      data={{
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
      }}
    />
  );
}
