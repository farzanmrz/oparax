import { after } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { readAuthContext } from "@/lib/auth/identity";
import { checkBot } from "@/lib/guards/bot";
import { guards } from "@/lib/guards/guards";
import { BudgetRefused } from "@/lib/guards/ledger";
import { reportServerException } from "@/lib/observability/posthog-server";
import { lookupProfile } from "@/lib/onboarding/engine";
import { runBuild } from "@/lib/onboarding/run";
import { BuildStateSchema } from "@/lib/onboarding/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const maxDuration = 800;

type BuildError =
  | "signed_out"
  | "invalid_request"
  | "handle_required"
  | "invalid_handle"
  | "reserved_handle"
  | "beat_required"
  | "beat_too_long"
  | "bot"
  | "x_identity_invalid"
  | "builds_unavailable"
  | "profile_not_found"
  | "profile_unavailable"
  | "identity_mismatch"
  | "ownership_conflict"
  | "handle_conflict"
  | "build_unavailable";

type RefusalReason =
  | Exclude<BuildError, "builds_unavailable">
  | "budget"
  | "kill_switch"
  | "credits";

class IdentityCheckFailed extends Error {
  constructor(readonly outcome: string) {
    super(outcome);
  }
}

const bodySchema = z.object({ beat: z.unknown().optional(), handle: z.unknown().optional() });

