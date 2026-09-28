import { randomInt } from "node:crypto";
import { z } from "zod";
import { guards } from "@/lib/guards/guards";
import { monitorContent as copy } from "@/lib/monitor/content";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { xGet } from "@/lib/x/client";
import { normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 300;
const inputSchema = z.object({ monitorId: z.uuid() });
const botSchema = z.object({ x_user_id: z.string().regex(/^\d+$/) });
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ ok: false }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const input = inputSchema.safeParse({ monitorId: form?.get("monitorId") });
  if (!input.success) return Response.json({ ok: false }, { status: 400 });
  let returnPath = "/";
  try {
    const db = createAdminClient();
    const { data: monitor, error } = await db
      .from("monitors")
      .select(
        "id,handle,status,build_finished_at,trial_started_at,last_viewed_at,paid_through,tier,pool_limit,pool_used,cadence,subscription_status,budget_exhausted_at,bot_state,bot_code,bot_code_expires_at",
      )
      .eq("id", input.data.monitorId)
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
    const now = new Date();
    let code = monitor.bot_code;
    if (
      !code ||
      !monitor.bot_code_expires_at ||
      Date.parse(monitor.bot_code_expires_at) <= now.getTime()
    ) {
      const candidate = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join(
        "",
      );
      const { data: issued, error: issueError } = await db
        .from("monitors")
        .update({
          bot_code: candidate,
          bot_code_expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
        })
        .eq("id", monitor.id)
        .in("bot_state", ["none", "stopped"])
        .or(
          `bot_code.is.null,bot_code_expires_at.is.null,bot_code_expires_at.lte.${now.toISOString()}`,
        )
        .select("bot_code")
        .maybeSingle();
      if (issueError) throw issueError;
      code = issued?.bot_code ?? null;
      if (!code) {
        // A simultaneous press keeps the winning code instead of invalidating its composer.
        const { data: winner, error: winnerError } = await db
          .from("monitors")
          .select("bot_code")
          .eq("id", monitor.id)
          .in("bot_state", ["none", "stopped"])
          .gt("bot_code_expires_at", now.toISOString())
          .maybeSingle();
        if (winnerError) throw winnerError;
        code = winner?.bot_code ?? null;
      }
    }
    if (!code) return Response.redirect(new URL(returnPath, request.url), 303);
    const composer = new URL("https://x.com/messages/compose");
    composer.searchParams.set("recipient_id", botId);
    composer.searchParams.set("text", code);
    return Response.redirect(composer, 303);
  } catch (error) {
    reportServerException(error, { tags: { area: "activation" } });
    return Response.redirect(new URL(`${returnPath}?error=activation`, request.url), 303);
  }
}
