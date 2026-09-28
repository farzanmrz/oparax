import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { checkBot } from "@/lib/guards/bot";
import { guards } from "@/lib/guards/guards";
import { BudgetRefused } from "@/lib/guards/ledger";
import { reportServerException } from "@/lib/observability/posthog-server";
import { lookupProfile } from "@/lib/onboarding/engine";
import { claimBuild, runBuild } from "@/lib/onboarding/run";
import { BuildStateSchema } from "@/lib/onboarding/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 800;

export async function POST(request: Request) {
  const json = request.headers.get("content-type")?.includes("application/json") ?? false;
  let validHandle: string | null = null;
  const fail = (error: string, status = 400) => {
    if (json) return Response.json({ error }, { status });
    const url = new URL("/", request.url);
    url.searchParams.set("error", error);
    if (validHandle) url.searchParams.set("handle", validHandle);
    return Response.redirect(url, 303);
  };
  const closed = () =>
    json
      ? Response.json({ closed: true })
      : Response.redirect(new URL("/?closed=1", request.url), 303);
  const open = (handle: string) =>
    json
      ? Response.json({ redirect: `/${handle}` })
      : Response.redirect(new URL(`/${handle}`, request.url), 303);
  let raw: unknown;
  try {
    raw = json ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return fail("handle");
  }
  const input = z.object({ handle: z.string(), beat: z.unknown().optional() }).safeParse(raw);
  validHandle = input.success ? normalizeValidHandle(input.data.handle) : null;
  if (!validHandle) return fail("handle");
  if (isReservedHandle(validHandle)) {
    track("build_refused", { reason: "reserved_handle" }, "server");
    return fail("handle");
  }
  const beat = z
    .string()
    .trim()
    .min(1)
    .max(300)
    .safeParse(input.success ? input.data.beat : undefined);
  if (!beat.success) return fail("beat");
  const handle = validHandle.toLowerCase();
  const db = createAdminClient();
  let monitorId: string | undefined;
  let duplicateHandle: string | null = null;
  let handedOff = false;
  try {
    if ((await checkBot(request)).isBot) {
      track("build_refused", { reason: "bot" }, "server");
      return fail(json ? "bot" : "lookup", 403);
    }
    const existing = await db.from("monitors").select("handle").eq("handle", handle).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      track("build_refused", { reason: "duplicate" }, "server");
      return open(existing.data.handle);
    }
    const guard = await guards();
    if (guard.killSwitch || !guard.anonBuildsOpen) {
      track("build_refused", { reason: guard.killSwitch ? "kill_switch" : "credits" }, "server");
      return closed();
    }
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    const inserted = await db
      .from("monitors")
      .upsert(
        {
          handle,
          display_handle: validHandle,
          beat: beat.data,
          status: "building",
          built_by: user?.id ?? null,
          build_started_at: new Date().toISOString(),
        },
        { onConflict: "handle", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (inserted.error) throw inserted.error;
    if (!inserted.data) return open(handle);
    monitorId = inserted.data.id;
    const reservation = await db.rpc("reserve_build", { p_monitor: monitorId, p_usd: 3 });
    if (reservation.error) throw reservation.error;
    if (!reservation.data) {
      const released = await db.rpc("release_build", { p_monitor: monitorId });
      if (released.error) throw released.error;
      monitorId = undefined;
      track("build_refused", { reason: "budget" }, "server");
      return closed();
    }
    const id = monitorId;
    const profile = await lookupProfile(handle, id, async (state) => {
      const checked = BuildStateSchema.parse(state);
      const { error } = await db
        .from("monitors")
        .update({
          build_state: checked,
          profile: checked.profile,
          x_user_id: checked.x_user_id,
          build_step: 1,
          build_log: [
            { step: 1, message: `Looking up @${handle} on X`, at: new Date().toISOString() },
          ],
        })
        .eq("id", id)
        .eq("status", "building")
        .is("build_lease_owner", null);
      if (error?.code === "23505" && checked.x_user_id) {
        const existing = await db
          .from("monitors")
          .select("handle")
          .eq("x_user_id", checked.x_user_id)
          .single();
        if (existing.error) throw existing.error;
        duplicateHandle = existing.data.handle;
      }
      if (error) throw error;
    });
    if (!profile) {
      const released = await db.rpc("release_build", { p_monitor: id });
      if (released.error) throw released.error;
      monitorId = undefined;
      return fail("notfound", 200);
    }
    const runId = crypto.randomUUID();
    handedOff = true;
    const claimed = await claimBuild(id, runId);
    if (claimed) {
      track("agent_build_started", {}, id);
      after(() => runBuild(id, runId));
    }
    return open(handle);
  } catch (error) {
    if (monitorId && !handedOff) {
      const released = await db.rpc("release_build", { p_monitor: monitorId });
      if (released.error)
        reportServerException(released.error, { tags: { area: "onboarding", stage: "release" } });
    }
    if (duplicateHandle) {
      track("build_refused", { reason: "duplicate" }, "server");
      return open(duplicateHandle);
    }
    reportServerException(error, { tags: { area: "onboarding", stage: "admission" } });
    if (error instanceof BudgetRefused) {
      track("build_refused", { reason: "budget" }, monitorId ?? "server");
      return closed();
    }
    return fail("lookup", 503);
  }
}
