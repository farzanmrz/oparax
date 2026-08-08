// app/agents/[id]/sources/actions.ts
//
// Sources-tab server actions. Every browser write starts with an owner-scoped RLS read; source
// configuration persistence then uses the existing transactional service-role helpers. Website
// adds are instant (#106): the request only reserves a `pending` row, and the billed onboarding
// call runs in `after()` — the browser learns the outcome by polling
// `getWebsiteOnboardingStatus`, never by awaiting the add.

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { QWEN_DRAFT_MODEL } from "@/lib/agent/qwen-draft-config";
import {
  markPendingSourceFailed,
  onboardSource,
  reservePendingSource,
} from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_WEBSITES, normalizeSourceUrl } from "@/lib/websites";
import type { ActionResult } from "../actions";

/** One-liner shown for each non-completed `OnboardOutcome` — the "one honest message" the
 *  issue calls for, never a multi-step repair conversation. */
const ONBOARD_ERROR_COPY: Record<string, string> = {
  no_detection_mechanism:
    "This page doesn't seem to carry your beat — paste the section you actually read, or just the site name.",
  unreachable: "Couldn't reach that site — check the URL and try again.",
  failed: "Couldn't set up that source — please try again.",
};

/**
 * Reserves a `pending` source_configs row synchronously (fast, no model call — the chip
 * renders immediately off this), then hands the real, billed onboarding call to `after()`
 * (#106) instead of blocking the request on it. Replaces `discoverAndSaveSource`: this is now
 * the ONLY website-add server action on this tab; the create-desk form runs the same shape
 * with the Sonnet model via `startWebsiteOnboardingAtCreation` (app/agents/new/actions.ts).
 * `onboardSource` marks the pending row failed itself on every non-completed outcome — the
 * catch below covers only the genuinely-unexpected throw path, or that row is stuck forever.
 */
export async function startWebsiteOnboarding(
  deskId: string,
  rawUrl: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("owner_id, beat")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent." };

  const url = normalizeSourceUrl(rawUrl);
  if (url === null)
    return { ok: false, error: `"${rawUrl.trim()}" doesn't look like a valid website.` };

  const reserved = await reservePendingSource(deskId, url);
  if ("status" in reserved) {
    if (reserved.status === "source_limit_reached") {
      return { ok: false, error: `An agent can track up to ${MAX_WEBSITES} websites.` };
    }
    if (reserved.status === "already_tracked") return { ok: true };
    return { ok: false, error: ONBOARD_ERROR_COPY.unreachable };
  }

  const ownerId = data.owner_id;
  const beat = data.beat;
  const configId = reserved.configId;
  after(async () => {
    try {
      await onboardSource(deskId, ownerId, url, beat, QWEN_DRAFT_MODEL, configId);
    } catch (err) {
      console.error("startWebsiteOnboarding: onboardSource threw", err);
      await markPendingSourceFailed(createAdminClient(), configId);
    }
  });

  revalidatePath("/agents", "layout");
  return { ok: true };
}

/**
 * Polls `source_configs` for this desk's pending/failed onboarding attempts — the browser's
 * one channel into this deny-all-RLS table, ownership proved via the same RLS `agents` read
 * every other action in this file already uses (a row coming back IS the proof), then read
 * via the admin client, mirroring `getExtractionProgress`'s ownership-then-admin-read shape.
 */
export async function getWebsiteOnboardingStatus(
  deskId: string,
): Promise<
  { ok: true; entries: { url: string; status: string; errorCode?: string }[] } | { ok: false }
> {
  const supabase = await createClient();
  const { data: owned, error: ownError } = await supabase
    .from("agents")
    .select("id")
    .eq("id", deskId)
    .maybeSingle();
  if (ownError || !owned) {
    console.error("getWebsiteOnboardingStatus: ownership check failed", ownError);
    return { ok: false };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("source_configs")
    .select("url, status")
    .eq("agent_id", deskId)
    .in("status", ["pending", "failed_validation"]);
  if (error || !data) {
    console.error("getWebsiteOnboardingStatus: source_configs read failed", error);
    return { ok: false };
  }
  return {
    ok: true,
    entries: data.map((row) => ({
      url: row.url,
      status: row.status,
      errorCode: row.status === "failed_validation" ? "failed" : undefined,
    })),
  };
}

/** Proves ownership via the RLS client, same as every other action here, then removes the
 *  site through the `remove_source_config` RPC — which deletes the `source_configs` row and
 *  updates `agents.websites` in one transaction (admin client; RLS already proved ownership
 *  above, so this is not a privilege escalation). Deliberately not a separate best-effort
 *  admin-delete: since #101's poller reads `source_configs` to decide what to poll, a failed
 *  secondary delete could leave a "removed" source still active — this action fails and
 *  reports an error instead of silently leaving that orphan behind. */
export async function removeWebsite(deskId: string, url: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("agents").select("id").eq("id", deskId).maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent's websites." };

  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc("remove_source_config", {
    p_agent_id: deskId,
    p_url: url,
  });
  if (rpcError) return { ok: false, error: "Could not remove that website. Please try again." };
  revalidatePath("/agents", "layout");
  return { ok: true };
}
