import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccountPicker } from "@/components/settings/account-picker";
import { AlertSettings } from "@/components/settings/alert-settings";
import { BillingCard } from "@/components/settings/billing-card";
import { DigestSwitches } from "@/components/settings/digest-switches";
import { SourceEditor } from "@/components/settings/source-editor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { settingsContent as copy } from "@/lib/settings/content";
import { ownedMonitor } from "@/lib/settings/sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const runtime = "nodejs";
export const maxDuration = 300;
export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

function SettingsFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#settings"
        className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.skip}
      </a>
      <SiteHeader signedIn />
      <main
        id="settings"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1356px] flex-1 scroll-mt-20 space-y-6 px-4 py-8"
      >
        <h1 className="font-heading text-3xl font-normal">{copy.title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadError() {
  return (
    <Alert variant="destructive">
      <AlertDescription>{copy.loadError}</AlertDescription>
    </Alert>
  );
}

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
  const state = monitorState(monitor);
  const readOnly = state.state !== "paid";
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
  const editableSources = (sources.data ?? []).flatMap((row) =>
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
  );
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
  const timezone =
    monitor.alert_timezone && timezones.includes(monitor.alert_timezone)
      ? monitor.alert_timezone
      : "UTC";

  return (
    <SettingsFrame>
      <Button asChild variant="outline" className="min-h-11 desk:min-h-7">
        <Link href={`/${handle}`}>{copy.back}</Link>
      </Button>
      {readOnly && (
        <Alert>
          <AlertDescription>{copy.errors.readOnly}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue={state.state === "lapsed" ? "billing" : "sources"} className="gap-4">
        <div className="overflow-x-auto p-1">
          <TabsList aria-label={copy.tabsLabel} className="min-h-12 desk:min-h-8">
            {copy.tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 px-3 desk:min-h-7">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="sources">
          {sources.error ? (
            <LoadError />
          ) : (
            <SourceEditor handle={handle} sources={editableSources} readOnly={readOnly} />
          )}
        </TabsContent>
        <TabsContent value="accounts">
          {accounts.error ? (
            <LoadError />
          ) : (
            <AccountPicker
              handle={handle}
              accounts={accounts.data ?? []}
              used={monitor.pool_used}
              limit={monitor.pool_limit}
              readOnly={readOnly}
            />
          )}
        </TabsContent>
        <TabsContent value="alerts">
          {deliveries.error && <LoadError />}
          <AlertSettings
            key={`${monitor.alert_hour}:${timezone}`}
            handle={handle}
            hour={monitor.alert_hour}
            timezone={timezone}
            timezones={timezones}
            cadence={state.cadence}
            botState={monitor.bot_state}
            failedDeliveries={deliveries.count ?? 0}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="digests">
          {repos.error ? (
            <LoadError />
          ) : (
            <DigestSwitches
              handle={handle}
              github={monitor.digest_github}
              productHunt={monitor.digest_product_hunt}
              repos={repos.data ?? []}
              readOnly={readOnly}
            />
          )}
        </TabsContent>
        <TabsContent value="billing">
          <BillingCard
            handle={handle}
            monitorId={monitor.id}
            tier={monitor.tier}
            paidThrough={monitor.paid_through}
            lapsed={state.state === "lapsed"}
            available={
              (state.state === "paid" || state.state === "lapsed") &&
              Boolean(monitor.stripe_customer_id)
            }
          />
        </TabsContent>
      </Tabs>
    </SettingsFrame>
  );
}
