import "server-only";

import type Stripe from "stripe";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { paidTierSchema, paidTiers } from "./prices";
import { getStripe } from "./stripe";

export const billingMetadata = z.object({
  monitor_id: z.uuid(),
  user_id: z.uuid(),
  tier: paidTierSchema,
});

export function stripeId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}

export function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) throw new Error("Subscription has no item.");
  return {
    start: new Date(item.current_period_start * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

export async function billingMonitor(monitorId: string): Promise<Tables<"monitors"> | null> {
  const { data, error } = await createAdminClient()
    .from("monitors")
    .select("*")
    .eq("id", monitorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function bind(session: Stripe.Checkout.Session): Promise<string | null> {
  if (session.payment_status !== "paid") return null;
  const parsed = billingMetadata.safeParse(session.metadata);
  if (!parsed.success) return "conflict";
  const metadata = parsed.data;
  const claim = await claimRun(`billing:${metadata.monitor_id}`, 120);
  if (!claim) throw new Error("Billing is already being processed.");
  try {
    const admin = createAdminClient();
    const monitor = await billingMonitor(metadata.monitor_id);
    if (!monitor) return "no monitor";
    if (monitor.checkout_session_id === "pending") throw new Error("Checkout storage is pending.");
    if (
      monitor.user_id !== metadata.user_id ||
      session.client_reference_id !== monitor.id ||
      monitor.checkout_session_id !== session.id
    )
      return "conflict";
    const invoiceId = stripeId(session.invoice);
    const subscriptionId = stripeId(session.subscription);
    const customerId = stripeId(session.customer);
    if (!invoiceId || !subscriptionId || !customerId)
      throw new Error("Checkout is missing billing references.");
    if (monitor.stripe_customer_id && monitor.stripe_customer_id !== customerId) return "conflict";
    if (monitor.stripe_subscription_id && monitor.stripe_subscription_id !== subscriptionId) {
      const previous = await getStripe().subscriptions.retrieve(monitor.stripe_subscription_id);
      if (previous.status !== "canceled" && previous.status !== "incomplete_expired")
        return "conflict";
    }
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const subscriptionMetadata = billingMetadata.safeParse(subscription.metadata);
    if (
      subscription.id !== subscriptionId ||
      stripeId(subscription.customer) !== customerId ||
      !subscriptionMetadata.success ||
      subscriptionMetadata.data.monitor_id !== monitor.id ||
      subscriptionMetadata.data.user_id !== monitor.user_id ||
      subscriptionMetadata.data.tier !== metadata.tier
    )
      return "conflict";
    if (monitor.last_invoice_id === invoiceId) return null;

    const period = subscriptionPeriod(subscription);
    if (!monitor.paid_through || Date.parse(period.end) > Date.parse(monitor.paid_through)) {
      const { data: updated, error } = await admin
        .from("monitors")
        .update({
          tier: metadata.tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          paid_through: period.end,
          last_invoice_id: invoiceId,
          pool_limit: paidTiers[metadata.tier].pool,
          pool_used: 0,
          pool_period_start: new Date().toISOString(),
          cadence: paidTiers[metadata.tier].cadence,
          status: "live",
        })
        .eq("id", monitor.id)
        .eq("user_id", metadata.user_id)
        .eq("checkout_session_id", session.id)
        .select("id")
        .maybeSingle();
      if (error?.code === "23505") return "conflict";
      if (error) throw error;
      if (!updated) return "conflict";
      track("payment_succeeded", {}, monitor.id);
    }
    return null;
  } finally {
    await claim.release();
  }
}
