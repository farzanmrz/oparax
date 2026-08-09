// SERVER-ONLY: corpus_posts is deny-all and writes belong to the service-role extraction path.
import { createAdminClient } from "@/lib/supabase/admin";
import type { CorpusPost } from "./extract-guide";

// OWNER DECISION: corpus_posts is the owner's accumulating DATA SET for a desk, not a snapshot
// of the latest extraction. A re-extraction NEVER deletes previously stored posts — it only adds
// posts not already present and refreshes the ones that are. X's timeline read returns the 100
// most recent original posts, so consecutive extractions overlap heavily; treating each run as a
// replacement would discard history the owner wants kept. The `unique (agent_id, x_post_id)`
// constraint (see the corpus_posts migration) is what makes a re-extraction idempotent: an upsert
// on that conflict target inserts posts the desk has never seen and refreshes engagement/text on
// posts it has, without ever touching a row outside this run's fetch. A failed upsert leaves
// everything previously stored for this desk fully intact — there is no delete step to have run
// first or to run after, so there is no window where a failure can leave the desk with fewer
// rows than it had before the call.
export async function accumulateCorpus(agentId: string, posts: CorpusPost[]): Promise<void> {
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
      agent_id: agentId,
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
    { onConflict: "agent_id,x_post_id" },
  );
  if (upsertError) throw upsertError;
}

/** How long a stored corpus stays reusable. OWNER DECISION: a reporter's writing voice does not
 *  meaningfully change month to month, so re-reading the same timeline from X for every
 *  extraction of the same handle buys nothing and spends a rate-limited third-party call every
 *  time — most visibly when one handle (an admin test account, or a reporter with several desks)
 *  is extracted repeatedly. A month is deliberately conservative against that reasoning. */
const CORPUS_REUSE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Cap matches lib/x/timeline.ts's MAX_POSTS — a reused corpus must be the same SIZE as a freshly
 *  read one, or the measured facts (and `inferAccountTier`, which needs to SEE a long post) are
 *  computed over a different sample than a fresh run would use. */
const REUSED_CORPUS_LIMIT = 50;

function toCorpusPostRow(row: {
  x_post_id: string;
  text: string;
  posted_at: string;
  like_count: number;
  repost_count: number;
  is_long: boolean;
  media: unknown;
}): CorpusPost {
  return {
    id: row.x_post_id,
    date: row.posted_at,
    text: row.text,
    likes: row.like_count,
    reposts: row.repost_count,
    long: row.is_long,
    media: Array.isArray(row.media) ? (row.media as CorpusPost["media"]) : [],
  };
}

/**
 * The already-stored corpus for THIS REPORTER, from any desk that has extracted them, when it is
 * recent enough to stand in for a fresh X read — else null, and the caller reads X as before.
 *
 * Keyed by reporter handle rather than by desk on purpose: `corpus_posts` rows belong to a desk,
 * but the timeline they came from belongs to the reporter, so a second desk on the same reporter
 * would otherwise re-read a timeline the product already holds. This shares the raw PUBLIC POSTS
 * only — never a voice guide or rules, which stay per-desk because each desk's beat scopes and
 * edits them differently (an explicitly rejected earlier idea).
 *
 * Freshness is judged by the newest row's `created_at` — when this handle's corpus was last
 * WRITTEN, not when its newest post was published. That errs toward re-reading: a dormant
 * reporter's corpus stops being refreshed, its `created_at` ages out, and the next extraction
 * pulls from X again rather than reusing indefinitely.
 *
 * Best-effort by design: any read failure returns null (read X instead), because a cache miss
 * must never be able to fail an extraction that would otherwise have worked.
 */
export async function findReusableCorpus(
  reporterHandle: string,
  now = Date.now(),
): Promise<{ posts: CorpusPost[]; sourceAgentId: string; pulledAt: string } | null> {
  try {
    const admin = createAdminClient();
    const wanted = reporterHandle.trim().toLowerCase();
    // `ilike` is the case-insensitive match Postgres offers, but it also treats `_` as a
    // single-character WILDCARD — and an underscore is legal in an X handle, so `foo_bar` would
    // match `fooXbar`'s desks too. The pattern stays a deliberate superset and the exact
    // comparison happens here, where `_` is just a character.
    const { data: deskRows, error: deskError } = await admin
      .from("agents")
      .select("id, reporter_handle")
      .ilike("reporter_handle", reporterHandle);
    if (deskError) throw deskError;
    const deskIds = (deskRows ?? [])
      .filter((row) => row.reporter_handle.trim().toLowerCase() === wanted)
      .map((row) => row.id);
    if (deskIds.length === 0) return null;

    // The freshest corpus row across this reporter's desks identifies BOTH whether a reusable
    // corpus exists and which desk's rows to read. Picking one desk rather than merging several
    // keeps the reused corpus identical in shape to what a single X read produces.
    const { data: newest, error: newestError } = await admin
      .from("corpus_posts")
      .select("agent_id, created_at")
      .in("agent_id", deskIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (newestError) throw newestError;
    if (!newest) return null;
    if (now - new Date(newest.created_at).getTime() > CORPUS_REUSE_MAX_AGE_MS) return null;

    const { data: rows, error: rowsError } = await admin
      .from("corpus_posts")
      .select("x_post_id, text, posted_at, like_count, repost_count, is_long, media")
      .eq("agent_id", newest.agent_id)
      .order("posted_at", { ascending: false })
      .limit(REUSED_CORPUS_LIMIT);
    if (rowsError) throw rowsError;

    const posts = (rows ?? []).map(toCorpusPostRow);
    // A stored corpus with no usable text is a broken cache, not a saving — a fresh read might
    // succeed where whatever produced this did not. Mirrors the caller's own empty-corpus guard.
    if (!posts.some((p) => p.text.trim())) return null;

    return { posts, sourceAgentId: newest.agent_id, pulledAt: newest.created_at };
  } catch (e) {
    console.error(`findReusableCorpus: lookup failed for @${reporterHandle}`, e);
    return null;
  }
}

export async function markCorpusExclusions(
  agentId: string,
  postIds: string[],
  reason: string,
): Promise<void> {
  if (postIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("corpus_posts")
    .update({ excluded_off_beat: true, exclude_reason: reason })
    .eq("agent_id", agentId)
    .in("x_post_id", postIds);
  if (error) throw error;
}
