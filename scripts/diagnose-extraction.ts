// scripts/diagnose-extraction.ts
//
// Records an extraction run PART BY PART, verbatim, to answer one open question: a live run
// returned finishReason "stop", 9,443 thinking tokens, $0.31 billed — and zero characters of
// guide. A previous session called that "nondeterminism" and was right to be overruled: three
// variables differed between the failing run and a working hand-rolled probe (which function,
// which prompt, which corpus size) and none were isolated, and nothing ever proved the failing
// run emitted zero TEXT deltas specifically — its progress callback fired on text OR reasoning
// deltas, so "first delta at 6.4s" may only ever have been reasoning.
//
// So this script changes exactly ONE thing about a real run: it attaches an observer. It calls
// the production `extractVoiceGuideStreaming` on a production `fetchCorpus` pull, with the
// production prompt and provider options. Anything it observes is a fact about the real path,
// not about a reconstruction of it.
//
// What it records, per part, in arrival order: type, elapsed ms, and the FULL text of every
// text/reasoning delta — not a length, not a sample. Lifecycle parts (start, start-step,
// text-start/-end, reasoning-start/-end, finish-step, finish, error, abort) are recorded with
// their entire payload. A part type this script has never seen is still recorded in full,
// because the whole point is to stop inferring the stream from an accumulation of it.
//
// It also runs with NO `maxOutputTokens` — the production module now sends no ceiling (see
// EXTRACT_MAX_OUTPUT_TOKENS). Under adaptive thinking the model sizes its own budget, so a number
// there can only ever be too small. Whether omitting it makes the gateway substitute a provider
// default is not assumed either way: `finishReason` and `usage.outputTokens` are read back from
// the run and printed, because a request shape is not evidence of what the provider did with it.
//
// PAID. One real Opus 5 extraction, ~$0.31 observed. It writes NOTHING to the database — no
// model_calls row, no voice_guides row, no usage_events row, no run row. It is a probe, not the
// pipeline: the pipeline's own ledger discipline belongs to runExtractionSpendPhase, and having a
// second writer for the same stage is how two sources of truth start.
//
// Usage:
//   pnpm dlx tsx --env-file=.env.local scripts/diagnose-extraction.ts [--handle=X] [--posts=N] [--runs=N]
//
//   --handle  reporter to extract (default ReshadRahman — the handle the failure was seen on)
//   --posts   truncate the corpus to the N most recent posts (default: all 100). Bisect with
//             this if an empty guide reproduces at 100 and not at 80: that would point at input
//             length, which is a cause, where "nondeterminism" is only ever a label for not
//             having found one.
//   --runs    repeat N times (default 1). Call-to-call variance is a claim about a
//             DISTRIBUTION — a single success does not refute a one-off empty completion, and
//             saying so from one run is the mistake this script exists to stop repeating.
//
// Every run writes a JSONL transcript to .diag/ (gitignored) — one JSON object per part, so a
// 20k-part stream can be grepped and counted rather than scrolled.
import { mkdirSync, writeFileSync } from "node:fs";
import * as Sentry from "@sentry/nextjs";
import { extractionConversationId } from "@/lib/observability/ai-conversation";
import { withAiSpan } from "@/lib/observability/ai-telemetry";
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_DSN,
  TRACES_SAMPLE_RATE,
} from "@/lib/observability/sentry-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCorpus } from "@/lib/voice/corpus";
import { type CorpusPost, extractVoiceGuideStreaming } from "@/lib/voice/extract-guide";

type RecordedPart = {
  /** Arrival index — the stream's own ordering, which an accumulated total destroys. */
  i: number;
  /** Milliseconds since the streamText call was issued. */
  ms: number;
  type: string;
  /** Every field of the part except `type`, verbatim and untruncated. */
  payload: Record<string, unknown>;
};

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

/** Node's error serialization drops `message`/`stack` under JSON.stringify (they are
 *  non-enumerable), so an `error` part would record as `{}` — the single most important part type
 *  in this whole transcript, silently emptied. */
