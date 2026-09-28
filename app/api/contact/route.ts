import { after } from "next/server";
import { z } from "zod";
import { contactSchema, deliverContact, saveContact } from "@/lib/contact/save";
import { reportServerException } from "@/lib/observability/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const input = contactSchema.safeParse(await request.json().catch(() => null));
  const requestId = z
    .uuid()
    .optional()
    .safeParse(request.headers.get("idempotency-key") ?? undefined);
  if (!input.success || !requestId.success) {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  try {
    const saved = await saveContact(input.data, requestId.data);
    if (!saved.ok) {
      return Response.json(saved, { status: saved.error === "rate_limit" ? 429 : 409 });
    }
    after(async () => {
      try {
        await deliverContact(saved.id);
      } catch (error) {
        reportServerException(error, { tags: { area: "contact", stage: "send" } });
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "contact", stage: "save" } });
    return Response.json({ ok: false, error: "save_failed" }, { status: 503 });
  }
}
