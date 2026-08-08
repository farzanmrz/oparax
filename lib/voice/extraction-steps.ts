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
  starting: 1,
  corpus_fetch: 1,
  corpus_ready: 2,
  scoping: 3,
  extracting: 4,
  materializing_rules: 5,
  done: 6,
  failed: -1,
};

/** Which step owns which stages. Index into this array IS the step's position in the chain. */
const STEPS = [
  {
    key: "corpus",
    label: "Reading recent posts",
    failedLabel: "Couldn't read recent posts",
    stages: [1, 2],
  },
  // The model's own off-beat pass (exclude_off_beat_posts) — a real, observable step, not a
  // sub-phase of extraction: it is where the binding measured facts get recomputed, and a
  // reporter watching deserves to see that their gaming posts were set aside deliberately.
  {
    key: "scope",
    label: "Working out your beat",
    failedLabel: "Couldn't work out your beat",
    stages: [3],
  },
  {
    key: "extract",
    label: "Learning how you write",
    failedLabel: "Couldn't learn how you write",
    stages: [4],
  },
  {
    key: "rules",
    label: "Saving your voice rules",
    failedLabel: "Couldn't save your voice rules",
    stages: [5],
  },
] as const;

export type RunSnapshot = {
  stage: string | null;
  status: string;
  errorCode: string | null;
  corpusPostCount?: number;
  scopeExcludedCount?: number;
};

function completedLabel(stepKey: (typeof STEPS)[number]["key"], run: RunSnapshot): string {
  switch (stepKey) {
    case "corpus":
      return run.corpusPostCount === undefined
        ? "Read recent posts"
        : `Read ${run.corpusPostCount} ${run.corpusPostCount === 1 ? "post" : "posts"}`;
    case "scope":
      return run.scopeExcludedCount === undefined
        ? "Worked out your beat"
        : `Worked out your beat (Ignored ${run.scopeExcludedCount} unrelated ${run.scopeExcludedCount === 1 ? "post" : "posts"})`;
    case "extract":
      return "Learned how you write";
    case "rules":
      return "Saved your voice rules";
  }
}

export function pipelineSteps(run: RunSnapshot): ExtractionStep[] {
  const failed = run.status === "failed";
  const completed = run.status === "completed";
  // New failures retain the last real stage. Older rows stamped with the legacy `failed` stage
  // fall back to the error code so their recovery UI remains intelligible.
  const failedAt = failed
    ? run.stage && run.stage !== "failed"
      ? (STAGE_RANK[run.stage] ?? 0)
      : run.errorCode === "corpus_failed" || run.errorCode === "empty_corpus"
        ? 1
        : 4
    : null;
  const rank =
    failedAt ?? (run.status === "none" ? -1 : (STAGE_RANK[run.stage ?? "starting"] ?? 0));

  return STEPS.map((step) => {
    const first = step.stages[0];
    const last = step.stages[step.stages.length - 1];

    if (completed) {
      return { key: step.key, label: completedLabel(step.key, run), state: "complete" as const };
    }
    if (failed && failedAt !== null && failedAt >= first && failedAt <= last) {
      return {
        key: step.key,
        label: step.failedLabel,
        state: "failed" as const,
      };
    }
    if (rank > last) {
      return { key: step.key, label: completedLabel(step.key, run), state: "complete" as const };
    }
    if (rank >= first) {
      return {
        key: step.key,
        label: step.label,
        state: "active" as const,
      };
    }
    return { key: step.key, label: step.label, state: "pending" as const };
  });
}
