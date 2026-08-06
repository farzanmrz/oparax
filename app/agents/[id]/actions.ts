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
import { z } from "zod";
import { checkXPostable, resolveXTier, xUnpostableMessage } from "@/lib/agent/desk-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_TRACKED_HANDLES, normalizeHandle, normalizeValidHandle } from "@/lib/x/handle";
import { getXLinkState } from "@/lib/x/link-state";

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

const editDraftIdSchema = z.string().uuid();

/**
 * Draft edit-in-place (item 9, T3.6). A human edit has no model call behind it, but
 * `drafts.model_call_id` is a real NOT-NULL FK to `model_calls` — and `model_calls`
 * carries deny-all RLS (no insert policy at all, service-role only), so there is no way to
 * satisfy that FK from the owner-scoped client alone. The resolved shape mirrors
 * `draft-pipeline.ts`'s `applyCorrection` (dethrone-then-insert) as closely as the trust
 * boundary allows:
 *
 *   1. RLS/cookie client: SELECT the parent draft through `drafts_select_via_agent`
 *      (the existing owner-scoped EXISTS-join policy). This IS the ownership proof for the
 *      admin-client writes below — reaching this line already establishes the caller owns
 *      the desk this draft belongs to.
 *   2. Admin client: dethrone the current winner via a compare-and-set on its EXACT row id,
 *      guarded by `is_winner = true` AND `posted_url IS NULL` — `drafts` carries no
 *      owner-scoped UPDATE policy at all, so this step has no RLS-client alternative regardless
 *      of preference. The `posted_url` leg re-checks at WRITE time what step 1 only read: a
 *      concurrent Post-to-X that CONFIRMED this winner in between must not be dethroned.
 *   3. Admin client: INSERT one `model_calls` row that exists PURELY to satisfy the FK — not
 *      a real billed call. `model: "human-edit"` / `stage: "manual_edit"` / `cost_usd: 0` /
 *      `reasoning: null` / `usage: null` mark it unmistakably as the deliberate, documented
 *      exception to "every model_calls row is a real billed call" (AGENTS.md) that it is —
 *      a future reader must not mistake this for an L12 violation. It runs AFTER the CAS so an
 *      aborted edit never leaves an orphaned, unreferenced ledger row behind.
 *   4. RLS/cookie client: INSERT the new `drafts` row. THIS is the step the plan text
 *      calls out — "via the owner-scoped RLS client... never service-role for a browser
 *      write" — the `drafts_insert_via_agent` policy's `WITH CHECK` clause is what
 *      actually proves the browser caller owns this desk for the write itself.
 */
