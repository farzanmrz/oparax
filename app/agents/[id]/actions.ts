// app/agents/[id]/actions.ts
//
// The desk layout's server actions — pause/resume/delete a desk, plus add/remove a
// tracked X handle. All writes run as the signed-in reporter via the RLS client
// (@/lib/supabase/server) against `agents`, which carries full 4-policy owner RLS —
// there is no service-role client here, unlike the old agents/[id] actions this file
// replaces. Every mutation revalidates the desk's own path on success so the layout and
// its children re-render with the fresh row. The revalidate is `"layout"`-scoped, not the
// default `"page"`: DeskControls lives in the shared desk layout (rendered on Feed, Voice,
// and Setup alike), so a page-scoped revalidate would leave the status pill stale when the
// user pauses/resumes from a tab other than Feed — matches settings/actions.ts's precedent.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MAX_TRACKED_HANDLES, normalizeHandle, normalizeValidHandle } from "@/lib/x/handle";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** `addTrackedHandles`'s own result shape — it needs to report back how many candidates the
 *  20-account cap dropped (see the function comment below), which the plain `ActionResult`'s
 *  `{ ok: true }` has no room for. */
export type AddHandlesResult = { ok: true; dropped: number } | { ok: false; error: string };

/** Pause a desk: Oparax stops watching the beat and stops posting on its behalf. */
export async function pauseDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // `.select()` on the update so a zero-row match (wrong id, or an RLS-filtered desk that
  // isn't the caller's own) is visible: an update with no error and no matched row is not a
  // success — without this check the caller was told `{ ok: true }` while nothing changed,
  // same honest-outcome convention as postDraftToXForOwner's CAS-claim (`claimed.length === 0`).
  const { data, error } = await supabase
    .from("agents")
    .update({ status: "paused" })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "Could not pause the agent. Please try again." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Could not pause the agent. Please try again." };
  }
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/** Resume a paused desk: Oparax starts watching the beat and drafting again. */
export async function resumeDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // See pauseDesk's comment — same zero-row-match check.
  const { data, error } = await supabase
    .from("agents")
    .update({ status: "active" })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "Could not resume the agent. Please try again." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Could not resume the agent. Please try again." };
  }
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/**
 * Delete a desk. `drafts.agent_id` carries `ON DELETE CASCADE`, and so now do
 * `voice_guides`, `voice_rules`, and `voice_extraction_runs` — all four are desk-owned, so the
 * database cleans them up. `source_posts` is deliberately untouched: it is genuinely cross-desk
 * (one ingested post can feed several desks), so it is not this desk's to delete. On success it redirects
 * to `/agents` so the now-deleted desk's URL is never re-fetched; on failure it returns
 * the usual `ActionResult` so the caller can show an inline error instead.
 */
export async function deleteDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the agent. Please try again." };
  redirect("/agents");
}

/**
 * Add a tracked X handle. Read-modify-write under RLS (no atomic array-append in
 * PostgREST): fetch the desk's current `tracked_handles`, add the normalized handle if
 * it isn't already tracked, then update. Setup (T8) is this action's first consumer;
 * it's wired here now so that task only needs to build the UI.
 *
 * The handle is charset-validated (`normalizeValidHandle`) before it can be stored — a raw
 * handle would otherwise flow into the ingestion worker's globally-shared X stream rule and let
 * a single reporter inject stream operators across tenants (see lib/x/handle.ts).
 *
 * Returns `dropped`, the count of candidates that hit the `MAX_TRACKED_HANDLES` cap and were
 * never added — pasting 20 handles onto a desk that already tracks 5 used to keep 15 and say
 * nothing, silently discarding the rest. The caller surfaces `dropped` as an inline notice.
 * Case-insensitive duplicates of an already-tracked handle are NOT counted here — deduping is
 * the expected shape of a merge, not data loss worth calling out.
 */
export async function addTrackedHandles(id: string, raw: string): Promise<AddHandlesResult> {
  // Split a raw blob (comma / whitespace / newline separated, @ optional) into candidate
  // handles; each is charset-validated via normalizeValidHandle (invalid tokens dropped).
  const candidates = raw
    .split(/[\s,]+/)
    .map(normalizeValidHandle)
    .filter((h): h is string => h !== null);
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "Enter a valid X handle — letters, numbers, and underscores, up to 15.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent's tracked handles." };

  // Storage preserves casing as typed (normalizeHandle no longer lowercases — handles are
  // stored exactly as typed), so matching is case-insensitive at compare time instead, same
  // rule draft-pipeline.ts already follows for ingestion routing. Without this, "Reuters" and
  // "reuters" would both be stored as two chips for one account, burning a tracked-handle slot.
  // First-seen casing wins on a dedupe.
  const merged = [...data.tracked_handles];
  let dropped = 0;
  for (const handle of candidates) {
    if (merged.length >= MAX_TRACKED_HANDLES) {
      dropped++; // the cap (client enforces too, but a paste can still outrun it)
      continue;
    }
    if (!merged.some((existing) => existing.toLowerCase() === handle.toLowerCase())) {
      merged.push(handle);
    }
  }
  if (merged.length === data.tracked_handles.length) {
    // Nothing new landed — either all duplicates (a benign no-op) or the desk is already full.
    return data.tracked_handles.length >= MAX_TRACKED_HANDLES
      ? { ok: false, error: `An agent can track up to ${MAX_TRACKED_HANDLES} accounts.` }
      : { ok: true, dropped: 0 };
  }

  const { error: updateError } = await supabase
    .from("agents")
    .update({ tracked_handles: merged })
    .eq("id", id);
  if (updateError) return { ok: false, error: "Could not add those handles. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true, dropped };
}

/** Remove a tracked X handle — same read-modify-write shape as `addTrackedHandle`. */
export async function removeTrackedHandle(id: string, handle: string): Promise<ActionResult> {
  const normalized = normalizeHandle(handle);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent's tracked handles." };

  // Case-insensitive match, same rule as addTrackedHandles above — drop any stored handle
  // whose lowercase form matches the target's, regardless of the casing it was stored under.
  const nextHandles = data.tracked_handles.filter(
    (tracked) => tracked.toLowerCase() !== normalized.toLowerCase(),
  );
  const { error: updateError } = await supabase
    .from("agents")
    .update({ tracked_handles: nextHandles })
    .eq("id", id);
  if (updateError) return { ok: false, error: "Could not remove that handle. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}
