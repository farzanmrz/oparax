import type { ReactNode } from "react";
import { column, OneShell, planOf, type ShellMonitor } from "@/components/one/shell";
import { AccountBlock } from "@/components/settings/account-block";
import {
  type FollowedRepo,
  type SettingsAccount,
  type SettingsSource,
  SourcesPanel,
} from "@/components/settings/sources-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { Profile } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { settingsContent as copy } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";

export type SettingsMonitor = ShellMonitor &
  Pick<
    Tables<"monitors">,
    | "id"
    | "display_handle"
    | "alert_hour"
    | "alert_timezone"
    | "bot_state"
    | "digest_github"
    | "digest_product_hunt"
    | "stripe_customer_id"
  >;
/** Each list is null when its read failed. */
export type SettingsData = {
  profile: Profile | null;
  sources: SettingsSource[] | null;
  accounts: SettingsAccount[] | null;
  repos: FollowedRepo[] | null;
  failedDeliveries: number | null;
};

const skip = { href: "#settings", label: copy.skip };

function Title() {
  return (
    <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
      {copy.title}
    </h1>
  );
}

/** Someone signed in to another account: the public header and the one line that says so. */
export function SettingsElsewhere({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn />
      <main id="settings" className="mx-auto w-[min(90%,1800px)] flex-1 space-y-6 py-8">
        <Title />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The owner's one Settings page (design preview v2/one/settings.tsx) inside the One shell: the sources as the main
 * body and, at the right, the account block (the person, the plan, alerts, digests, X DMs, Sign out).
 */
export function SettingsView({
  handle,
  email,
  monitor,
  data,
  notice,
}: {
  handle: string;
  email: string | null;
  monitor: SettingsMonitor;
  data: SettingsData;
  /** Shown above the page line; the development preview's banner. */
  notice?: ReactNode;
}) {
  const state = monitorState(monitor);
  const readOnly = state.state !== "paid";
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
  const timezone =
    monitor.alert_timezone && timezones.includes(monitor.alert_timezone)
      ? monitor.alert_timezone
      : "UTC";
  const plan = planOf(monitor);
  const subscribed = state.state === "paid" || state.state === "lapsed";

  return (
    <OneShell email={email} monitor={monitor} skip={skip}>
      <main
        id="settings"
        tabIndex={-1}
        className={`${column} relative flex-1 scroll-mt-20 pt-7 pb-24`}
      >
        {notice}
        <Title />
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SourcesPanel
            handle={handle}
            readOnly={readOnly}
            sources={data.sources}
            accounts={data.accounts}
            repos={data.repos}
            poolLeft={Math.max(0, monitor.pool_limit - monitor.pool_used)}
          />
          <AccountBlock
            handle={handle}
            monitorId={monitor.id}
            displayHandle={monitor.display_handle}
            email={email}
            profile={data.profile}
            plan={
              plan && {
                ...plan,
                paidThrough: monitor.paid_through,
                lapsed: state.state === "lapsed",
                subscribed,
                billing: subscribed && Boolean(monitor.stripe_customer_id),
              }
            }
            alerts={{ hour: monitor.alert_hour, timezone, timezones, cadence: state.cadence }}
            digests={{ github: monitor.digest_github, productHunt: monitor.digest_product_hunt }}
            botState={monitor.bot_state}
            open={state.state === "trial" || state.state === "paid"}
            failedDeliveries={data.failedDeliveries}
            readOnly={readOnly}
          />
        </div>
      </main>
    </OneShell>
  );
}
