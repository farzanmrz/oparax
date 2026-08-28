"use server";

// Pilot onboarding entry point (#131 Part F): the landing page's handle box submits here. The
// whole build is AWAITED: the visitor watches a pending state while the agent reads their
// public X presence, a pilot desk is created, and its websites onboard. The landing page
// (app/page.tsx) carries `export const maxDuration = 800` so this action gets the runtime it
// needs on Vercel.

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import { runOnboardingAgent } from "@/lib/onboard/agent";
import {
  createPilotDesk,
  deletePilotDesk,
  getPilotOwnerId,
  onboardPilotWebsites,
} from "@/lib/onboard/pilot-desk";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeValidHandle } from "@/lib/x/handle";

/** Completed pilot builds allowed per calendar month (UTC), across all visitors. */
const MONTHLY_COMPLETED_CAP = 10;
/** Onboarding attempts allowed per IP per UTC day. */
const DAILY_PER_IP_CAP = 3;

const GENERIC_FAILURE_COPY = "We couldn't build this feed. Try again, or try later.";

export type StartPilotOnboardingResult =
  | { ok: true; handle: string; existing?: boolean }
  | { ok: false; error: string };

async function requestIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const salt = process.env.ONBOARD_IP_SALT ?? "oparax-pilot";
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

function utcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function startPilotOnboarding(rawHandle: string): Promise<StartPilotOnboardingResult> {
  // (a) A valid X handle, or nothing happens.
  const handle = normalizeValidHandle(rawHandle);
  if (!handle) return { ok: false, error: "That doesn't look like an X handle." };
  const distinctId = `x:${handle.toLowerCase()}`;
  const eventProps = { pilot_handle: handle };

  const admin = createAdminClient();

  // (b) A feed for this handle already exists: link to it, NEVER rebuild.
  const { data: existingDesk, error: existingError } = await admin
    .from("agents")
    .select("id")
    .eq("public_handle", handle.toLowerCase())
    .maybeSingle();
  if (existingError) {
    reportServerException(existingError, { tags: { scope: "onboard_existing_check" } });
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }
  if (existingDesk) return { ok: true, handle, existing: true };

  // (c) Monthly pilot capacity (completed builds this UTC calendar month).
  const { count: monthlyCount, error: monthlyError } = await admin
    .from("onboard_attempts")
    .select("*", { count: "exact", head: true })
    .eq("outcome", "completed")
    .gte("created_at", utcMonthStartIso());
  if (monthlyError) {
    reportServerException(monthlyError, { tags: { scope: "onboard_monthly_cap" } });
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }
  if ((monthlyCount ?? 0) >= MONTHLY_COMPLETED_CAP) {
    return { ok: false, error: "The pilot is full this month. Try again next month." };
  }

  // (d) Per-IP daily limit (all attempt rows for this address today, any outcome).
  const ipHash = await requestIpHash();
  const { count: ipCount, error: ipError } = await admin
    .from("onboard_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("day", utcToday());
  if (ipError) {
    reportServerException(ipError, { tags: { scope: "onboard_ip_cap" } });
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }
  if ((ipCount ?? 0) >= DAILY_PER_IP_CAP) {
    captureServerEvent("onboard_rate_limited", { distinctId, properties: eventProps });
    return { ok: false, error: "You've hit today's limit. Try again tomorrow." };
  }

  // (e) Record the attempt before any billed work.
  const { data: startedRow, error: startedError } = await admin
    .from("onboard_attempts")
    .insert({ handle, ip_hash: ipHash, outcome: "started" })
    .select("id")
    .single();
  if (startedError || !startedRow) {
    reportServerException(startedError ?? new Error("no started row"), {
      tags: { scope: "onboard_started_row" },
    });
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }
  captureServerEvent("onboard_started", { distinctId, properties: eventProps });

  const recordFailure = async (reason: string) => {
    const { error } = await admin
      .from("onboard_attempts")
      .insert({ handle, ip_hash: ipHash, outcome: "failed" });
    if (error) console.error("startPilotOnboarding: failed-row insert failed", error);
    captureServerEvent("onboard_failed", {
      distinctId,
      properties: { ...eventProps, reason },
    });
  };

  // (f) Run the agent. This is the long pole: the client shows its pending copy meanwhile.
  let ownerId: string;
  try {
    ownerId = getPilotOwnerId();
  } catch (error) {
    reportServerException(error, { tags: { scope: "onboard_pilot_owner" } });
    await recordFailure("pilot_owner_unset");
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }
  const agentResult = await runOnboardingAgent(handle, ownerId);
  if (!agentResult.ok) {
    await recordFailure(agentResult.reason);
    return {
      ok: false,
      error:
        agentResult.reason === "profile_not_found"
          ? "We couldn't find that X account. Check the handle and try again."
          : GENERIC_FAILURE_COPY,
    };
  }

  // (g) Create the desk, then onboard its websites. Any failure after the desk row exists
  // rolls the desk back: a half-built feed must not squat on the handle's public URL.
  let agentId: string | null = null;
  try {
    const created = await createPilotDesk({
      handle,
      beat: agentResult.output.beat,
      xSources: agentResult.output.x_sources.map((source) => source.handle),
      websites: agentResult.output.website_sources.map((source) => source.url),
    });
    agentId = created.agentId;
    await onboardPilotWebsites(
      agentId,
      agentResult.output.beat,
      agentResult.output.website_sources.map((source) => source.url),
    );
  } catch (error) {
    reportServerException(error, { tags: { scope: "onboard_desk_create" } });
    if (agentId) await deletePilotDesk(agentId);
    await recordFailure("desk_create_failed");
    return { ok: false, error: GENERIC_FAILURE_COPY };
  }

  // Flip the started row to completed. The partial unique index on (ip_hash, day) WHERE
  // outcome = 'completed' can reject this when the same address already completed a build
  // today: the desk exists either way, so that conflict still reads as success.
  const { error: completeError } = await admin
    .from("onboard_attempts")
    .update({ outcome: "completed" })
    .eq("id", startedRow.id);
  if (completeError && completeError.code !== "23505") {
    console.error("startPilotOnboarding: completed-row update failed", completeError);
    reportServerException(completeError, { tags: { scope: "onboard_completed_row" } });
  }
  captureServerEvent("onboard_completed", { distinctId, properties: eventProps });
  // X subscriptions for the new desk's tracked handles are picked up by the reconcile cron;
  // nothing to dispatch here.
  return { ok: true, handle };
}
