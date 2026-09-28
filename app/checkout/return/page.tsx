import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { authContent } from "@/lib/auth/content";
import { billingMetadata, stripeId } from "@/lib/billing/bind";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CheckoutReturn({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; resent?: string }>;
}) {
  const params = await searchParams;
  const id = z
    .string()
    .regex(/^cs_[A-Za-z0-9_]+$/)
    .safeParse(params.session_id);
  if (!id.success) redirect("/");
  const session = await getStripe().checkout.sessions.retrieve(id.data);
  const metadata = billingMetadata.safeParse(session.metadata);
  const admin = createAdminClient();
  const { data: monitor, error } = metadata.success
    ? await admin
        .from("monitors")
        .select("user_id,handle,stripe_subscription_id")
        .eq("id", metadata.data.monitor_id)
        .maybeSingle()
    : { data: null, error: null };
  if (error) throw error;
  const bound =
    monitor?.user_id && monitor.stripe_subscription_id === stripeId(session.subscription);
  const email = session.customer_details?.email ?? session.customer_email ?? "";
  const paid = session.payment_status === "paid";
  return (
    <AuthShell title={authContent.checkoutTitle}>
      <div className="space-y-4">
        <p role="status">
          {paid
            ? bound
              ? authContent.checkoutPaid(email)
              : authContent.checkoutPending(email)
            : authContent.checkoutUnpaid}
        </p>
        {params.resent && <p role="status">{authContent.linkSent}</p>}
        {paid && (
          <form action="/api/auth/link" method="post">
            <input type="hidden" name="session_id" value={session.id} />
            <Button className="min-h-11 w-full desk:min-h-7">{authContent.resend}</Button>
          </form>
        )}
        {bound && monitor && (
          <Button asChild variant="outline" className="min-h-11 w-full desk:min-h-7">
            <Link href={`/${monitor.handle}`}>{authContent.openAgent}</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="min-h-11 w-full desk:min-h-7">
          <Link href={`/checkout/return?session_id=${session.id}`}>{authContent.checkAgain}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
