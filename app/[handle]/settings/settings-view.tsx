import Link from "next/link";
import type { ReactNode } from "react";
import { column, OneShell, type ShellMonitor } from "@/components/one/shell";
import { AccountPicker, type EditableAccount } from "@/components/settings/account-picker";
import { AlertSettings } from "@/components/settings/alert-settings";
import { BillingCard } from "@/components/settings/billing-card";
import { DigestSwitches, type FollowedRepo } from "@/components/settings/digest-switches";
import { type EditableSource, SourceEditor } from "@/components/settings/source-editor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { monitorState } from "@/lib/monitor-state";
import { settingsContent as copy } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type SettingsMonitor = Pick<
  Tables<"monitors">,
  | "id"
  | "status"
  | "trial_started_at"
  | "paid_through"
  | "tier"
  | "pool_limit"
  | "pool_used"
  | "cadence"
  | "budget_exhausted_at"
  | "alert_hour"
  | "alert_timezone"
  | "bot_state"
  | "digest_github"
  | "digest_product_hunt"
  | "stripe_customer_id"
>;
/** Each list is null when its read failed. */
export type SettingsData = {
  sources: EditableSource[] | null;
  accounts: EditableAccount[] | null;
  repos: FollowedRepo[] | null;
  failedDeliveries: number | null;
};

/** The settings page frame: the One shell for the owner, the public site header otherwise. */
export function SettingsFrame({
  children,
  owner,
}: {
  children: ReactNode;
  owner?: { email: string | null; monitor: ShellMonitor };
}) {
  const skip = { href: "#settings", label: copy.skip };
  const body = (
    <main
      id="settings"
      tabIndex={-1}
      className={cn(
        "flex-1 scroll-mt-20 space-y-6",
        owner ? `${column} relative pt-7 pb-24` : "mx-auto w-[min(90%,1800px)] py-8",
      )}
    >
      <h1 className="font-heading text-3xl font-normal">{copy.title}</h1>
      {children}
    </main>
  );
  if (owner)
    return (
      <OneShell email={owner.email} monitor={owner.monitor} skip={skip}>
        {body}
      </OneShell>
    );
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href={skip.href}
        className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {skip.label}
      </a>
      <SiteHeader signedIn />
      {body}
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

/** The owner's settings tabs over data the page has already read. */
export function SettingsView({
  handle,
  monitor,
  data,
}: {
  handle: string;
  monitor: SettingsMonitor;
  data: SettingsData;
}) {
  const state = monitorState(monitor);
  const readOnly = state.state !== "paid";
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
  const timezone =
    monitor.alert_timezone && timezones.includes(monitor.alert_timezone)
      ? monitor.alert_timezone
      : "UTC";

  return (
    <>
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
          {data.sources ? (
            <SourceEditor handle={handle} sources={data.sources} readOnly={readOnly} />
          ) : (
            <LoadError />
          )}
        </TabsContent>
        <TabsContent value="accounts">
          {data.accounts ? (
            <AccountPicker
              handle={handle}
              accounts={data.accounts}
              used={monitor.pool_used}
              limit={monitor.pool_limit}
              readOnly={readOnly}
            />
          ) : (
            <LoadError />
          )}
        </TabsContent>
        <TabsContent value="alerts">
          {data.failedDeliveries === null && <LoadError />}
          <AlertSettings
            key={`${monitor.alert_hour}:${timezone}`}
            handle={handle}
            hour={monitor.alert_hour}
            timezone={timezone}
            timezones={timezones}
            cadence={state.cadence}
            botState={monitor.bot_state}
            failedDeliveries={data.failedDeliveries ?? 0}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="digests">
          {data.repos ? (
            <DigestSwitches
              handle={handle}
              github={monitor.digest_github}
              productHunt={monitor.digest_product_hunt}
              repos={data.repos}
              readOnly={readOnly}
            />
          ) : (
            <LoadError />
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
    </>
  );
}
