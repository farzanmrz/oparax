// app/agents/[id]/actions.ts
//
// The desk layout's server actions — pause/resume/delete a desk, plus add/remove a
// tracked X handle. All writes run as the signed-in reporter via the RLS client
// (@/lib/supabase/server) against `experiments`, which carries full 4-policy owner RLS —
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

/** Pause a desk: Oparax stops watching the beat and stops posting on its behalf. */
export async function pauseDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").update({ status: "paused" }).eq("id", id);
  if (error) return { ok: false, error: "Could not pause the desk. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/** Resume a paused desk: Oparax starts watching the beat and drafting again. */
export async function resumeDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").update({ status: "active" }).eq("id", id);
  if (error) return { ok: false, error: "Could not resume the desk. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/**
 * Delete a desk. `post_drafts.experiment_id` carries `ON DELETE CASCADE`, so its drafts
 * are cleaned up by the database — never `source_posts` or `voice_guides`, which are
 * shared across desks (a guide is paid once per reporter; source posts are cross-desk),
 * not desk-owned, and this action never touches either table. On success it redirects
 * to `/agents` so the now-deleted desk's URL is never re-fetched; on failure it returns
 * the usual `ActionResult` so the caller can show an inline error instead.
 */
export async function deleteDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the desk. Please try again." };
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
 */
export async function addTrackedHandles(id: string, raw: string): Promise<ActionResult> {
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
    .from("experiments")
    .select("tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's tracked handles." };

  const merged = [...data.tracked_handles];
  for (const handle of candidates) {
    if (merged.length >= MAX_TRACKED_HANDLES) break; // cap (client enforces too)
    if (!merged.includes(handle)) merged.push(handle);
  }
  if (merged.length === data.tracked_handles.length) {
    // Nothing new landed — either all duplicates (a benign no-op) or the desk is already full.
    return data.tracked_handles.length >= MAX_TRACKED_HANDLES
      ? { ok: false, error: `A desk can track up to ${MAX_TRACKED_HANDLES} accounts.` }
      : { ok: true };
  }

  const { error: updateError } = await supabase
    .from("experiments")
    .update({ tracked_handles: merged })
    .eq("id", id);
  if (updateError) return { ok: false, error: "Could not add those handles. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/** Remove a tracked X handle — same read-modify-write shape as `addTrackedHandle`. */
export async function removeTrackedHandle(id: string, handle: string): Promise<ActionResult> {
  const normalized = normalizeHandle(handle);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .select("tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's tracked handles." };

  const nextHandles = data.tracked_handles.filter((tracked) => tracked !== normalized);
  const { error: updateError } = await supabase
    .from("experiments")
    .update({ tracked_handles: nextHandles })
    .eq("id", id);
  if (updateError) return { ok: false, error: "Could not remove that handle. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}
