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
import { sendTestEmail as sendPlainTestEmail } from "@/lib/notify/email";
import {
  sendTestSlack as sendTestSlackAccount,
  unlinkSlack as unlinkSlackAccount,
} from "@/lib/slack/actions";
import { createClient } from "@/lib/supabase/server";
import { MAX_WEBSITES, parseWebsites } from "@/lib/websites";
import type { ActionResult } from "../actions";

/** Trim + prepend `https://` when the entry has no scheme, then verify with `new URL(...)`.
 *  `null` means "not a well-formed website" — the caller rejects the whole batch on the
 *  first bad entry so the reporter sees exactly which token is wrong, rather than a token
 *  silently vanishing (unlike addTrackedHandles' drop-invalid-keep-valid shape — a website
 *  typo is far more likely to be "the entry I actually meant to add" than a stray comma). */
function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    // Reject any scheme but http(s) — a bare "example.com" gets https:// prepended above, but
    // an explicit "javascript://…" / "file://…" / "ftp://…" entry matched the scheme regex
    // above too and would otherwise pass through unrestricted into agents.websites (and
    // from there into the scraper/ingestion worker).
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Save one or more websites to `agents.websites` (plain `string[]` — no metadata beyond
 * the URL is asked for this slice). Read-modify-write under RLS, same shape as
 * `addTrackedHandles`: read current `websites`, merge/dedupe the normalized candidates,
 * update, revalidate. Unlike `addTrackedHandles`, an invalid entry rejects the whole call
 * with a clear error naming it, rather than being silently dropped.
 */
export async function saveWebsites(
  deskId: string,
  websites: readonly string[],
): Promise<ActionResult> {
  const candidates: string[] = [];
  for (const raw of websites) {
    const normalized = normalizeWebsiteUrl(raw);
    if (normalized === null)
      return { ok: false, error: `"${raw.trim()}" doesn't look like a valid website.` };
    candidates.push(normalized);
  }
  if (candidates.length === 0) return { ok: false, error: "Enter a website to track." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("websites")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent's websites." };

  const existing = parseWebsites(data.websites);
  const merged = [...existing];
  for (const url of candidates) {
    if (merged.length >= MAX_WEBSITES) break; // cap (client enforces too)
    if (!merged.includes(url)) merged.push(url);
  }
  if (merged.length === existing.length) {
    return existing.length >= MAX_WEBSITES
      ? { ok: false, error: `An agent can track up to ${MAX_WEBSITES} websites.` }
      : { ok: true };
  }

  const { error: updateError } = await supabase
    .from("agents")
    .update({ websites: merged })
    .eq("id", deskId);
  if (updateError) return { ok: false, error: "Could not save those websites. Please try again." };
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/** Same read-modify-write shape as `removeTrackedHandle`. */
export async function removeWebsite(deskId: string, url: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("websites")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent's websites." };

  const next = parseWebsites(data.websites).filter((entry) => entry !== url);
  const { error: updateError } = await supabase
    .from("agents")
    .update({ websites: next })
    .eq("id", deskId);
  if (updateError) return { ok: false, error: "Could not remove that website. Please try again." };
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
