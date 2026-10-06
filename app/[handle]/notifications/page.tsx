import { notFound, redirect } from "next/navigation";
import { readMonitor, readViewer } from "@/lib/monitor/read";

// Notifications now live on the one Settings page (X DMs in its account block); the old address leads there for the
// owner and to the agent's page for everyone else.
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  const owner = viewer.userId !== null && viewer.userId === monitor.user_id;
  redirect(owner ? `/${monitor.handle}/settings` : `/${monitor.handle}`);
}
