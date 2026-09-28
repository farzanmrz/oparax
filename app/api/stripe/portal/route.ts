import { z } from "zod";
import { getStripe } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const input = z
    .object({ monitorId: z.uuid() })
    .safeParse(Object.fromEntries(await request.formData()));
  if (!input.success) return new Response("Invalid request.", { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const { data: monitor, error } = await supabase
    .from("monitors")
    .select("handle,stripe_customer_id")
    .eq("id", input.data.monitorId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return new Response("Billing unavailable.", { status: 503 });
  if (!monitor?.stripe_customer_id) return new Response("Billing unavailable.", { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: monitor.stripe_customer_id,
    return_url: new URL(`/${monitor.handle}/settings`, request.url).toString(),
  });
  return Response.redirect(session.url, 303);
}
