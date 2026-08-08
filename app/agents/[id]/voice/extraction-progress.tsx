"use client";

// app/agents/[id]/voice/extraction-progress.tsx
//
// The Voice tab's "no guide yet, but extraction is already running" state: a reporter can
// navigate here while the background extraction started from the create form is still in
// flight. Polls `getExtractionProgress` and renders the same `ExtractionChain` as Feed, so the
// pipeline is described identically in both places.
//
// It renders only the billable-phase steps, and that is not an omission: the pre-flight gates run
// before a `voice_extraction_runs` row exists, so there is nothing here for a poll to recover.
// By the time this view is reachable those gates have long since passed anyway.
//
// A terminal status ("completed" / "failed" / a run row that never existed) stops the poll and
// calls router.refresh(), so the page's server-rendered guide section — or the static empty state
// on a failure — picks up the finished result on the next render.

import { useRouter } from "next/navigation";
import { ExtractionChain } from "@/components/extraction-chain";
import type {
  ExtractionReasoningByStage,
  ExtractionTextByStage,
  ExtractionToolActivity,
} from "@/lib/voice/extraction-progress-reasoning";
import { pipelineSteps } from "@/lib/voice/extraction-steps";
import { useExtractionProgress } from "@/lib/voice/use-extraction-progress";

const POLL_INTERVAL_MS = 2000;
const COMPLETION_HOLD_MS = 1500;

export function ExtractionProgress({
  deskId,
  initialStage,
  initialProgressNote,
  initialReasoningByStage,
  initialTextByStage,
  initialToolActivities,
  initialCorpusPostCount,
  initialScopeExcludedCount,
}: {
  readonly deskId: string;
  readonly initialStage: string | null;
  readonly initialProgressNote: string | null;
  readonly initialReasoningByStage: ExtractionReasoningByStage;
  readonly initialTextByStage: ExtractionTextByStage;
  readonly initialToolActivities: ExtractionToolActivity[];
  readonly initialCorpusPostCount?: number;
  readonly initialScopeExcludedCount?: number;
}) {
  const router = useRouter();
  const run = useExtractionProgress(deskId, {
    enabled: true,
    intervalMs: POLL_INTERVAL_MS,
    immediate: false,
    initial: {
      stage: initialStage,
      progressNote: initialProgressNote,
      reasoningByStage: initialReasoningByStage,
      textByStage: initialTextByStage,
      toolActivities: initialToolActivities,
      status: "running",
      errorCode: null,
      corpusPostCount: initialCorpusPostCount,
      scopeExcludedCount: initialScopeExcludedCount,
    },
    onResult: (result, stop) => {
      if (result.status === "completed") {
        stop();
        window.setTimeout(() => router.replace(`/agents/${deskId}`), COMPLETION_HOLD_MS);
        return;
      }

      if (result.status !== "running") {
        stop();
        router.refresh();
      }
    },
  });

  return (
    <ExtractionChain
      isStreaming={run.status === "running"}
      reasoningByStage={run.reasoningByStage}
      steps={pipelineSteps(run)}
      textByStage={run.textByStage}
      toolActivities={run.toolActivities}
    />
  );
}