export async function editDraft(draftId: string, newText: string): Promise<ActionResult> {
  const parsedId = editDraftIdSchema.safeParse(draftId);
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
    .from("drafts")
    .select("id, source_post_id, agent_id, story_id, platform, news_title, news_synthesis, translation")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (parentError || !parentDraft) return { ok: false, error: "That draft could not be found." };

  // The already-posted guard checks the STORY's current winner for this platform, not
  // `parentDraft`'s own `posted_at` — `parentDraft` is whatever draft id the browser passed in,
  // and council-query.ts exposes every council member's draftId to the browser, including
  // losing candidates. A losing candidate's own row always carries `posted_at: null`, even
  // after the actual winner has posted — so checking the passed-in row directly let a stale
  // losing-candidate id sail past this guard, dethrone the ACTUAL posted winner below, and
  // insert a fresh `is_winner: true` row with `posted_at: null`, making the feed render the
  // (already-live) story as unposted with an enabled Post button — one click from a
  // near-duplicate tweet. Scoped by source_post_id + agent_id + platform, the same triple
  // applyCorrection's dethrone step in draft-pipeline.ts uses.
  // postedAt alone is the ambiguous state, not proof of a live post (mirrors the feed card's
  // three-way signal) — only a confirmed post (postedAt &&
  // postedUrl) blocks editing. Editing an ambiguous draft is the reporter's actual recovery
  // path: it mints a fresh, unposted winner they can then post cleanly. Accepted tradeoff: if
  // the original ambiguous post genuinely went through, resubmitting and posting the new
  // winner risks a real duplicate on X — the UI's ambiguous-state copy tells the reporter to
  // check their account first; this function does not and cannot verify that for them.
  const { data: currentWinner, error: currentWinnerError } = await supabase
    .from("drafts")
    .select("id, posted_at, posted_url, posting_claimed_at, news_title, news_synthesis, translation")
    .eq("source_post_id", parentDraft.source_post_id)
    .eq("agent_id", parentDraft.agent_id)
    .eq("platform", parentDraft.platform)
    .eq("is_winner", true)
    .maybeSingle();
  if (currentWinnerError) {
    return { ok: false, error: "Could not verify this draft's status. Please try again." };
  }
  if (currentWinner?.posted_at && currentWinner?.posted_url) {
    return { ok: false, error: "This draft was already posted to X and can't be edited." };
  }
  if (currentWinner?.posting_claimed_at) {
    return { ok: false, error: "This draft is currently being posted to X. Please wait a moment." };
  }

  // Server-side validity gate for X, mirroring post-core.ts's postDraftToXForOwner exactly
  // (the SHARED `checkXPostable` helper, so the two can't drift) — a repair failure, a
  // hand-edited draft, or any path reaching editDraft without going through the Post button's
  // client-side check could otherwise save an unpostable winner that then fails at X with
  // claim-release churn.
  if (parentDraft.platform === "x") {
    const { tier } = await getXLinkState();
    const postable = checkXPostable(trimmedText, resolveXTier(tier));
    if (!postable.ok) {
      return {
        ok: false,
        error: xUnpostableMessage(postable.reason),
      };
    }
  }

  const admin = createAdminClient();

  // Step 2 — CAS-scoped dethrone of the EXACT winner row this call observed. Two concurrent
  // editDraft calls reading the same currentWinner: only the call that actually flips THIS row
  // from true to false proceeds past this point; the loser's update matches zero rows and aborts
  // before ever inserting a second winner. A currentWinner read as null — no is_winner:true row
  // visible at Step 1, either a genuine transient window between another call's dethrone and its
  // own insert, or an inconsistent state — aborts here too, rather than proceeding unguarded:
  // there is nothing to prove exclusive ownership over. Traced through both interleavings (same
  // winner observed by both callers; second caller lands in the transient zero-winner window),
  // this closes the double-insert race by construction.
  //
  // `.is("posted_url", null)` re-checks at WRITE time what the already-posted guard above only
  // READ: a concurrent Post-to-X click can confirm this exact winner (posted_at AND posted_url
  // both stamped) between that read and this update, and dethroning a confirmed post would put
  // the feed back into "unposted" with a live tweet already out. An ambiguous row (posted_at set,
  // posted_url null) still dethrones — that is the reporter's intended recovery path — as does a
  // wholly unposted one. A row confirmed in the interim simply matches zero rows and falls
  // through to the same "edited elsewhere" error below.
  if (!currentWinner) {
    return { ok: false, error: "This draft was just edited elsewhere — refresh and try again." };
  }
  const { data: dethroned, error: dethroneError } = await admin
    .from("drafts")
    .update({ is_winner: false })
    .eq("id", currentWinner.id)
    .eq("is_winner", true)
    .is("posted_url", null)
    .is("posting_claimed_at", null)
    .select("id");
  if (dethroneError) return { ok: false, error: "Could not save your edit. Please try again." };
  if (!dethroned || dethroned.length === 0) {
    return { ok: false, error: "This draft was just edited elsewhere — refresh and try again." };
  }

  // Step 3 — the FK-satisfying model_calls row. Not a real model call: see the comment above.
  // Deliberately AFTER the CAS: this call now uniquely owns the dethroned row, so the row it
  // writes here is always referenced by the insert below rather than orphaned by an abort.
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
    // The CAS already dethroned the winner, so this abort owes the same compensation the insert
    // failure below owes — otherwise the story is left with no winner at all.
    await admin.from("drafts").update({ is_winner: true }).eq("id", currentWinner.id);
    return { ok: false, error: "Could not save your edit. Please try again." };
  }

  // Step 4 — the owner-scoped write the plan text specifically calls out.
  const { error: insertError } = await supabase.from("drafts").insert({
    source_post_id: parentDraft.source_post_id,
    agent_id: parentDraft.agent_id,
    story_id: parentDraft.story_id,
    platform: parentDraft.platform,
    model_call_id: modelCall.id,
    is_winner: true,
    judge_verdict: null,
    // The lineage parent is the row that was actually dethroned, NOT `parentDraft.id` — the
    // browser can pass any council member's id, including a losing candidate, so pointing at it
    // would record a parent this draft never superseded.
    parent_draft_id: currentWinner.id,
    // Editing replaces the winning row, so preserve the card metadata that belongs to the
    // winning draft. Judge review deliberately resets: the human edit invalidates it.
    news_title: currentWinner.news_title,
    news_synthesis: currentWinner.news_synthesis,
    translation: currentWinner.translation,
  });
  if (insertError) {
    // drafts still carries no partial unique index enforcing one is_winner=true row per
    // (source_post_id, agent_id, platform), so steps 2-4 remain non-transactional calls
    // with no serialization at the database layer. But the double-insert race that index would
    // have closed is now closed at the application level instead — Step 2's CAS above guarantees
    // this call uniquely owns currentWinner before reaching this point, so an insert failure here
    // only ever leaves a single dethroned winner to restore, never a competing second winner to
    // reconcile against.
    const { error: restoreError } = await admin
      .from("drafts")
      .update({ is_winner: true })
      .eq("id", currentWinner.id);
    if (restoreError) {
      return {
        ok: false,
        error:
          "Could not save your edit, and the previous draft's status could not be restored. Please refresh and check the feed before retrying.",
      };
    }
    return { ok: false, error: "Could not save your edit. Please try again." };
  }

  revalidatePath(`/agents/${parentDraft.agent_id}`, "layout");
  return { ok: true };
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