export async function POST(request: Request) {
  const json = request.headers.get("content-type")?.includes("application/json") ?? false;
  let userId = "server";
  const refuse = (error: BuildError, status: number, reason?: RefusalReason) => {
    const eventReason = reason ?? (error === "builds_unavailable" ? "budget" : error);
    track("build_refused", { reason: eventReason }, userId);
    if (json) return Response.json({ ok: false, error }, { status });
    const url = new URL("/onboarding", request.url);
    url.searchParams.set("error", error);
    return Response.redirect(url, 303);
  };
  const open = (handle: string) =>
    json
      ? Response.json({ ok: true, redirect: `/${handle}` })
      : Response.redirect(new URL(`/${handle}`, request.url), 303);

  try {
    const context = await readAuthContext();
    if (!context.user) return refuse("signed_out", 401);
    userId = context.user.id;
    if (context.monitor) return open(context.monitor.handle);
    if (context.xIdentity.status === "invalid") {
      reportServerException(new Error(context.xIdentity.reason), {
        tags: { area: "auth", stage: "identity_parse" },
      });
      return refuse("x_identity_invalid", 403);
    }

    let raw: unknown;
    try {
      raw = json ? await request.json() : Object.fromEntries(await request.formData());
    } catch {
      return refuse("invalid_request", 400);
    }
    const input = bodySchema.safeParse(raw);
    if (!input.success) return refuse("invalid_request", 400);

    const identity = context.xIdentity;
    let displayHandle: string;
    let handle: string;
    if (identity.status === "ok") {
      displayHandle = identity.displayHandle;
      handle = identity.handle.toLowerCase();
    } else {
      if (typeof input.data.handle !== "string" || !input.data.handle.trim())
        return refuse("handle_required", 400);
      const normalized = normalizeValidHandle(input.data.handle);
      if (!normalized) return refuse("invalid_handle", 400);
      displayHandle = normalized;
      handle = normalized.toLowerCase();
    }
    if (isReservedHandle(handle)) return refuse("reserved_handle", 409);
    if (typeof input.data.beat !== "string" || !input.data.beat.trim())
      return refuse("beat_required", 400);
    const beat = input.data.beat.trim();
    if (beat.length > 300) return refuse("beat_too_long", 400);
    try {
      if ((await checkBot(request)).isBot) return refuse("bot", 403);
    } catch {
      return refuse("bot", 403);
    }
    const guard = await guards();
    if (guard.killSwitch || !guard.buildsOpen)
      return refuse("builds_unavailable", 503, guard.killSwitch ? "kill_switch" : "credits");

    const db = createAdminClient();
    const runId = crypto.randomUUID();
    const requestedZone = request.headers.get("x-vercel-ip-timezone");
    const timezone =
      requestedZone && Intl.supportedValuesOf("timeZone").includes(requestedZone)
        ? requestedZone
        : "UTC";
    const admission = await db.rpc("admit_build", {
      p_user_id: context.user.id,
      p_handle: handle,
      p_display_handle: displayHandle,
      p_beat: beat,
      p_alert_timezone: timezone,
      p_run_id: runId,
      p_lease_seconds: 600,
      ...(identity.status === "ok" ? { p_x_user_id: identity.xUserId } : {}),
    });
    if (admission.error) throw admission.error;
    const admitted = admission.data[0];
    if (!admitted) throw new Error("Admission returned no outcome");
    if (admitted.outcome === "existing" && admitted.handle) return open(admitted.handle);
    if (admitted.outcome === "closed") return refuse("builds_unavailable", 503, "budget");
    if (admitted.outcome === "ownership_conflict") return refuse("ownership_conflict", 409);
    if (admitted.outcome === "handle_conflict") return refuse("handle_conflict", 409);
    if (admitted.outcome !== "admitted" || !admitted.monitor_id)
      throw new Error("Admission returned an invalid outcome");

    const monitorId = admitted.monitor_id;
    const cleanup = async (code: BuildError, status: number, reason?: RefusalReason) => {
      const refusalReason = reason ?? (code === "builds_unavailable" ? "budget" : code);
      const openAfterRefusal = (pageHandle: string) => {
        track("build_refused", { reason: refusalReason }, userId);
        return open(pageHandle);
      };
      let released = false;
      try {
        const result = await db.rpc("release_build", { p_monitor: monitorId, p_run_id: runId });
        if (result.error) throw result.error;
        released = result.data;
      } catch (error) {
        reportServerException(error, { tags: { area: "onboarding", stage: "release" } });
      }
      if (released) return refuse(code, status, reason);
      const session = await createClient();
      const owned = await session
        .from("monitors")
        .select("id,handle,status,build_lease_owner")
        .eq("user_id", userId)
        .maybeSingle();
      if (owned.error) {
        reportServerException(owned.error, { tags: { area: "onboarding", stage: "release_read" } });
        return refuse("build_unavailable", 503);
      }
      if (!owned.data) return refuse(code, status, reason);
      if (
        owned.data.id === monitorId &&
        owned.data.status === "building" &&
        owned.data.build_lease_owner === runId
      ) {
        const failed = await db
          .from("monitors")
          .update({ status: "failed", build_error: `0: ${code}` })
          .eq("id", monitorId)
          .eq("status", "building")
          .eq("build_lease_owner", runId)
          .gt("build_lease_until", new Date().toISOString())
          .select("id");
        if (failed.error) {
          reportServerException(failed.error, {
            tags: { area: "onboarding", stage: "release_failure_write" },
          });
          return refuse("build_unavailable", 503);
        }
        if (!failed.data.length) {
          const again = await session
            .from("monitors")
            .select("handle")
            .eq("user_id", userId)
            .maybeSingle();
          if (again.error) return refuse("build_unavailable", 503);
          if (!again.data) return refuse(code, status, reason);
          return openAfterRefusal(again.data.handle);
        }
      }
      return openAfterRefusal(owned.data.handle);
    };

    try {
      let confirmedXUserId = identity.status === "ok" ? identity.xUserId : null;
      const profile = await lookupProfile(handle, monitorId, async (state) => {
        const checked = BuildStateSchema.parse(state);
        if (!checked.profile || !checked.x_user_id)
          throw new Error("Lookup checkpoint lacks a profile identity");
        if (checked.profile.id !== checked.x_user_id)
          throw new IdentityCheckFailed("identity_mismatch");
        if (!checked.profileComplete) {
          const confirmation = await db.rpc("confirm_build_identity", {
            p_monitor: monitorId,
            p_run_id: runId,
            p_x_user_id: checked.profile.id,
            p_display_handle: checked.profile.handle.replace(/^@/, ""),
            p_build_state: checked as unknown as Json,
          });
          if (confirmation.error) throw confirmation.error;
          if (confirmation.data !== "confirmed") throw new IdentityCheckFailed(confirmation.data);
          confirmedXUserId = checked.profile.id;
          return;
        }
        if (!confirmedXUserId || checked.profile.id !== confirmedXUserId)
          throw new IdentityCheckFailed("identity_mismatch");
        const updated = await db
          .from("monitors")
          .update({ build_state: checked, profile: checked.profile })
          .eq("id", monitorId)
          .eq("status", "building")
          .eq("build_lease_owner", runId)
          .gt("build_lease_until", new Date().toISOString())
          .select("id");
        if (updated.error) throw updated.error;
        if (!updated.data.length) throw new IdentityCheckFailed("lease_lost");
      });
      if (!profile) return await cleanup("profile_not_found", 404);
      track("agent_build_started", {}, monitorId);
      after(() => runBuild(monitorId, runId));
      return open(handle);
    } catch (error) {
      if (error instanceof IdentityCheckFailed) {
        if (error.outcome === "lease_lost") return await cleanup("build_unavailable", 503);
        if (error.outcome === "identity_mismatch" || error.outcome === "ownership_conflict")
          return await cleanup(error.outcome, 409);
        return await cleanup("build_unavailable", 503);
      }
      if (error instanceof BudgetRefused) return await cleanup("builds_unavailable", 503, "budget");
      reportServerException(error, { tags: { area: "onboarding", stage: "lookup" } });
      return await cleanup("profile_unavailable", 503);
    }
  } catch (error) {
    reportServerException(error, { tags: { area: "onboarding", stage: "admission" } });
    return refuse("build_unavailable", 503);
  }
}
