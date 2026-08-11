// app/agents/[id]/actions.ts
//
// The desk layout's server actions — pause/resume/delete a desk, plus add/remove a
// tracked X handle. All writes run as the signed-in reporter via the RLS client
// (@/lib/supabase/server) against `agents`, which carries full 4-policy owner RLS —
// there is no service-role client here, unlike the old agents/[id] actions this file
// replaces. Every mutation revalidates the desk's own path on success so the layout and
// its children re-render with the fresh row. The revalidate is `"layout"`-scoped, not the
// default `"page"`: DeskControls lives in the shared desk layout (rendered on Feed, Voice,
// and Sources alike), so a page-scoped revalidate would leave the status pill stale when the
// user pauses/resumes from a tab other than Feed — matches settings/actions.ts's precedent.
"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkXPostable, resolveDeskTier, xUnpostableMessage } from "@/lib/agent/desk-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_TRACKED_HANDLES, normalizeHandle, normalizeValidHandle } from "@/lib/x/handle";
import { getXLinkState } from "@/lib/x/link-state";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** `addTrackedHandles`'s own result shape — it needs to report back how many candidates the
 *  20-account cap dropped (see the function comment below), which the plain `ActionResult`'s
 *  `{ ok: true }` has no room for. */
export type AddHandlesResult = { ok: true; dropped: number } | { ok: false; error: string };
export type EditDraftResult = { ok: true; draftId: string } | { ok: false; error: string };

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
 * it isn't already tracked, then update. Sources is this action's owner-facing consumer;
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

const editDraftIdSchema = z.string().uuid();

/**
 * Replace the current winner with a human-edited winner while preserving its metadata and
 * lineage. The owner-scoped client proves ownership and inserts the replacement; the admin
 * client performs the compare-and-set dethrone and creates the zero-cost human-edit ledger row
 * required by drafts.model_call_id.
 */
