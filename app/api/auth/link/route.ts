import { z } from "zod";
import { authContent } from "@/lib/auth/content";
import { requestSigninLink } from "@/lib/auth/oauth";
import { safeAuthDestination } from "@/lib/validation";

const inputSchema = z.object({ email: z.email(), next: z.string().optional() });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!input.success) return new Response(authContent.emailInvalid, { status: 400 });
  const origin = new URL(request.url).origin;
  await requestSigninLink(input.data.email, input.data.next, origin);
  const target = new URL("/login", origin);
  target.searchParams.set("message", authContent.linkSent);
  const next = safeAuthDestination(input.data.next);
  if (next) target.searchParams.set("next", next);
  return Response.redirect(target, 303);
}
