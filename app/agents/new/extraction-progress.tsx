"use client";

// app/agents/new/extraction-progress.tsx
//
// The live panel create-desk-form.tsx renders BESIDE the form once a desk exists — it does not
// replace it. It STARTS the run itself and then polls the run row: a two-channel design forced by
// where the record lives.
//
// The handle-shape gate runs before any `voice_extraction_runs` row exists, so polling can never
// see it; awaiting `startExtraction` is the only way its outcome reaches a screen. Once it passes,
// that action claims the run and hands the billable phase to `after()`, so the run row becomes the
// channel and leaving this page never cancels extraction.
//
// This replaces a bare spinner that could not distinguish "still working" from "stopped 40 seconds
// ago for a specific reason", and whose 20-second grace timer then reported the honest but useless
// "We couldn't confirm your voice guide started building."
//
// A beforeunload listener warns while work looks in flight; leaving never cancels it. Modern
// browsers show their own generic copy and ignore any custom returnValue text — a platform
// limitation, not a bug here.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExtractionChain, type ExtractionStep } from "@/components/extraction-chain";
import { Button } from "@/components/ui/button";
import { pipelineSteps } from "@/lib/voice/extraction-steps";
import { useExtractionProgress } from "@/lib/voice/use-extraction-progress";
import { startExtraction } from "../[id]/voice/actions";

const POLL_INTERVAL_MS = 1750;

type GateState = {
  handle: ExtractionStep;
  /** Shown beneath the chain when something stopped the run. Null while healthy. */
  error: string | null;
  /** True once the gate passed, the run was claimed, and the billable phase was scheduled. */
  started: boolean;
};

const INITIAL_GATES: GateState = {
  handle: { key: "handle", label: "Checking the handle", detail: null, state: "active" },
  error: null,
  started: false,
};

export function ExtractionProgress({ deskId }: { readonly deskId: string }) {
  const router = useRouter();
  const [gates, setGates] = useState<GateState>(INITIAL_GATES);
  // Guards React StrictMode's double-invoked effects in dev: without it the start sequence runs
  // twice. The server-side run claim would reject the second one anyway, but the second call
  // would still surface as a spurious "already running" message on a screen that just started.
  const kickedOffRef = useRef(false);

  const start = useCallback(async () => {
    const started = await startExtraction(deskId);
    const handleGate = started.gates.find((g) => g.gate === "handle_shape");
    // Key the step off the GATE's own verdict, not off `started.ok`. They come apart in one real
    // case: the handle was fine but this caller lost the run claim because an extraction was
    // already in flight for the desk. Nothing failed there — reading `started.ok` as the step's
    // state would paint a passed check red and stop the poll while a paid run was genuinely
    // producing a guide.
    const handlePassed = handleGate?.status === "passed";
    setGates({
      handle: {
        ...INITIAL_GATES.handle,
        detail: handleGate?.detail ?? null,
        state: handlePassed ? "complete" : "failed",
      },
      // Either we claimed the run or someone else already had it — both mean the pipeline is live
      // and the run row is the thing to watch.
      error: started.ok || handlePassed ? null : started.message,
      started: started.ok || handlePassed,
    });
  }, [deskId]);

  useEffect(() => {
    if (kickedOffRef.current) return;
    kickedOffRef.current = true;
    start();
  }, [start]);

  // Polls only once the billable phase is actually running — before that there is no run row to
  // read, and polling for one would be the same "waiting on a signal that cannot arrive" bug the
  // gate step above exists to fix.
  const run = useExtractionProgress(deskId, {
    enabled: gates.started,
    intervalMs: POLL_INTERVAL_MS,
    immediate: true,
    initial: {
      stage: null,
      progressNote: null,
      reasoningPartial: null,
      status: "none",
      errorCode: null,
    },
    onResult: (result) => {
      if (result.status === "completed") router.push(`/agents/${deskId}/voice`);
    },
  });

  const stopped = gates.error !== null || run.status === "failed";

  useEffect(() => {
    if (stopped) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue =
        "Your voice guide is still being built. You can leave safely — it keeps running in the background.";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [stopped]);

  const steps: ExtractionStep[] = [
    { key: "created", label: "Agent created", detail: null, state: "complete" },
    gates.handle,
    ...pipelineSteps(run),
  ];

  return (
    // No measure cap here — the create page's grid column owns the width, so capping it twice
    // would just make the panel narrower than the space allotted to it.
    <div className="w-full">
      <ExtractionChain
        isStreaming={run.stage === "extracting"}
        reasoning={run.reasoningPartial}
        steps={steps}
        // A collapsible needs a label, and this one should not restate the page. When this view
        // replaced the whole form the h1 read "Building your voice guide" and the chain header
        // repeated it verbatim, so the screen looked like it had rendered its heading twice.
        title="Steps"
      />

      {stopped ? (
        <div className="mt-6 flex flex-col items-start gap-2 border-border border-t pt-5">
          {/* The reason itself is NOT repeated here — it is already on the failed step, in red,
              where it says which step it belongs to. This is only what to do about it. */}
          <p className="text-muted-foreground text-sm">
            Your agent is ready either way — you can retry from its Voice tab anytime.
          </p>
          <Button onClick={() => router.push(`/agents/${deskId}/voice`)} variant="outline">
            Continue to your agent
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-muted-foreground text-xs">
          You can leave this page — building your voice guide keeps running in the background.
        </p>
      )}
    </div>
  );
}
