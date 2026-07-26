"use client";

// app/agents/[id]/voice/extraction-progress.tsx
//
// The Voice tab's "no guide yet, but extraction is already running" state: a reporter can
// navigate here while the background extraction started from the create screen is still in
// flight. Polls `getExtractionProgress` and renders the same `ExtractionChain` the create screen
// does, so the pipeline is described identically in both places.
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
import { pipelineSteps } from "@/lib/voice/extraction-steps";
import { useExtractionProgress } from "@/lib/voice/use-extraction-progress";

const POLL_INTERVAL_MS = 2000;

export function ExtractionProgress({
  deskId,
  reporterHandle,
  initialStage,
  initialProgressNote,
  initialReasoningPartial,
}: {
  readonly deskId: string;
  readonly reporterHandle: string;
  readonly initialStage: string | null;
  readonly initialProgressNote: string | null;
  readonly initialReasoningPartial: string | null;
}) {
  const router = useRouter();
  const run = useExtractionProgress(deskId, {
    enabled: true,
    intervalMs: POLL_INTERVAL_MS,
    immediate: false,
    initial: {
      stage: initialStage,
      progressNote: initialProgressNote,
      reasoningPartial: initialReasoningPartial,
      status: "running",
      errorCode: null,
    },
    onResult: (result, stop) => {
      if (result.status !== "running") {
        stop();
        router.refresh();
      }
    },
  });

  return (
    <div className="rounded-xl border border-border px-4 py-6">
      <ExtractionChain
        isStreaming={run.stage === "extracting"}
        reasoning={run.reasoningPartial}
        steps={pipelineSteps(run)}
        title={`Building the writing guide for @${reporterHandle}`}
      />
    </div>
  );
}
