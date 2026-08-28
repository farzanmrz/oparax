// lib/onboard/pilot-desk.ts
//
// Service-side desk creation for the pilot onboarding flow (#131 Part F). This is the pilot
// twin of the signed-in createDesk (app/agents/new/actions.ts), deliberately NOT reusing it:
// there is no session here: every desk belongs to the single pilot owner account
// (PILOT_OWNER_ID), rows are written with the admin client, identity is never verified
// (reporter_verified_at stays null), and the tracked-handle 20-cap does not apply because
// demonstrated sources are never truncated (standing plan decision for this issue).
//
// SERVER-ONLY: admin-client writes throughout.
import "server-only";

import { isPrivateHostname, validatePublicHostname } from "@/lib/sources/discovery";
import {
  markPendingSourceFailed,
  onboardSource,
  SONNET_ONBOARDING_MODEL,
} from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSourceUrl } from "@/lib/websites";
import { normalizeValidHandle } from "@/lib/x/handle";

/** The pilot path reserves source rows with an explicit generous ceiling (the RPC's own
 *  default limit is sized for a reporter-managed desk; the agent may recommend more sites). */
const PILOT_SOURCE_LIMIT = 25;

/** The one account every pilot desk belongs to. Throwing here (not silently defaulting) is
 *  deliberate: a pilot desk with a made-up owner would be unreachable and unbillable. */
export function getPilotOwnerId(): string {
  const ownerId = process.env.PILOT_OWNER_ID;
  if (!ownerId) {
    throw new Error("PILOT_OWNER_ID is not set: pilot onboarding cannot create desks.");
  }
  return ownerId;
}

/**
 * Creates the pilot desk row itself. X handles are charset-validated through
 * normalizeValidHandle (the same security boundary every other persist path uses: an
 * unvalidated handle flows into the shared X stream rule); invalid ones are dropped, valid
 * ones are deduped case-insensitively, and the list is NEVER truncated: demonstrated sources
 * survive in full on this path.
 */
export async function createPilotDesk(input: {
  handle: string;
  beat: string;
  xSources: string[];
  websites: string[];
}): Promise<{ agentId: string }> {
  const ownerId = getPilotOwnerId();
  const trackedHandles: string[] = [];
  for (const raw of input.xSources) {
    const handle = normalizeValidHandle(raw);
    if (!handle) continue;
    if (!trackedHandles.some((tracked) => tracked.toLowerCase() === handle.toLowerCase())) {
      trackedHandles.push(handle);
    }
  }

  const preferredName = `${input.handle}'s desk`;
  const name = preferredName.length <= 30 ? preferredName : input.handle.slice(0, 30);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .insert({
      owner_id: ownerId,
      name,
      beat: input.beat,
      reporter_handle: input.handle,
      public_handle: input.handle.toLowerCase(),
      created_via: "pilot",
      tracked_handles: trackedHandles,
      // Nobody proved they are this person: pilot desks are built from public signals only.
      reporter_verified_at: null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`createPilotDesk: agents insert failed (${error?.message ?? "no row"})`);
  }
  return { agentId: data.id };
}

/**
 * Onboards the recommended websites for a pilot desk through the EXISTING onboard-source flow,
 * serially (the caller is already in a long-running awaited context). Each site: reserve a
 * pending source_configs row via the reserve RPC (called directly so the pilot's higher
 * p_limit applies: the exported reservePendingSource helper hard-codes no limit), then await
 * the real, billed onboardSource on Sonnet. A failed website never fails the desk: per-site
 * throws are caught, the pending row is marked failed, and the loop continues.
 */
export async function onboardPilotWebsites(
  agentId: string,
  beat: string,
  websites: string[],
): Promise<void> {
  const ownerId = getPilotOwnerId();
  const admin = createAdminClient();
  for (const raw of websites) {
    const url = normalizeSourceUrl(raw);
    if (!url) continue;
    // Same inline refusal reservePendingSource performs: a private/unresolvable host never
    // even gets a pending row.
    if (isPrivateHostname(url.hostname)) continue;
    try {
      await validatePublicHostname(url.hostname);
    } catch {
      continue;
    }
    const { data, error } = await admin.rpc("reserve_pending_source_config", {
      p_agent_id: agentId,
      p_url: url.toString(),
      p_domain: url.hostname,
      p_display_name: url.hostname,
      p_limit: PILOT_SOURCE_LIMIT,
    });
    if (error) {
      console.error("onboardPilotWebsites: reserve_pending_source_config failed", error);
      continue;
    }
    if (!data) continue; // already tracked on this desk
    const configId = data as string;
    try {
      await onboardSource(agentId, ownerId, url, beat, SONNET_ONBOARDING_MODEL, configId);
    } catch (err) {
      console.error("onboardPilotWebsites: onboardSource threw", err);
      await markPendingSourceFailed(admin, configId, "unexpected_error");
    }
  }
}

/**
 * Deletes a pilot desk by id with the admin client: used ONLY to roll back a desk whose
 * onboarding attempt failed after the row was created. Never the RLS deleteDesk or
 * delete_account (those are reporter-session paths). Matched-row check: zero deleted rows is
 * reported, not silently ignored.
 */
export async function deletePilotDesk(agentId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").delete().eq("id", agentId).select("id");
  if (error) {
    console.error("deletePilotDesk: delete failed", error);
    return;
  }
  if (!data || data.length === 0) {
    console.error(`deletePilotDesk: no agents row matched id ${agentId}`);
  }
}
