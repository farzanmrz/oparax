import "server-only";

import type Stripe from "stripe";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingMetadata, billingMonitor, bind, stripeId, subscriptionPeriod } from "./bind";
import { paidTierSchema, paidTiers } from "./prices";
import { getStripe } from "./stripe";

export async function applyEvent(event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return bind(event.data.object);
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const parsed = billingMetadata.safeParse(session.metadata);
      if (!parsed.success) return "conflict";
      const metadata = parsed.data;
      const monitor = await billingMonitor(metadata.monitor_id);
      if (!monitor) return "no monitor";
      if (monitor.checkout_session_id === "pending")
        throw new Error("Checkout storage is pending.");
      if (
        monitor.user_id !== metadata.user_id ||
        session.client_reference_id !== monitor.id ||
        monitor.checkout_session_id !== session.id
      )
        return "conflict";
      const { error } = await createAdminClient()
        .from("monitors")
        .update({ checkout_session_id: null })
        .eq("id", monitor.id)
        .eq("checkout_session_id", session.id);
      if (error) throw error;
      return null;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      break;
    default:
      return null;
  }

  const invoice =
    event.type === "invoice.paid" || event.type === "invoice.payment_failed"
      ? event.data.object
      : null;
  const subscriptionId = invoice
    ? stripeId(invoice.parent?.subscription_details?.subscription ?? null)
    : event.data.object.id;
  if (!subscriptionId) return "no monitor";
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const admin = createAdminClient();
  const { data: linked, error: findError } = await admin
    .from("monitors")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (findError) throw findError;
  const metadata = billingMetadata.safeParse(subscription.metadata);
  if (!metadata.success) return "conflict";
  const found = linked ?? (await billingMonitor(metadata.data.monitor_id));
  if (!found) return "no monitor";
  const claim = await claimRun(`billing:${found.id}`, 120);
  if (!claim) throw new Error("Billing is already being processed.");
  try {
    const monitor = await billingMonitor(found.id);
    if (!monitor) return "no monitor";
    if (metadata.data.monitor_id !== monitor.id || metadata.data.user_id !== monitor.user_id)
      return "conflict";
    // The checkout event must bind the first payment before renewals can mutate access.
    if (!monitor.stripe_subscription_id) throw new Error("Checkout binding is pending.");
    if (
      monitor.stripe_subscription_id !== subscriptionId ||
      metadata.data.tier !== monitor.tier ||
      stripeId(subscription.customer) !== monitor.stripe_customer_id ||
      (invoice && stripeId(invoice.customer) !== monitor.stripe_customer_id)
    )
      return "conflict";
    if (event.type === "invoice.paid" && invoice) {
      if (monitor.last_invoice_id === invoice.id) return null;
      const period = subscriptionPeriod(subscription);
      // Only the subscription's latest invoice can extend the current billing period.
      if (stripeId(subscription.latest_invoice) !== invoice.id) return null;
      if (monitor.paid_through && Date.parse(period.end) <= Date.parse(monitor.paid_through))
        return null;
      const tier = paidTierSchema.parse(monitor.tier);
      const { error } = await admin
        .from("monitors")
        .update({
          paid_through: period.end,
          subscription_status: "active",
          pool_used: 0,
          pool_period_start: new Date().toISOString(),
          pool_limit: paidTiers[tier].pool,
          last_invoice_id: invoice.id,
          status: "live",
        })
        .eq("id", monitor.id);
      if (error) throw error;
      track("payment_succeeded", {}, monitor.id);
    } else if (event.type === "invoice.payment_failed" && invoice) {
      if (
        monitor.last_invoice_id === invoice.id ||
        stripeId(subscription.latest_invoice) !== invoice.id
      )
        return null;
      const { error } = await admin
        .from("monitors")
        .update({ subscription_status: "past_due" })
        .eq("id", monitor.id);
      if (error) throw error;
      if (monitor.subscription_status !== "past_due") track("payment_failed", {}, monitor.id);
    } else {
      const { error } = await admin
        .from("monitors")
        .update({
          subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq("id", monitor.id);
      if (error) throw error;
      if (subscription.status === "canceled" && monitor.subscription_status !== "canceled") {
        track("subscription_cancelled", {}, monitor.id);
      }
    }
    return null;
  } finally {
    await claim.release();
  }
}