function serializable(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

async function runOnce(
  handle: string,
  corpus: CorpusPost[],
  runIndex: number,
  totalRuns: number,
): Promise<void> {
  const parts: RecordedPart[] = [];
  const counts = new Map<string, number>();
  const startedAt = Date.now();
  const stampSeed = `${runIndex + 1}-${startedAt}`;
  let firstTextDeltaMs: number | null = null;
  let firstReasoningDeltaMs: number | null = null;
  let textDeltaChars = 0;
  let reasoningDeltaChars = 0;

  const label = totalRuns > 1 ? `run ${runIndex + 1}/${totalRuns}` : "run";
  console.log(`\n▶ ${label}: extracting @${handle} from ${corpus.length} posts…`);

  const record = (part: Record<string, unknown> & { type: string }) => {
    const ms = Date.now() - startedAt;
    const { type, ...rest } = part;
    counts.set(type, (counts.get(type) ?? 0) + 1);

    if (type === "text-delta" && typeof rest.text === "string") {
      firstTextDeltaMs ??= ms;
      textDeltaChars += rest.text.length;
    } else if (type === "reasoning-delta" && typeof rest.text === "string") {
      firstReasoningDeltaMs ??= ms;
      reasoningDeltaChars += rest.text.length;
    }

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) payload[k] = serializable(v);
    parts.push({ i: parts.length, ms, type, payload });
  };

  let failure: unknown;
  let result: Awaited<ReturnType<typeof extractVoiceGuideStreaming>> | undefined;
  try {
    // Wrapped exactly as runExtractionSpendPhase wraps it, so the spans this produces in Sentry
    // are the same shape the app produces — a probe whose telemetry differs from production's
    // proves nothing about production.
    result = await withAiSpan(
      {
        name: "invoke_agent voice-extraction",
        conversationId: extractionConversationId(`diag-${stampSeed}`),
        attributes: {
          "gen_ai.agent.name": "voice-extraction",
          "oparax.handle": handle,
          "oparax.corpus_posts": corpus.length,
          "oparax.diagnostic": true,
        },
      },
      () => extractVoiceGuideStreaming(handle, corpus, "", undefined, record),
    );
  } catch (e) {
    failure = e;
  }
  const wallMs = Date.now() - startedAt;

  const stamp = `${handle}-${corpus.length}posts-r${runIndex + 1}-${startedAt}`;
  mkdirSync(".diag", { recursive: true });
  const transcriptPath = `.diag/${stamp}.jsonl`;
  writeFileSync(transcriptPath, `${parts.map((p) => JSON.stringify(p)).join("\n")}\n`);

  const summary = {
    handle,
    posts: corpus.length,
    wallMs,
    // The question the old instrumentation could not answer: did any TEXT arrive at all, as
    // distinct from reasoning?
    firstTextDeltaMs,
    firstReasoningDeltaMs,
    textDeltaChars,
    reasoningDeltaChars,
    partCounts: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
    // Read back from the run, not from the request — a ceiling that was never sent can still be
    // applied downstream, and `"length"` here is what would prove it.
    finishReason: result?.finishReason ?? null,
    usage: result?.usage ?? null,
    thinkingTokens: result?.thinkingTokens ?? null,
    costUsd: result?.costUsd ?? null,
    guideChars: result?.guideRaw.length ?? null,
    reasoningChars: result?.reasoning?.length ?? null,
    error: failure ? serializable(failure) : null,
  };
  writeFileSync(`.diag/${stamp}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  if (result?.guideRaw) writeFileSync(`.diag/${stamp}.guide.md`, result.guideRaw);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`  transcript → ${transcriptPath} (${parts.length} parts)`);
  if (result && !result.guideRaw.trim()) {
    console.log(
      `  ⚠ EMPTY GUIDE reproduced. text-delta parts: ${counts.get("text-delta") ?? 0}, ` +
        `text-start: ${counts.get("text-start") ?? 0}, finishReason: ${result.finishReason}`,
    );
  }
}

async function main(): Promise<void> {
  // The app initializes Sentry through instrumentation.ts; a standalone script has to do it
  // itself. AI spans need nothing further: `vercelAIIntegration` is a DEFAULT integration in the
  // Node SDK, and its v7 path is a diagnostics-channel subscriber (see sentry.server.config.ts's
  // integration comment) with no import-order requirement — so this script's spans are identical
  // in shape to the app's, which is the property that makes probing here evidence about there.
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    dataCollection: SENTRY_DATA_COLLECTION,
    enableLogs: true,
    environment: "diagnostic",
  });

  const handle = arg("handle") ?? "ReshadRahman";
  const posts = Number(arg("posts") ?? "0");
  const runs = Math.max(1, Number(arg("runs") ?? "1"));

  // fetchCorpus needs an owner only to stamp the read into usage_events; the corpus read itself
  // uses the app-only bearer, so it is the same read the app makes. Resolved from the newest desk
  // the same way scripts/verify-externals.ts scopes its probes.
  const admin = createAdminClient();
  const { data: owner, error: ownerError } = await admin
    .from("agents")
    .select("owner_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) throw new Error("no agents row to meter the corpus read against");
  const ownerId = owner.owner_id;

  console.log(`Pulling corpus for @${handle}…`);
  const full = await fetchCorpus(handle, ownerId);
  const corpus = posts > 0 ? full.slice(0, posts) : full;
  console.log(`  ${full.length} posts pulled, using ${corpus.length}.`);

  for (let i = 0; i < runs; i++) await runOnce(handle, corpus, i, runs);

  // Sentry batches; a script that exits immediately loses everything it just recorded. This is
  // the single most common reason a correctly-instrumented script reports nothing.
  console.log("\nflushing telemetry to Sentry…");
  const flushed = await Sentry.flush(15_000);
  console.log(flushed ? "  flushed." : "  ⚠ flush TIMED OUT — spans may be missing in Sentry.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
