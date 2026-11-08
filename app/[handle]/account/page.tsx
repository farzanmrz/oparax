import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountPage } from "@/components/one/account-page";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readMonitor, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { settingsContent } from "@/lib/settings/content";
import { Elsewhere, OwnerPage, readOwnerPage } from "../owner-page";

type Props = { params: Promise<{ handle: string }> };

export const runtime = "nodejs";
export const metadata: Metadata = {
  title: copy.menu.account,
  robots: { index: false, follow: false },
};

const tierNames = new Map<string, string>(Object.entries(settingsContent.billing.tiers));

// The owner's Account page (owner, Oct 10): the account block and the plan block. Everyone else is sent to the
// agent's page.
export default async function AccountRoute({ params }: Props) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  if (viewer.userId === null)
    redirect(`/login?next=${encodeURIComponent(`/${monitor.handle}/account`)}`);
  if (viewer.userId !== monitor.user_id) redirect(`/${monitor.handle}`);
  const { owned } = await readOwnerPage(monitor.handle, "account");
  if (!owned.ok) return <Elsewhere title={copy.menu.account} />;
  const m = owned.monitor;
  const state = monitorState(m);
  return (
    <OwnerPage owned={owned} title={copy.menu.account}>
      <AccountPage
        handle={m.handle}
        monitorId={m.id}
        name={owned.data.profile?.name ?? null}
        displayHandle={m.display_handle}
        email={owned.email}
        plan={{
          name: tierNames.get(m.tier) ?? settingsContent.billing.unknownTier,
          tier: m.tier,
          // The free week's countdown shows only while it runs.
          daysLeft: m.tier === "free" && state.state === "trial" ? state.daysLeft : null,
          paidThrough: m.paid_through,
          used: m.pool_used,
          limit: m.pool_limit,
          state: state.state,
          billing:
            (state.state === "paid" || state.state === "lapsed") && Boolean(m.stripe_customer_id),
        }}
      />
    </OwnerPage>
  );
}
