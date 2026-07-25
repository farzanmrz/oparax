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
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_TRACKED_HANDLES, normalizeHandle, normalizeValidHandle } from "@/lib/x/handle";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Pause a desk: Oparax stops watching the beat and stops posting on its behalf. */
export async function pauseDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").update({ status: "paused" }).eq("id", id);
  if (error) return { ok: false, error: "Could not pause the agent. Please try again." };
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
  if (error) return { ok: false, error: "Could not resume the agent. Please try again." };
  // Revalidate the whole /agents subtree (layout scope) — this covers the desk page's status
  // pill AND the site header's desk switcher, which lives in the parent /agents layout and would
  // otherwise show a stale name/dot after a create/pause/rename.
  revalidatePath("/agents", "layout");
  return { ok: true };
}

/**
 * Delete a desk. `post_drafts.experiment_id` carries `ON DELETE CASCADE`, and so now do
 * `voice_guides`, `voice_rules`, and `voice_extraction_runs` — all four are desk-owned, so the
 * database cleans them up. `source_posts` is deliberately untouched: it is genuinely cross-desk
 * (one ingested post can feed several desks), so it is not this desk's to delete. On success it redirects
 * to `/agents` so the now-deleted desk's URL is never re-fetched; on failure it returns
 * the usual `ActionResult` so the caller can show an inline error instead.
 */
