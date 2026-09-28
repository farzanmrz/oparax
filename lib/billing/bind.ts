import "server-only";

import { createClient as createAuthClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";
import { paidTierSchema, paidTiers } from "./prices";
import { getStripe } from "./stripe";

export const billingMetadata = z.object({ monitor_id: z.uuid(), tier: paidTierSchema });
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

export async function bind(
  session: Stripe.Checkout.Session,
  origin: string,
  resend = false,
): Promise<string | null> {
  if (session.payment_status !== "paid") return null;
  const metadata = billingMetadata.parse(session.metadata);
  const claim = await claimRun(`billing:${metadata.monitor_id}`, 120);
  if (!claim) throw new Error("Billing is already being processed.");
  try {
    const admin = createAdminClient();
    const monitor = await billingMonitor(metadata.monitor_id);
    if (!monitor) return "no monitor";
    const invoiceId = stripeId(session.invoice);
    const subscriptionId = stripeId(session.subscription);
    const customerId = stripeId(session.customer);
    const email = z.email().parse(session.customer_details?.email ?? session.customer_email);
    if (!invoiceId || !subscriptionId || !customerId)
      throw new Error("Checkout is missing billing references.");
    if (monitor.stripe_subscription_id && monitor.stripe_subscription_id !== subscriptionId) {
      const previous = await getStripe().subscriptions.retrieve(monitor.stripe_subscription_id);
      if (previous.status !== "canceled" && previous.status !== "incomplete_expired")
        return "conflict";
    }
    if (monitor.checkout_session_id === "pending") throw new Error("Checkout storage is pending.");
    if (monitor.checkout_session_id !== session.id) return "conflict";
    if (monitor.last_invoice_id === invoiceId && monitor.user_id && !resend) return null;

    const { data: existingUser, error: lookupError } = await admin.rpc("user_id_by_email", {
      p_email: email,
    });
    if (lookupError) throw lookupError;
    if (monitor.user_id && monitor.user_id !== existingUser) return "conflict";
    if (existingUser) {
      const { data: other, error } = await admin
        .from("monitors")
        .select("id")
        .eq("user_id", existingUser)
        .neq("id", monitor.id)
        .maybeSingle();
      if (error) throw error;
      if (other) return "conflict";
    }

    if (!resend || monitor.stripe_subscription_id === null) {
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const period = subscriptionPeriod(subscription);
      if (
        monitor.last_invoice_id !== invoiceId &&
        (!monitor.paid_through || Date.parse(period.end) > Date.parse(monitor.paid_through))
      ) {
        const { error } = await admin
          .from("monitors")
          .update({
            ...(existingUser ? { user_id: existingUser } : {}),
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
          .eq("id", monitor.id);
        if (error?.code === "23505") return "conflict";
        if (error) throw error;
        track("payment_succeeded", {}, monitor.id);
      }
    }

    // A webhook has no payer browser in which to keep a PKCE verifier.
    // Token-hash email links prove the mailbox without a browser-bound verifier.
    const { url, key } = supabaseEnv();
    const auth = createAuthClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const redirectTo = new URL("/auth/confirm", origin);
    redirectTo.searchParams.set("next", `/${monitor.handle}`);
    const { error: mailError } = await auth.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo.toString() },
    });
    const { data: userId, error: userError } = await admin.rpc("user_id_by_email", {
      p_email: email,
    });
    if (userError) throw userError;
    if (userId) {
      const { error } = await admin
        .from("monitors")
        .update({ user_id: userId })
        .eq("id", monitor.id)
        .or(`user_id.is.null,user_id.eq.${userId}`);
      if (error?.code === "23505") return "conflict";
      if (error) throw error;
    }
    if (mailError) return `signin link: ${mailError.message}`;
    if (!userId) return "signin link: account not available";
    track("signin_link_sent", {}, monitor.id);
    return null;
  } finally {
    await claim.release();
  }
}
