// SERVER-ONLY: corpus_posts is deny-all and writes belong to the service-role extraction path.
import { createAdminClient } from "@/lib/supabase/admin";
import type { CorpusPost } from "./extract-guide";

// OWNER DECISION: corpus_posts is the owner's accumulating DATA SET for a desk, not a snapshot
// of the latest extraction. A re-extraction NEVER deletes previously stored posts — it only adds
// posts not already present and refreshes the ones that are. X's timeline read returns the 100
// most recent original posts, so consecutive extractions overlap heavily; treating each run as a
// replacement would discard history the owner wants kept. The `unique (experiment_id, x_post_id)`
// constraint (see the corpus_posts migration) is what makes a re-extraction idempotent: an upsert
// on that conflict target inserts posts the desk has never seen and refreshes engagement/text on
// posts it has, without ever touching a row outside this run's fetch. A failed upsert leaves
// everything previously stored for this desk fully intact — there is no delete step to have run
// first or to run after, so there is no window where a failure can leave the desk with fewer
// rows than it had before the call.
export async function accumulateCorpus(experimentId: string, posts: CorpusPost[]): Promise<void> {
  if (posts.length === 0) {
    // Nothing usable came back from this run's fetch. With deletion off the table, an empty new
    // set is a plain no-op: nothing to add, nothing to refresh, and — per the accumulation
    // decision above — nothing to remove either.
    return;
  }

  const admin = createAdminClient();

  // Reset excluded_off_beat/exclude_reason to false/null on every row in THIS payload, then let
  // markCorpusExclusions (which runs after this, in create-desk-extraction.ts) re-apply exclusion
  // for whichever of these ids the model actually flags this run. This is safe specifically
  // because the payload here is always exactly this run's fetched corpus (see fetchCorpus's
  // caller) and markCorpusExclusions's postIds are drawn from that same fetched corpus (traced in
  // extract-guide.ts's scope tool: `byId` is built from the `posts` array passed into this run's
  // extraction, so `known` ids can only be members of it) — never from the full accumulated
  // table. So for a row in this payload, the reset-then-selectively-reapply pair is a complete,
  // fresh reclassification for that post: whatever it was flagged as in a PRIOR run gets
  // overwritten by what THIS run's model decides, which is correct — the model re-examines every
  // post it fetches, every run. A row belonging to an EARLIER run's fetch that isn't part of this
  // run's 100 most-recent posts is not in this payload at all, so it is untouched by both the
  // reset and by markCorpusExclusions, and its prior exclusion classification survives exactly as
  // the accumulation model intends.
  const { error: upsertError } = await admin.from("corpus_posts").upsert(
    posts.map((p) => ({
      experiment_id: experimentId,
      x_post_id: p.id,
      text: p.text,
      posted_at: p.date,
      like_count: p.likes,
      repost_count: p.reposts,
      is_long: p.long,
      media: p.media ?? [],
      excluded_off_beat: false,
      exclude_reason: null,
    })),
    { onConflict: "experiment_id,x_post_id" },
  );
  if (upsertError) throw upsertError;
}

export async function markCorpusExclusions(
  experimentId: string,
  postIds: string[],
  reason: string,
): Promise<void> {
  if (postIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("corpus_posts")
    .update({ excluded_off_beat: true, exclude_reason: reason })
    .eq("experiment_id", experimentId)
    .in("x_post_id", postIds);
  if (error) throw error;
}
