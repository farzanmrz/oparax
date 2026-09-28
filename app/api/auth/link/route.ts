import { z } from "zod";
import { authContent } from "@/lib/auth/content";
import { requestSigninLink } from "@/lib/auth/oauth";
import { bind } from "@/lib/billing/bind";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNextPath } from "@/lib/validation";

const inputSchema = z.union([
  z.object({ session_id: z.string().regex(/^cs_[A-Za-z0-9_]+$/) }),
  z.object({ email: z.email(), next: z.string().optional() }),
]);

export async function POST(request: Request) {
  const input = inputSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!input.success) return new Response(authContent.emailInvalid, { status: 400 });
  const origin = new URL(request.url).origin;
  if ("session_id" in input.data) {
    const session = await getStripe().checkout.sessions.retrieve(input.data.session_id);
    if (session.payment_status === "paid") {
      const warning = await bind(session, origin, true);
      const { error } = await createAdminClient()
        .from("stripe_events")
        .upsert({
          id: `signin-link:${session.id}`,
          type: "auth.signin_link",
          error: warning,
          processed_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
    return Response.redirect(
      new URL(`/checkout/return?session_id=${session.id}&resent=1`, origin),
      303,
    );
  }
  await requestSigninLink(input.data.email, input.data.next, origin);
  const target = new URL("/login", origin);
  target.searchParams.set("message", authContent.linkSent);
  const next = safeNextPath(input.data.next);
  if (next) target.searchParams.set("next", next);
  return Response.redirect(target, 303);
}
