import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLine } from "@/components/one/app-shell";
import { NotificationsPage } from "@/components/one/notifications-page";
import { OneShell } from "@/components/one/shell";
import {
  previewAgent,
  previewEmail,
  previewHandle,
  previewMonitor,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent } from "@/lib/monitor/content";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The owner's Notifications page: ?dm=active|paused|stopped picks the connection state; not connected is the default.
export default async function LocalPreviewNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ dm?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { dm } = await searchParams;
  const monitor = previewMonitor();
  return (
    <OneShell email={previewEmail} agent={previewAgent} sources={previewSources}>
      <PreviewNotice />
      <PageLine title={monitorContent.notifications.title} home={`/${previewHandle}`} />
      <NotificationsPage
        monitorId={monitor.id}
        displayHandle={monitor.display_handle}
        botState={typeof dm === "string" ? dm : monitor.bot_state}
        open
        failedDeliveries={0}
      />
    </OneShell>
  );
}
