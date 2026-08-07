// app/agents/[id]/sources/actions.ts
//
// Sources-tab server actions. Every browser write starts with an owner-scoped RLS read; source
// configuration persistence then uses the existing transactional service-role helpers.

"use server";

import { revalidatePath } from "next/cache";
import { onboardSource } from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_WEBSITES, normalizeSourceUrl, parseWebsites } from "@/lib/websites";
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
 * Discovers how to detect new articles on `rawUrl` (sitemap primary, RSS fallback), runs
 * the one onboarding model call, verifies its proposed filter, and — only on success —
 * persists a `source_configs` row and adds the site to `agents.websites` in one transaction
 * (`onboardSource`'s `add_source_config` RPC call).
 */
export async function discoverAndSaveSource(deskId: string, rawUrl: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("owner_id, beat, websites")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent." };

  if (parseWebsites(data.websites).length >= MAX_WEBSITES) {
    return { ok: false, error: `An agent can track up to ${MAX_WEBSITES} websites.` };
  }

  const url = normalizeSourceUrl(rawUrl);
  if (url === null)
    return { ok: false, error: `"${rawUrl.trim()}" doesn't look like a valid website.` };

  // onboardSource deliberately throws on anything that isn't a schema-validation failure
  // (a routine gateway 429/5xx, a model_calls insert error, an RPC error) — QC round 1,
  // finding #4: an uncaught throw here escapes as an unhandled rejection and breaks the
  // "one honest message" contract. Caught here so every failure path returns the same
  // generic retry copy `onboardSource` itself can't distinguish from inside a throw.
  let outcome: Awaited<ReturnType<typeof onboardSource>>;
  try {
    outcome = await onboardSource(deskId, data.owner_id, url, data.beat);
  } catch (err) {
    console.error("discoverAndSaveSource: onboardSource threw", err);
    return { ok: false, error: ONBOARD_ERROR_COPY.failed };
  }
  if (outcome.status !== "completed") {
    return { ok: false, error: ONBOARD_ERROR_COPY[outcome.status] };
  }

  // agents.websites was already updated transactionally by add_source_config inside
  // onboardSource — this action does not touch it separately.
  revalidatePath("/agents", "layout");
  return { ok: true };
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
