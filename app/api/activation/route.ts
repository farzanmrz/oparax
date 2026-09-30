import { z } from "zod";
import { guards } from "@/lib/guards/guards";
import { monitorContent as copy } from "@/lib/monitor/content";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { xGet } from "@/lib/x/client";
import { normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 300;
const inputSchema = z.object({ monitorId: z.uuid() });
const botSchema = z.object({ x_user_id: z.string().regex(/^\d+$/) });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ ok: false }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const input = inputSchema.safeParse({ monitorId: form?.get("monitorId") });
  if (!input.success) return Response.json({ ok: false }, { status: 400 });
  const scoped = await createClient();
  const {
    data: { user },
  } = await scoped.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  let returnPath = "/";
  try {
    const { data: monitor, error } = await scoped
      .from("monitors")
      .select("*")
      .eq("id", input.data.monitorId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!monitor) return Response.json({ ok: false }, { status: 404 });
    const handle = normalizeValidHandle(monitor.handle);
    if (!handle) return Response.json({ ok: false }, { status: 404 });
    returnPath = `/${handle}`;
    const { state } = monitorState(monitor);
    if (state !== "trial" && state !== "paid")
      return new Response(copy.activationUnavailable, { status: 409 });
    if (monitor.bot_state === "active" || monitor.bot_state === "paused")
      return Response.redirect(new URL(returnPath, request.url), 303);
    const db = createAdminClient();
    const { data: config, error: configError } = await db
      .from("config")
      .select("value")
      .eq("key", "bot")
      .maybeSingle();
    if (configError) throw configError;
    let botId = botSchema.safeParse(config?.value).data?.x_user_id;
    if (!botId) {
      const admission = await guards();
      if (admission.killSwitch) throw new Error("Bot lookup unavailable");
      const response = await xGet(
        "users/me",
        {},
        { token: "bot", funding: { monitorId: monitor.id }, maxPosts: 0 },
      );
      if (response.status !== 200 || response.uncertain) throw new Error("Bot lookup failed");
      const identity = z
        .object({ data: z.object({ id: z.string().regex(/^\d+$/), username: z.string() }) })
        .parse(response.body).data;
      const { error: saveError } = await db.from("config").upsert({
        key: "bot",
        value: { x_user_id: identity.id, handle: identity.username },
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      botId = identity.id;
    }
    const composer = `https://x.com/messages/compose?recipient_id=${encodeURIComponent(botId)}&text=${encodeURIComponent("Start alerts")}`;
    return Response.redirect(composer, 303);
  } catch (error) {
    reportServerException(error, { tags: { area: "activation" } });
    return Response.redirect(new URL(`${returnPath}?error=activation`, request.url), 303);
  }
}
