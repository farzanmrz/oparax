import { notFound, redirect } from "next/navigation";
import { readMonitor, readViewer } from "@/lib/monitor/read";

// There is no Settings page (owner, Oct 10: Sources, Notifications and Account are the pages). The old address, which
// Stripe's checkout and portal still return to, leads the owner to Account and everyone else to the agent's page.
export default async function SettingsPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  const owner = viewer.userId !== null && viewer.userId === monitor.user_id;
  redirect(owner ? `/${monitor.handle}/account` : `/${monitor.handle}`);
}
