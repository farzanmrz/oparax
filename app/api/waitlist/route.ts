import { z } from "zod";
import { checkBot } from "@/lib/guards/bot";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 300;
const inputSchema = z.object({
  handle: z
    .string()
    .max(100)
    .transform(normalizeValidHandle)
    .refine((handle) => handle !== null && !isReservedHandle(handle)),
  beat: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !input.data.handle) {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  try {
    const bot = await checkBot(request);
    if (bot.isBot) return Response.json({ ok: false, error: "bot" }, { status: 403 });
  } catch {
    return Response.json({ ok: false, error: "bot" }, { status: 403 });
  }
  try {
    const { error } = await createAdminClient()
      .from("handle_waitlist")
      .upsert(
        {
          handle: input.data.handle.toLowerCase(),
          beat: input.data.beat || null,
        },
        { onConflict: "handle", ignoreDuplicates: true },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "waitlist" } });
    return Response.json({ ok: false, error: "save_failed" }, { status: 503 });
  }
}
