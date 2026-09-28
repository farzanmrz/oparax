import { randomInt } from "node:crypto";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { paidTierSchema, priceIdFor } from "@/lib/billing/prices";
import { getStripe } from "@/lib/billing/stripe";
import { monitorState } from "@/lib/monitor-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = z
    .object({ monitorId: z.uuid(), tier: paidTierSchema })
    .safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return new Response("Invalid checkout request.", { status: 400 });
  const { monitorId, tier } = parsed.data;
  const admin = createAdminClient();
  const { data: monitor, error } = await admin
    .from("monitors")
    .select("*")
    .eq("id", monitorId)
    .maybeSingle();
  if (error) return new Response("Checkout unavailable.", { status: 503 });
  if (!monitor) return new Response("Agent not found.", { status: 404 });
  const state = monitorState(monitor).state;
  if (state !== "frozen" && state !== "lapsed")
    return new Response("Checkout is available after the free week ends.", { status: 409 });
  if (monitor.user_id) {
    const scoped = await createClient();
    const { data: owned, error: ownerError } = await scoped
      .from("monitors")
      .select("id")
      .eq("id", monitorId)
      .maybeSingle();
    if (ownerError || !owned)
      return Response.redirect(new URL(`/login?next=/${monitor.handle}`, request.url), 303);
  }
  const stripe = getStripe();
  if (monitor.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(monitor.stripe_subscription_id);
    if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
      if (!monitor.user_id)
        return Response.redirect(new URL(`/login?next=/${monitor.handle}`, request.url), 303);
      if (!monitor.stripe_customer_id)
        return new Response("Billing is processing.", { status: 409 });
      const portal = await stripe.billingPortal.sessions.create({
        customer: monitor.stripe_customer_id,
        return_url: new URL(`/${monitor.handle}/settings`, request.url).toString(),
      });
      return Response.redirect(portal.url, 303);
    }
  }
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 30 * 60_000).toISOString();
  if (monitor.checkout_session_id === "pending") {
    if (
      !monitor.checkout_opened_at ||
      Date.parse(monitor.checkout_opened_at) >= Date.parse(stale)
    ) {
      return new Response("Checkout is already open for this agent.", { status: 409 });
    }
    // Recover a Stripe success whose id was lost before the database write.
    let recovered = false;
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: Math.floor(Date.parse(monitor.checkout_opened_at) / 1000) },
      limit: 100,
    })) {
      if (session.client_reference_id !== monitorId) continue;
      const { error } = await admin
        .from("monitors")
        .update({ checkout_session_id: session.id })
        .eq("id", monitorId)
        .eq("checkout_session_id", "pending")
        .eq("checkout_opened_at", monitor.checkout_opened_at);
      if (error) throw error;
      if (session.status === "open" && session.url) return Response.redirect(session.url, 303);
      if (session.status === "complete")
        return Response.redirect(
          new URL(`/checkout/return?session_id=${session.id}`, request.url),
          303,
        );
      recovered = true;
      break;
    }
    if (!recovered) {
      const { error } = await admin
        .from("monitors")
        .update({ checkout_session_id: null })
        .eq("id", monitorId)
        .eq("checkout_session_id", "pending")
        .eq("checkout_opened_at", monitor.checkout_opened_at);
      if (error) throw error;
    }
    return Response.redirect(new URL(`/${monitor.handle}`, request.url), 303);
  }
  let claim = admin
    .from("monitors")
    .update({ checkout_session_id: "pending", checkout_opened_at: now })
    .eq("id", monitorId)
    .or(`checkout_session_id.is.null,checkout_opened_at.lt.${stale}`);
  claim = monitor.checkout_session_id
    ? claim.eq("checkout_session_id", monitor.checkout_session_id)
    : claim.is("checkout_session_id", null);
  const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();
  if (claimError) return new Response("Checkout unavailable.", { status: 503 });
  if (!claimed) {
    const { data: current } = await admin
      .from("monitors")
      .select("checkout_session_id")
      .eq("id", monitorId)
      .single();
    if (current?.checkout_session_id && current.checkout_session_id !== "pending") {
      const existing = await stripe.checkout.sessions.retrieve(current.checkout_session_id);
      if (existing.status === "open" && existing.url) return Response.redirect(existing.url, 303);
    }
    return new Response("Checkout is already open for this agent.", { status: 409 });
  }
  if (monitor.checkout_session_id) {
    const previous = await stripe.checkout.sessions.retrieve(monitor.checkout_session_id);
    const previousSubscription =
      typeof previous.subscription === "string" ? previous.subscription : previous.subscription?.id;
    if (previous.status === "complete" && previousSubscription !== monitor.stripe_subscription_id) {
      await admin
        .from("monitors")
        .update({ checkout_session_id: previous.id })
        .eq("id", monitorId)
        .eq("checkout_opened_at", now);
      return Response.redirect(
        new URL(`/checkout/return?session_id=${previous.id}`, request.url),
        303,
      );
    }
    if (previous.status === "open") await stripe.checkout.sessions.expire(previous.id);
  }
  const metadata = { monitor_id: monitorId, tier, handle: monitor.handle };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: await priceIdFor(tier), quantity: 1 }],
      client_reference_id: monitorId,
      metadata,
      subscription_data: { metadata },
      ...(monitor.stripe_customer_id ? { customer: monitor.stripe_customer_id } : {}),
      success_url: `${new URL(request.url).origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: new URL(`/${monitor.handle}`, request.url).toString(),
      integration_identifier: `oparax_checkout_${Array.from({ length: 8 }, () => String.fromCharCode(97 + randomInt(26))).join("")}`,
    },
    { idempotencyKey: `${monitorId}:${now}` },
  );
  const { error: saveError } = await admin
    .from("monitors")
    .update({ checkout_session_id: session.id })
    .eq("id", monitorId)
    .eq("checkout_opened_at", now);
  if (saveError) throw saveError;
  if (!session.url) throw new Error("Checkout has no URL.");
  track("checkout_started", {}, monitorId);
  return Response.redirect(session.url, 303);
}
