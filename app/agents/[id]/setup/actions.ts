// app/agents/[id]/setup/actions.ts
//
// Setup-tab server actions (T3) — colocated here rather than the top-level `../actions.ts`,
// which owns Feed/desk-layout concerns only (pause/resume/delete, tracked handles). Same
// shape as that file: `"use server"`, the shared `ActionResult` (imported, not redefined),
// the RLS/cookie client for every `experiments` read-modify-write (owner-scoped 4-policy RLS
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
import {
  sendTestSlack as sendTestSlackAccount,
  unlinkSlack as unlinkSlackAccount,
} from "@/lib/slack/actions";
import { createClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/web/brightdata";
import type { ActionResult } from "../actions";

// Matches MAX_TRACKED_HANDLES's spirit (lib/x/handle.ts) — a reasonable cap, not a measured
// limit. Can't live in a shared constants module and be imported here AND from a "use
// server" export: a "use server" file may only export async functions (types are erased and
// so exempt, which is why ActionResult above is fine), so this stays a local literal,
// mirrored in sources-card.tsx's own MAX_WEBSITES for the client-side "at limit" copy.
const MAX_WEBSITES = 20;

/** Trim + prepend `https://` when the entry has no scheme, then verify with `new URL(...)`.
 *  `null` means "not a well-formed website" — the caller rejects the whole batch on the
 *  first bad entry so the reporter sees exactly which token is wrong, rather than a token
 *  silently vanishing (unlike addTrackedHandles' drop-invalid-keep-valid shape — a website
 *  typo is far more likely to be "the entry I actually meant to add" than a stray comma). */
function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

/**
 * Save one or more websites to `experiments.websites` (plain `string[]` — no metadata beyond
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
    .from("experiments")
    .select("websites")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's websites." };

  const existing = Array.isArray(data.websites)
    ? data.websites.filter((entry): entry is string => typeof entry === "string")
    : [];
  const merged = [...existing];
  for (const url of candidates) {
    if (merged.length >= MAX_WEBSITES) break; // cap (client enforces too)
    if (!merged.includes(url)) merged.push(url);
  }
  if (merged.length === existing.length) {
    return existing.length >= MAX_WEBSITES
      ? { ok: false, error: `A desk can track up to ${MAX_WEBSITES} websites.` }
      : { ok: true };
  }

  const { error: updateError } = await supabase
    .from("experiments")
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
    .from("experiments")
    .select("websites")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's websites." };

  const next = Array.isArray(data.websites)
    ? data.websites.filter((entry): entry is string => typeof entry === "string" && entry !== url)
    : [];
  const { error: updateError } = await supabase
    .from("experiments")
    .update({ websites: next })
    .eq("id", deskId);
  if (updateError) return { ok: false, error: "Could not remove that website. Please try again." };
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/**
 * Save-time sanity check, not a persisted artifact: wraps `scrapeUrl` (lib/web/brightdata.ts)
 * and returns a short preview or a clean error. The worker (Railway, Wave 4) is what actually
 * polls `experiments.websites` on an interval — this only proves one URL is scrapeable right
 * now. `ownerId` is resolved from the signed-in caller here, never trusted from the client,
 * matching every other action in this file.
 */
export async function testFetchWebsite(
  url: string,
): Promise<{ ok: true; preview: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  try {
    const { text } = await scrapeUrl(url, user.id);
    const trimmed = text.trim();
    const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
    return { ok: true, preview: preview || "(empty page)" };
  } catch {
    return { ok: false, error: "Could not fetch that website. Check the URL and try again." };
  }
}

/**
 * `patch.master` updates `experiments.auto_post_master` directly (a plain boolean column).
 * `patch.source` + `patch.sourceEnabled` merge into `experiments.auto_post_sources`
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
      .from("experiments")
      .update({ auto_post_master: patch.master })
      .eq("id", deskId);
    if (error) return { ok: false, error: "Could not update auto-post. Please try again." };
  }

  if (patch.source && patch.sourceEnabled !== undefined) {
    const { data, error } = await supabase
      .from("experiments")
      .select("auto_post_sources")
      .eq("id", deskId)
      .maybeSingle();
    if (error || !data)
      return { ok: false, error: "Could not load the desk's auto-post settings." };

    const current =
      typeof data.auto_post_sources === "object" &&
      data.auto_post_sources !== null &&
      !Array.isArray(data.auto_post_sources)
        ? (data.auto_post_sources as Record<string, boolean>)
        : {};
    const next = { ...current, [patch.source]: patch.sourceEnabled };

    const { error: updateError } = await supabase
      .from("experiments")
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
  const { data, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Please sign in again." };

  if (!process.env.RESEND_API_KEY) return { ok: false, error: "Email delivery isn't set up yet." };
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!to) return { ok: false, error: "No notification email is configured." };
  const from = process.env.RESEND_FROM;
  if (!from) return { ok: false, error: "Email delivery isn't set up yet." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Oparax test notification",
        text: "Oparax is connected — draft alerts for this desk will land in your inbox.",
      }),
    });
    if (!res.ok) throw new Error(`Resend send failed: ${res.status}`);
  } catch {
    return { ok: false, error: "Could not send a test email. Please try again." };
  }

  return { ok: true };
}
