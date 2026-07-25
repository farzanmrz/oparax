// lib/voice/extraction-steps.ts
//
// Turns one polled `voice_extraction_runs` row into the three billable-phase steps both watching
// surfaces render. Pure and dependency-free (types only) so the create screen and the Voice tab
// import the SAME mapping rather than each inventing its own stage vocabulary — the two drifting
// apart is exactly how a pipeline ends up described two different ways in one product.
//
// The create screen prepends its own pre-flight gate steps to this list; the Voice tab renders it
// alone, because by the time a reporter is looking at that tab the gates have long since passed
// and left no record a poll could read.

import type { ExtractionStep } from "@/components/extraction-chain";

/** Stage names as written by lib/voice/extraction-run.ts, in pipeline order. A stage's index is
 *  how far the run has got; every step below that index is complete, the step at it is active. */
const STAGE_RANK: Record<string, number> = {
  starting: 0,
  corpus_fetch: 1,
  corpus_ready: 2,
  extracting: 3,
  materializing_rules: 4,
  done: 5,
  failed: -1,
};

/** Which step owns which stages. Index into this array IS the step's position in the chain. */
const STEPS = [
  { key: "corpus", label: "Reading recent posts", stages: [1, 2] },
  { key: "extract", label: "Learning how you write", stages: [3] },
  { key: "rules", label: "Saving your voice rules", stages: [4] },
] as const;

/** Reporter-facing sentence per terminal error code written by the spend phase. Anything
 *  unrecognised falls back rather than rendering a raw code at a human. */
const ERROR_COPY: Record<string, string> = {
  corpus_failed: "Couldn't read posts for this handle.",
  extraction_failed: "The extraction call didn't finish.",
  internal_error: "Something went wrong partway through.",
};

export type RunSnapshot = {
  stage: string | null;
  progressNote: string | null;
  status: string;
  errorCode: string | null;
};

export function pipelineSteps(run: RunSnapshot): ExtractionStep[] {
  const failed = run.status === "failed";
  const completed = run.status === "completed";
  // A failed run's `stage` is stamped "failed", which carries no position — so the LAST stage the
  // run actually reported is recovered from its error code instead. Without this the failure
  // would render against the first step regardless of how far the run really got.
  const failedAt = failed ? (run.errorCode === "corpus_failed" ? 1 : 3) : null;
  const rank =
    failedAt ?? (run.status === "none" ? -1 : (STAGE_RANK[run.stage ?? "starting"] ?? 0));

  return STEPS.map((step) => {
    const first = step.stages[0];
    const last = step.stages[step.stages.length - 1];

    if (completed) {
      return { key: step.key, label: step.label, detail: null, state: "complete" as const };
    }
    if (failed && failedAt !== null && failedAt >= first && failedAt <= last) {
      return {
        key: step.key,
        label: step.label,
        detail: ERROR_COPY[run.errorCode ?? ""] ?? "This step didn't finish.",
        state: "failed" as const,
      };
    }
    if (rank > last) {
      return { key: step.key, label: step.label, detail: null, state: "complete" as const };
    }
    if (rank >= first) {
      return {
        key: step.key,
        label: step.label,
        // The note is the live evidence the step is really moving ("Read 100 posts",
        // "4,812 chars generated") rather than a spinner asserting that it is.
        detail: run.progressNote,
        state: "active" as const,
      };
    }
    return { key: step.key, label: step.label, detail: null, state: "pending" as const };
  });
}
