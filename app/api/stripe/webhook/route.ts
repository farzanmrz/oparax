import type Stripe from "stripe";
import { applyEvent } from "@/lib/billing/apply-event";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook unavailable.", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Invalid signature.", { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const lease = new Date(Date.now() + 120_000).toISOString();
  const { error: insertError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, processing_until: lease });
  if (insertError) {
    if (insertError.code !== "23505")
      return new Response("Event storage unavailable.", { status: 500 });
    const { data, error } = await admin
      .from("stripe_events")
      .select("processed_at")
      .eq("id", event.id)
      .single();
    if (error) return new Response("Event storage unavailable.", { status: 500 });
    if (data.processed_at) return new Response("OK");
    const { data: claimed, error: claimError } = await admin
      .from("stripe_events")
      .update({ processing_until: lease, error: null })
      .eq("id", event.id)
      .is("processed_at", null)
      .or(`processing_until.is.null,processing_until.lt.${now}`)
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) return new Response("Event is processing.", { status: 500 });
  }
  try {
    const warning = await applyEvent(event, new URL(request.url).origin);
    const { error } = await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString(), processing_until: null, error: warning })
      .eq("id", event.id)
      .eq("processing_until", lease);
    if (error) throw error;
    return new Response("OK");
  } catch (error) {
    await admin
      .from("stripe_events")
      .update({
        error: error instanceof Error ? error.message : "Payment processing failed.",
        processing_until: null,
      })
      .eq("id", event.id)
      .eq("processing_until", lease);
    return new Response("Payment processing failed.", { status: 500 });
  }
}
