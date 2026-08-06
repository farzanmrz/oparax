// app/agents/[id]/setup/actions.ts
//
// Setup-tab server actions (T3) — colocated here rather than the top-level `../actions.ts`,
// which owns Feed/desk-layout concerns only (pause/resume/delete, tracked handles). Same
// shape as that file: `"use server"`, the shared `ActionResult` (imported, not redefined),
// the RLS/cookie client for every `agents` read-modify-write (owner-scoped 4-policy RLS
// covers `websites`/`auto_post_master`/`auto_post_sources` — no admin client needed), and
// `revalidatePath("/agents", "layout")` on every write a switcher/status-visible surface
// could depend on.
//
// Slack's link/disconnect/send-test logic itself lives in `lib/slack/actions.ts` +
// `lib/slack/link-state.ts` (already implemented, Wave 3) — `sendTestSlack`/`unlinkSlack`
// below are thin re-exports under this tab's own action surface so the client only ever
// imports from "./actions", matching how it already only imports "../actions" for the
// tracked-handles actions rather than reaching into a lib module directly.

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { QWEN_DRAFT_MODEL } from "@/lib/agent/qwen-draft-config";
import { sendTestEmail as sendPlainTestEmail } from "@/lib/notify/email";
import {
  sendTestSlack as sendTestSlackAccount,
  unlinkSlack as unlinkSlackAccount,
} from "@/lib/slack/actions";
import {
  markPendingSourceFailed,
  onboardSource,
  reservePendingSource,
} from "@/lib/sources/onboard-source";
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
 * Reserves a `pending` source_configs row synchronously (fast, no model call — the chip
 * renders immediately off this), then hands the real, billed onboarding call to `after()`
 * (#106) instead of blocking the request on it. Replaces `discoverAndSaveSource`/
 * `saveWebsites`: `saveWebsites` is deleted outright (it never called `onboardSource` at
 * all — see its own removal, this diff), and this is now the ONLY website-add server
 * action, used by both the Setup page and the create-desk form (`startWebsiteOnboardingAtCreation`
 * wraps this same shape with the Sonnet model — see app/agents/new/actions.ts).
 */
export async function startWebsiteOnboarding(
  deskId: string,
  rawUrl: string,
): Promise<ActionResult> {
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

  const reserved = await reservePendingSource(deskId, url);
  if ("status" in reserved) return { ok: false, error: ONBOARD_ERROR_COPY.unreachable };

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
): Promise<{ url: string; status: string; errorCode?: string }[]> {
  const supabase = await createClient();
  const { data: owned, error: ownError } = await supabase
    .from("agents")
    .select("id")
    .eq("id", deskId)
    .maybeSingle();
  if (ownError || !owned) {
    console.error("getWebsiteOnboardingStatus: ownership check failed", ownError);
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("source_configs")
    .select("url, status")
    .eq("agent_id", deskId)
    .in("status", ["pending", "failed_validation"]);
  if (error || !data) {
    console.error("getWebsiteOnboardingStatus: source_configs read failed", error);
    return [];
  }
  return data.map((row) => ({
    url: row.url,
    status: row.status,
    errorCode: row.status === "failed_validation" ? "failed" : undefined,
  }));
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

/**
 * `patch.master` updates `agents.auto_post_master` directly (a plain boolean column).
 * `patch.source` + `patch.sourceEnabled` merge into `agents.auto_post_sources`
 * (`{ x?: boolean; website?: boolean }`, per T2.4b — the ingest pipeline already reads it
 * keyed by source TYPE, not per-handle), same read-modify-write shape as the handles actions.
 */
export async function toggleAutoPost(
  deskId: string,
  patch: { master?: boolean; source?: "x" | "website"; sourceEnabled?: boolean },
): Promise<ActionResult> {
  const supabase = await createClient();

  if (patch.master !== undefined) {
    const { error } = await supabase
      .from("agents")
      .update({ auto_post_master: patch.master })
      .eq("id", deskId);
    if (error) return { ok: false, error: "Could not update auto-post. Please try again." };
  }

  if (patch.source && patch.sourceEnabled !== undefined) {
    const { data, error } = await supabase
      .from("agents")
      .select("auto_post_sources")
      .eq("id", deskId)
      .maybeSingle();
    if (error || !data)
      return { ok: false, error: "Could not load the agent's auto-post settings." };

    const current =
      typeof data.auto_post_sources === "object" &&
      data.auto_post_sources !== null &&
      !Array.isArray(data.auto_post_sources)
        ? (data.auto_post_sources as Record<string, boolean>)
        : {};
    const next = { ...current, [patch.source]: patch.sourceEnabled };

    const { error: updateError } = await supabase
      .from("agents")
      .update({ auto_post_sources: next })
      .eq("id", deskId);
    if (updateError) return { ok: false, error: "Could not update auto-post. Please try again." };
  }

  revalidatePath("/agents", "layout");
  return { ok: true };
}

/** Thin wrapper over `lib/slack/actions.ts`'s `sendTestSlack` — the client only imports from
 *  this tab's own actions surface, matching the tracked-handles precedent. */
export async function sendTestSlack(deskId: string): Promise<ActionResult> {
  return sendTestSlackAccount(deskId);
}

/** Thin wrapper over `lib/slack/actions.ts`'s `unlinkSlack`. */
export async function unlinkSlack(deskId: string): Promise<ActionResult> {
  return unlinkSlackAccount(deskId);
}

/**
 * Email side ships fully wired but Resend isn't provisioned yet (no `RESEND_API_KEY` in this
 * environment) — this checks presence server-side and fails clean with the exact copy the
 * plan calls for, rather than letting a missing key throw. There's no per-desk email
 * override this slice (no migration reserved a column for one, and adding one is Wave 1's
 * job, already closed) — `NOTIFY_EMAIL_TO` is the one address, app-wide, as today; this just
 * proves whether Oparax can reach it.
 */
export async function sendTestEmail(deskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("agents").select("id").eq("id", deskId).maybeSingle();
  if (error || !data) return { ok: false, error: "Please sign in again." };

  if (!process.env.RESEND_API_KEY) return { ok: false, error: "Email delivery isn't set up yet." };
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!to) return { ok: false, error: "No notification email is configured." };
  if (!process.env.RESEND_FROM) return { ok: false, error: "Email delivery isn't set up yet." };

  try {
    await sendPlainTestEmail({
      to,
      subject: "Oparax test notification",
      text: "Oparax is connected — draft alerts for this agent will land in your inbox.",
    });
  } catch {
    return { ok: false, error: "Could not send a test email. Please try again." };
  }

  return { ok: true };
}
