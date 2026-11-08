import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountPage } from "@/components/one/account-page";
import { PageLine } from "@/components/one/app-shell";
import { OneShell } from "@/components/one/shell";
import {
  previewAgent,
  previewEmail,
  previewHandle,
  previewMonitor,
  previewSettings,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent } from "@/lib/monitor/content";
import { monitorState } from "@/lib/monitor-state";
import { settingsContent } from "@/lib/settings/content";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The owner's Account page, two days into the free week.
export default function LocalPreviewAccountPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const monitor = previewMonitor();
  const state = monitorState(monitor);
  return (
    <OneShell email={previewEmail} agent={previewAgent} sources={previewSources}>
      <PreviewNotice />
      <PageLine title={monitorContent.menu.account} home={`/${previewHandle}`} />
      <AccountPage
        handle={previewHandle}
        monitorId={monitor.id}
        name={previewSettings.profile?.name ?? null}
        displayHandle={monitor.display_handle}
        email={previewEmail}
        plan={{
          name: settingsContent.billing.tiers.free,
          tier: monitor.tier,
          daysLeft: state.daysLeft,
          paidThrough: null,
          used: monitor.pool_used,
          limit: monitor.pool_limit,
          state: state.state,
          billing: false,
        }}
      />
    </OneShell>
  );
}
