import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { reportServerException } from "@/lib/observability/posthog-server";
import { settingsContent as copy } from "@/lib/settings/content";
import { ownedMonitor } from "@/lib/settings/sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";
import { SettingsFrame, SettingsView } from "./settings-view";

export const runtime = "nodejs";
export const maxDuration = 300;
export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
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
      <SettingsFrame>
        <Alert>
          <AlertDescription>{copy.errors.wrongAccount}</AlertDescription>
        </Alert>
      </SettingsFrame>
    );
  }

  const monitor = owned.monitor;
  const db = createAdminClient();
  const [sources, accounts, repos, deliveries] = await Promise.all([
    db
      .from("monitor_sources")
      .select("no_filter,sources(id,name,focus,kind)")
      .eq("monitor_id", monitor.id)
      .is("removed_at", null)
      .order("created_at"),
    db
      .from("monitor_accounts")
      .select("handle,name,watched,posts_per_day,counts_checked_at")
      .eq("monitor_id", monitor.id)
      .order("handle"),
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

  return (
    <SettingsFrame owner={{ email: owned.email, monitor }}>
      <SettingsView
        handle={handle}
        monitor={monitor}
        data={{
          sources: sources.error
            ? null
            : (sources.data ?? []).flatMap((row) =>
                row.sources && row.sources.kind !== "x_account"
                  ? [
                      {
                        id: row.sources.id,
                        name: row.sources.name,
                        focus: row.sources.focus,
                        noFilter: row.no_filter,
                      },
                    ]
                  : [],
              ),
          accounts: accounts.error ? null : (accounts.data ?? []),
          repos: repos.error ? null : (repos.data ?? []),
          failedDeliveries: deliveries.error ? null : (deliveries.count ?? 0),
        }}
      />
    </SettingsFrame>
  );
}
