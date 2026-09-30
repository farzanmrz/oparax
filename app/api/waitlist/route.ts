import { z } from "zod";
import { readAuthContext } from "@/lib/auth/identity";
import { checkBot } from "@/lib/guards/bot";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 300;
const inputSchema = z.object({
  handle: z.unknown().optional(),
  beat: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    const { user, xIdentity } = await readAuthContext();
    if (!user) return Response.json({ ok: false, error: "signed_out" }, { status: 401 });
    if (xIdentity.status === "invalid")
      return Response.json({ ok: false, error: "x_identity_invalid" }, { status: 403 });
    const input = inputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success)
      return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
    const displayHandle =
      xIdentity.status === "ok"
        ? xIdentity.handle
        : typeof input.data.handle === "string"
          ? normalizeValidHandle(input.data.handle)
          : null;
    if (!displayHandle || isReservedHandle(displayHandle))
      return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
    try {
      if ((await checkBot(request)).isBot)
        return Response.json({ ok: false, error: "bot" }, { status: 403 });
    } catch {
      return Response.json({ ok: false, error: "bot" }, { status: 403 });
    }
    const { error } = await createAdminClient()
      .from("handle_waitlist")
      .upsert(
        {
          user_id: user.id,
          handle: displayHandle.toLowerCase(),
          beat: input.data.beat || null,
          handle_source: xIdentity.status === "ok" ? "x_identity" : "typed",
        },
        { onConflict: "user_id,handle", ignoreDuplicates: true },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "waitlist" } });
    return Response.json({ ok: false, error: "save_failed" }, { status: 503 });
  }
}
