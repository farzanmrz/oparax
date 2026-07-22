// scripts/extract-voice-guide.ts
//
// One-off runner for the L2 voice-extraction slice. Seeds an `experiments` row, stores a
// reporter's lab corpus in `source_posts`, runs the ~$0.86 extraction call, and writes the
// resulting guide to `voice_guides` + a `usage_events` stamp — all through the service-role
// admin client (every write target here is service-role-write only, by design).
//
// Usage:
//   pnpm dlx tsx --env-file=.env.local scripts/extract-voice-guide.ts <reporterHandle> <ownerEmail>
//
// DO NOT run this from an agent session — it makes a real ~$0.86 model call. A human runs it.
import { existsSync, readFileSync } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { deployGuide } from "@/lib/voice/deploy-guide";
import { type CorpusPost, EXTRACTION_MODEL, extractVoiceGuide } from "@/lib/voice/extract-guide";

/** X handles are [A-Za-z0-9_]; validating also keeps the CLI arg out of the file path. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function loadCorpus(handle: string, suffix: "" | "-train"): CorpusPost[] {
  const path = `.voice-lab/corpora/${handle}${suffix}.json`;
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Corpus file not found: ${path}. This script only supports reporters with a lab corpus ` +
        `under .voice-lab/corpora/ — a future reporter without one is when the Bright Data ` +
        `scrape path gets built.`,
    );
  }
  const posts = JSON.parse(raw) as CorpusPost[];
  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error(`Corpus file ${path} did not parse to a non-empty array.`);
  }
  return posts;
}

/**
 * Attach each post's reacted-to context from the Bright Data raw file, keyed by post id.
 * The extraction prompt describes every mode's "transformation" from this; without it that
 * dimension is unanswerable. Absent raw file → posts simply carry no reactingTo.
 */
function withReactionContext(handle: string, posts: CorpusPost[]): CorpusPost[] {
  const rawPath = `.voice-lab/corpora/${handle}-raw.json`;
  if (!existsSync(rawPath)) return posts;
  type RawRow = {
    id?: unknown;
    error_code?: unknown;
    quoted_post?: { description?: unknown; profile_name?: unknown; profile_id?: unknown } | null;
  };
  const rawById = new Map<string, RawRow>();
  for (const r of JSON.parse(readFileSync(rawPath, "utf8")) as RawRow[]) {
    if (r && typeof r === "object" && !r.error_code && r.id != null) {
      rawById.set(String(r.id), r);
    }
  }
  return posts.map((p) => {
    const q = rawById.get(String(p.id))?.quoted_post;
    const text = typeof q?.description === "string" ? q.description : "";
    if (text.trim().length <= 5) return p;
    const who = q?.profile_name ?? q?.profile_id;
    return { ...p, reactingTo: { handle: String(who ?? "unknown"), text } };
  });
}

