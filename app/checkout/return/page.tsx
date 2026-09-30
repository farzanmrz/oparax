import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { authContent } from "@/lib/auth/content";
import { billingMetadata, stripeId } from "@/lib/billing/bind";
import { getStripe } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutReturn({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const scoped = await createClient();
  const {
    data: { user },
  } = await scoped.auth.getUser();
  if (!user) redirect("/login");

  const { data: monitor, error } = await scoped
    .from("monitors")
    .select("id,handle,checkout_session_id,stripe_subscription_id,paid_through")
    .eq("user_id", user.id)
    .maybeSingle();
  const params = await searchParams;
  const id = z
    .string()
    .regex(/^cs_[A-Za-z0-9_]+$/)
    .safeParse(params.session_id);
  let message: string = authContent.checkoutUnavailable;
  if (!error && monitor && id.success) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(id.data);
      const metadata = billingMetadata.safeParse(session.metadata);
      if (
        metadata.success &&
        metadata.data.user_id === user.id &&
        metadata.data.monitor_id === monitor.id &&
        session.client_reference_id === monitor.id
      ) {
        const subscriptionId = stripeId(session.subscription);
        if (session.payment_status !== "paid") message = authContent.checkoutUnpaid;
        else if (
          subscriptionId &&
          monitor.stripe_subscription_id === subscriptionId &&
          monitor.paid_through &&
          Date.parse(monitor.paid_through) > Date.now()
        )
          message = authContent.checkoutPaid;
        else if (monitor.checkout_session_id === session.id) message = authContent.checkoutPending;
      }
    } catch {
      message = authContent.checkoutUnavailable;
    }
  }

  return (
    <AuthShell title={authContent.checkoutTitle}>
      <div className="flex flex-col gap-4">
        <p role="status">{message}</p>
        {!error && monitor ? (
          <Button asChild variant="outline" className="min-h-11 w-full desk:min-h-7">
            <Link href={`/${monitor.handle}`}>{authContent.openAgent}</Link>
          </Button>
        ) : null}
        {id.success ? (
          <Button asChild variant="outline" className="min-h-11 w-full desk:min-h-7">
            <Link href={`/checkout/return?session_id=${id.data}`}>{authContent.checkAgain}</Link>
          </Button>
        ) : null}
      </div>
    </AuthShell>
  );
}
