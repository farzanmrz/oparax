import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotificationsPage } from "@/components/one/notifications-page";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readMonitor, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { Elsewhere, OwnerPage, readOwnerPage } from "../owner-page";

type Props = { params: Promise<{ handle: string }> };

export const runtime = "nodejs";
export const metadata: Metadata = {
  title: copy.notifications.title,
  robots: { index: false, follow: false },
};

// The owner's Notifications page (owner, Oct 10: locked): the Twitter DM connection. Everyone else is sent to the
// agent's page.
export default async function NotificationsRoute({ params }: Props) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  if (viewer.userId === null)
    redirect(`/login?next=${encodeURIComponent(`/${monitor.handle}/notifications`)}`);
  if (viewer.userId !== monitor.user_id) redirect(`/${monitor.handle}`);
  const { owned } = await readOwnerPage(monitor.handle, "notifications");
  if (!owned.ok) return <Elsewhere title={copy.notifications.title} />;
  const state = monitorState(owned.monitor);
  return (
    <OwnerPage owned={owned} title={copy.notifications.title}>
      <NotificationsPage
        monitorId={owned.monitor.id}
        displayHandle={owned.monitor.display_handle}
        botState={owned.monitor.bot_state}
        open={state.state === "trial" || state.state === "paid"}
        failedDeliveries={owned.data.failedDeliveries}
      />
    </OwnerPage>
  );
}