async function main() {
  const [reporterHandle, ownerEmail] = process.argv.slice(2);
  if (!reporterHandle || !ownerEmail) {
    throw new Error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/extract-voice-guide.ts <reporterHandle> <ownerEmail>",
    );
  }
  if (!HANDLE_RE.test(reporterHandle)) {
    throw new Error(
      `Not a valid X handle: "${reporterHandle}" (expected [A-Za-z0-9_], 1-15 chars).`,
    );
  }

  // Load and validate the lab corpus BEFORE anything else — a bad path must fail in
  // milliseconds rather than after the ~$0.86 model call.
  const fullCorpus = loadCorpus(reporterHandle, "");
  const trainCorpus = withReactionContext(reporterHandle, loadCorpus(reporterHandle, "-train"));

  const admin = createAdminClient();

  const ownerId = await resolveOwnerId(admin, ownerEmail);

  // Seed the experiment. Idempotent by hand: the schema has no unique constraint on
  // (owner_id, reporter_handle), so select-then-insert, and never overwrite an existing
  // row — beat/tracked_handles may have been set by the app and are not ours to clobber.
  const { data: existingExperiments, error: existingExperimentError } = await admin
    .from("experiments")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("reporter_handle", reporterHandle)
    .order("created_at", { ascending: true })
    .limit(1);
  if (existingExperimentError) throw existingExperimentError;

  if (!existingExperiments?.length) {
    const { error } = await admin.from("experiments").insert({
      owner_id: ownerId,
      beat: `@${reporterHandle}'s beat`,
      reporter_handle: reporterHandle,
      tracked_handles: [],
    });
    if (error) throw error;
  }

  // Store the full corpus in source_posts (deny-all table, service-role write). Deduped by
  // x_post_id first: one ON CONFLICT batch cannot touch the same row twice.
  const byPostId = new Map<string, (typeof fullCorpus)[number]>();
  for (const p of fullCorpus) byPostId.set(String(p.id), p);
  const sourcePostRows = [...byPostId.values()].map((p) => ({
    x_post_id: String(p.id),
    author_handle: reporterHandle,
    text: p.text,
    posted_at: p.date,
    raw: p as unknown as Json,
  }));
  const { error: sourcePostsError } = await admin
    .from("source_posts")
    .upsert(sourcePostRows, { onConflict: "x_post_id" });
  if (sourcePostsError) throw sourcePostsError;

  // The paid call.
  const ext = await extractVoiceGuide(reporterHandle, trainCorpus);

  // Print BEFORE any DB write. Everything below can fail on a transient error, and a lost
  // write must never mean a lost ~$0.67 extraction — stdout is the recovery copy. The trace
  // prints too: it is the audit trail of the judgment we paid for.
  console.log("----- BEGIN REASONING -----");
  console.log(ext.reasoning ?? "(none returned)");
  console.log("----- END REASONING -----");
  console.log("----- BEGIN GUIDE (raw) -----");
  console.log(ext.guideRaw);
  console.log("----- END GUIDE (raw) -----");

  // The model-call ledger FIRST: one row per model call, carrying its output AND its
  // reasoning trace, whatever the stage and however many models run (decisions.md L12).
  // Written before the artifact so the record of the call survives an artifact-write failure.
  const { data: modelCall, error: modelCallError } = await admin
    .from("model_calls")
    .insert({
      owner_id: ownerId,
      stage: "voice_extraction",
      role: "primary",
      model: EXTRACTION_MODEL,
      output: ext.guideRaw,
      reasoning: ext.reasoning,
      // reasoningWithheldByProvider distinguishes "the provider gave us no trace" from "we
      // forgot to capture one" — a null reasoning column cannot otherwise tell them apart,
      // and that ambiguity is exactly what hid the original gap.
      usage: {
        ...(ext.usage as object),
        thinkingTokens: ext.thinkingTokens,
        reasoningWithheldByProvider: ext.reasoning == null,
      } as unknown as Json,
      cost_usd: ext.costUsd,
      generation_id: ext.generationId,
      ref_kind: "reporter_handle",
      ref_id: reporterHandle,
    })
    .select("id")
    .single();
  if (modelCallError) throw modelCallError;

  // Write the guide. Provenance is a POINTER, not a second copy — the call's output,
  // reasoning, usage and cost have exactly one home, in model_calls.
  const { error: voiceGuideError } = await admin.from("voice_guides").upsert(
    {
      reporter_handle: reporterHandle,
      guide_raw: ext.guideRaw,
      guide_deploy: deployGuide(ext.guideRaw),
      measured_facts: ext.measuredFactsBlock,
      cost_usd: ext.costUsd,
      provenance: { modelCallId: modelCall.id } as unknown as Json,
    },
    { onConflict: "reporter_handle" },
  );
  if (voiceGuideError) throw voiceGuideError;

  // Stamp the metering ledger — every model call is recorded from the first commit.
  const { error: usageEventError } = await admin.from("usage_events").insert({
    owner_id: ownerId,
    kind: "voice_extraction",
    units: 1,
    cost_usd: ext.costUsd,
    ref_id: reporterHandle,
  });
  if (usageEventError) throw usageEventError;

  // Prove the run: thinkingTokens > 0 shows adaptive thinking actually ran (a 200 alone
  // never proves a provider honoured a param), and costUsd must come back non-null.
  const corpusChars = trainCorpus.reduce((sum, p) => sum + p.text.length, 0);
  console.log(
    `${reporterHandle}  ${trainCorpus.length} posts, ${corpusChars}ch in -> ${ext.guideRaw.length}ch guide`,
  );
  console.log(
    `thinkingTokens=${ext.thinkingTokens}  reasoningChars=${ext.reasoning?.length ?? 0}  costUsd=${ext.costUsd}`,
  );
}

async function resolveOwnerId(
  admin: ReturnType<typeof createAdminClient>,
  ownerEmail: string,
): Promise<string> {
  const wanted = ownerEmail.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error(`No auth.users row found for email "${ownerEmail}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