export async function deleteDesk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("experiments").delete().eq("id", id);
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
  if (error || !data) return { ok: false, error: "Could not load the agent's tracked handles." };

  // Storage preserves casing as typed (normalizeHandle no longer lowercases — handles are
  // stored exactly as typed), so matching is case-insensitive at compare time instead, same
  // rule draft-pipeline.ts already follows for ingestion routing. Without this, "Reuters" and
  // "reuters" would both be stored as two chips for one account, burning a tracked-handle slot.
  // First-seen casing wins on a dedupe.
  const merged = [...data.tracked_handles];
  for (const handle of candidates) {
    if (merged.length >= MAX_TRACKED_HANDLES) break; // cap (client enforces too)
    if (!merged.some((existing) => existing.toLowerCase() === handle.toLowerCase())) {
      merged.push(handle);
    }
  }
  if (merged.length === data.tracked_handles.length) {
    // Nothing new landed — either all duplicates (a benign no-op) or the desk is already full.
    return data.tracked_handles.length >= MAX_TRACKED_HANDLES
      ? { ok: false, error: `An agent can track up to ${MAX_TRACKED_HANDLES} accounts.` }
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

const editDraftPostDraftIdSchema = z.string().uuid();

/**
 * Draft edit-in-place (item 9, T3.6). A human edit has no model call behind it, but
 * `post_drafts.model_call_id` is a real NOT-NULL FK to `model_calls` — and `model_calls`
 * carries deny-all RLS (no insert policy at all, service-role only), so there is no way to
 * satisfy that FK from the owner-scoped client alone. The resolved shape mirrors
 * `draft-pipeline.ts`'s `applyCorrection` (dethrone-then-insert) as closely as the trust
 * boundary allows:
 *
 *   1. RLS/cookie client: SELECT the parent draft through `post_drafts_select_via_experiment`
 *      (the existing owner-scoped EXISTS-join policy). This IS the ownership proof for the
 *      admin-client writes below — reaching this line already establishes the caller owns
 *      the desk this draft belongs to.
 *   2. Admin client: INSERT one `model_calls` row that exists PURELY to satisfy the FK — not
 *      a real billed call. `model: "human-edit"` / `stage: "manual_edit"` / `cost_usd: 0` /
 *      `reasoning: null` / `usage: null` mark it unmistakably as the deliberate, documented
 *      exception to "every model_calls row is a real billed call" (AGENTS.md) that it is —
 *      a future reader must not mistake this for an L12 violation.
 *   3. Admin client: dethrone the current winner for this (source_post_id, experiment_id,
 *      platform) — `post_drafts` carries no owner-scoped UPDATE policy at all, so this step
 *      has no RLS-client alternative regardless of preference.
 *   4. RLS/cookie client: INSERT the new `post_drafts` row. THIS is the step the plan text
 *      calls out — "via the owner-scoped RLS client... never service-role for a browser
 *      write" — the `post_drafts_insert_via_experiment` policy's `WITH CHECK` clause is what
 *      actually proves the browser caller owns this desk for the write itself.
 */
export async function editDraft(postDraftId: string, newText: string): Promise<ActionResult> {
  const parsedId = editDraftPostDraftIdSchema.safeParse(postDraftId);
  if (!parsedId.success) return { ok: false, error: "Select a draft to edit." };
  const trimmedText = newText.trim();
  if (trimmedText.length === 0) return { ok: false, error: "Draft text can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  // Step 1 — the ownership proof (see the function comment above).
  const { data: parentDraft, error: parentError } = await supabase
    .from("post_drafts")
    .select("id, source_post_id, experiment_id, story_id, platform, posted_at")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (parentError || !parentDraft) return { ok: false, error: "That draft could not be found." };
  // A posted draft's post_drafts row is the immutable record of what actually went out — Step 4
  // below inserts a fresh row with posted_at/posted_tweet_id/posted_url all NULL, which would
  // make the Feed treat the (already-live) story as unposted again and re-offer Post to X,
  // publishing the edited text as a second, near-duplicate tweet on one more click.
  if (parentDraft.posted_at) {
    return { ok: false, error: "This draft was already posted to X and can't be edited." };
  }

  const admin = createAdminClient();

  // Step 2 — the FK-satisfying model_calls row. Not a real model call: see the comment above.
  const { data: modelCall, error: modelCallError } = await admin
    .from("model_calls")
    .insert({
      owner_id: user.id,
      stage: "manual_edit",
      role: "primary",
      model: "human-edit",
      output: trimmedText,
      reasoning: null,
      usage: null,
      cost_usd: 0,
      generation_id: null,
      ref_kind: "source_post",
      ref_id: parentDraft.source_post_id,
    })
    .select("id")
    .single();
  if (modelCallError || !modelCall) {
    return { ok: false, error: "Could not save your edit. Please try again." };
  }

  // Step 3 — dethrone the current winner for this (source_post, experiment, platform). A
  // story can only have one winner per platform; no owner-scoped UPDATE policy exists here
  // regardless, same reasoning as applyCorrection's own dethrone step.
  const { error: dethroneError } = await admin
    .from("post_drafts")
    .update({ is_winner: false })
    .eq("source_post_id", parentDraft.source_post_id)
    .eq("experiment_id", parentDraft.experiment_id)
    .eq("platform", parentDraft.platform)
    .eq("is_winner", true);
  if (dethroneError) return { ok: false, error: "Could not save your edit. Please try again." };

  // Step 4 — the owner-scoped write the plan text specifically calls out.
  const { error: insertError } = await supabase.from("post_drafts").insert({
    source_post_id: parentDraft.source_post_id,
    experiment_id: parentDraft.experiment_id,
    story_id: parentDraft.story_id,
    platform: parentDraft.platform,
    model_call_id: modelCall.id,
    is_winner: true,
    judge_verdict: null,
    parent_draft_id: parentDraft.id,
  });
  if (insertError) return { ok: false, error: "Could not save your edit. Please try again." };

  revalidatePath(`/agents/${parentDraft.experiment_id}`, "layout");
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
  if (error || !data) return { ok: false, error: "Could not load the agent's tracked handles." };

  // Case-insensitive match, same rule as addTrackedHandles above — drop any stored handle
  // whose lowercase form matches the target's, regardless of the casing it was stored under.
  const nextHandles = data.tracked_handles.filter(
    (tracked) => tracked.toLowerCase() !== normalized.toLowerCase(),
  );
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
