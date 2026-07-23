// app/agents/[id]/actions.ts
//
// The desk layout's server actions — pause/resume/delete a desk, plus add/remove a
// tracked X handle. All writes run as the signed-in reporter via the RLS client
// (@/lib/supabase/server) against `experiments`, which carries full 4-policy owner RLS —
// there is no service-role client here, unlike the old agents/[id] actions this file
// replaces. Every mutation revalidates the desk's own path on success so the layout and
// its children re-render with the fresh row.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Pause a desk: Oparax stops watching the beat and stops posting on its behalf. */
export async function pauseDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").update({ status: "paused" }).eq("id", id);
  if (error) return { ok: false, error: "Could not pause the desk. Please try again." };
  revalidatePath(`/agents/${id}`);
  return { ok: true };
}

/** Resume a paused desk: Oparax starts watching the beat and drafting again. */
export async function resumeDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").update({ status: "active" }).eq("id", id);
  if (error) return { ok: false, error: "Could not resume the desk. Please try again." };
  revalidatePath(`/agents/${id}`);
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

/** Strip a leading `@`, lowercase, and trim — the one normal form every stored handle takes. */
function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Add a tracked X handle. Read-modify-write under RLS (no atomic array-append in
 * PostgREST): fetch the desk's current `tracked_handles`, add the normalized handle if
 * it isn't already tracked, then update. Setup (T8) is this action's first consumer;
 * it's wired here now so that task only needs to build the UI.
 */
export async function addTrackedHandle(id: string, handle: string): Promise<ActionResult> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return { ok: false, error: "Enter a handle to track." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiments")
    .select("tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's tracked handles." };

  const nextHandles = Array.from(new Set([...data.tracked_handles, normalized]));
  const { error: updateError } = await supabase
    .from("experiments")
    .update({ tracked_handles: nextHandles })
    .eq("id", id);
  if (updateError) return { ok: false, error: "Could not add that handle. Please try again." };
  revalidatePath(`/agents/${id}`);
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
  revalidatePath(`/agents/${id}`);
  return { ok: true };
}