export async function editDraft(draftId: string, newText: string): Promise<EditDraftResult> {
  const parsedId = editDraftIdSchema.safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: "Select a draft to edit." };
  const trimmedText = newText.trim();
  if (!trimmedText) return { ok: false, error: "Draft text can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: parentDraft, error: parentError } = await supabase
    .from("drafts")
    .select(
      "id, source_post_id, agent_id, story_id, platform, news_title, news_synthesis, translation",
    )
    .eq("id", parsedId.data)
    .maybeSingle();
  if (parentError || !parentDraft) return { ok: false, error: "That draft could not be found." };

  const { data: currentWinner, error: currentWinnerError } = await supabase
    .from("drafts")
    .select(
      "id, posted_at, posted_url, posting_claimed_at, news_title, news_synthesis, translation, news_points, on_beat_reason",
    )
    .eq("source_post_id", parentDraft.source_post_id)
    .eq("agent_id", parentDraft.agent_id)
    .eq("platform", parentDraft.platform)
    .eq("is_winner", true)
    .maybeSingle();
  if (currentWinnerError) {
    return { ok: false, error: "Could not verify this draft's status. Please try again." };
  }
  if (currentWinner?.posted_at && currentWinner.posted_url) {
    return { ok: false, error: "This draft was already posted to X and can't be edited." };
  }
  if (currentWinner?.posting_claimed_at) {
    return { ok: false, error: "This draft is currently being posted to X. Please wait a moment." };
  }

  if (parentDraft.platform === "x") {
    // Same desk-resolved ceiling as the pipeline, feed counter, and post gate (resolveDeskTier).
    // The owned parent-draft read above is the ownership proof; this RLS read only gets its tier.
    const [{ tier }, { data: tierAgent, error: tierAgentError }] = await Promise.all([
      getXLinkState(),
      supabase.from("agents").select("reporter_tier").eq("id", parentDraft.agent_id).maybeSingle(),
    ]);
    if (tierAgentError || !tierAgent) {
      return {
        ok: false,
        error: "Could not verify this draft's character limit. Please try again.",
      };
    }
    const postable = checkXPostable(trimmedText, resolveDeskTier(tierAgent.reporter_tier, tier));
    if (!postable.ok) {
      return { ok: false, error: xUnpostableMessage(postable.reason) };
    }
  }

  if (!currentWinner) {
    return { ok: false, error: "This draft was just edited elsewhere — refresh and try again." };
  }

  const admin = createAdminClient();
  const { data: dethroned, error: dethroneError } = await admin
    .from("drafts")
    .update({ is_winner: false })
    .eq("id", currentWinner.id)
    .eq("is_winner", true)
    .is("posted_url", null)
    .is("posting_claimed_at", null)
    .select("id");
  if (dethroneError) return { ok: false, error: "Could not save your edit. Please try again." };
  if (!dethroned?.length) {
    return { ok: false, error: "This draft was just edited elsewhere — refresh and try again." };
  }

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
    const { data: restoredWinner, error: restoreError } = await admin
      .from("drafts")
      .update({ is_winner: true })
      .eq("id", currentWinner.id)
      .select("id");
    if (restoreError || !restoredWinner?.length) {
      Sentry.captureException(
        restoreError ??
          new Error("editDraft model-call failure did not restore its previous winner"),
        {
          tags: {
            scope: "edit_draft_winner_restore",
            failure_leg: "model_call_insert",
            draftId: currentWinner.id,
            agentId: parentDraft.agent_id,
          },
          extra: { modelCallError: modelCallError?.message ?? "No model-call row returned" },
        },
      );
      return {
        ok: false,
        error:
          "Could not save your edit, and the previous draft's status could not be restored. Please refresh and check the feed before retrying.",
      };
    }
    return { ok: false, error: "Could not save your edit. Please try again." };
  }

  const { data: insertedDraft, error: insertError } = await supabase
    .from("drafts")
    .insert({
      source_post_id: parentDraft.source_post_id,
      agent_id: parentDraft.agent_id,
      story_id: parentDraft.story_id,
      platform: parentDraft.platform,
      model_call_id: modelCall.id,
      is_winner: true,
      judge_verdict: null,
      parent_draft_id: currentWinner.id,
      news_title: currentWinner.news_title,
      news_synthesis: currentWinner.news_synthesis,
      translation: currentWinner.translation,
      news_points: currentWinner.news_points,
      on_beat_reason: currentWinner.on_beat_reason,
    })
    .select("id")
    .single();
  if (insertError || !insertedDraft) {
    // This is a best-effort two-step rollback: a process kill between dethroning and restoring
    // can still leave no winner. True atomicity requires an RPC, outside this round.
    const { data: restoredWinner, error: restoreError } = await admin
      .from("drafts")
      .update({ is_winner: true })
      .eq("id", currentWinner.id)
      .select("id");
    const { error: deleteModelCallError } = await admin
      .from("model_calls")
      .delete()
      .eq("id", modelCall.id);
    if (restoreError || !restoredWinner?.length) {
      Sentry.captureException(
        restoreError ?? new Error("editDraft insert failure did not restore its previous winner"),
        {
          tags: {
            scope: "edit_draft_winner_restore",
            failure_leg: "draft_insert",
            draftId: currentWinner.id,
            agentId: parentDraft.agent_id,
          },
          extra: { insertError: insertError?.message ?? "No draft row returned" },
        },
      );
      return {
        ok: false,
        error:
          "Could not save your edit, and the previous draft's status could not be restored. Please refresh and check the feed before retrying.",
      };
    }
    if (deleteModelCallError) {
      Sentry.captureException(deleteModelCallError, {
        tags: {
          scope: "edit_draft_model_call_rollback",
          modelCallId: modelCall.id,
          agentId: parentDraft.agent_id,
        },
      });
    }
    return { ok: false, error: "Could not save your edit. Please try again." };
  }

  revalidatePath(`/agents/${parentDraft.agent_id}`, "layout");
  return { ok: true, draftId: insertedDraft.id };
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
