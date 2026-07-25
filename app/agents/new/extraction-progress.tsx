"use client";

// app/agents/new/extraction-progress.tsx
//
// The live view create-desk-form.tsx swaps in once a desk exists. It DRIVES the pre-flight gates
// itself and then polls the run row — a two-channel design forced by where the record lives.
//
// The gates (handle shape, then the billable profile lookup) run before any
// `voice_extraction_runs` row exists, so polling can never see them. This component awaits them
// one at a time, which is also what lets the slow one show as in-flight on its own step rather
// than the whole set appearing at once when the last returns. Once they pass, `startExtraction`
// hands the billable phase to `after()` and the run row becomes the channel — so leaving this
// page never cancels extraction, exactly as before.
//
// This replaces a bare spinner that could not distinguish "still working" from "stopped 40
// seconds ago for a specific reason", and whose 20-second grace timer then reported the honest
// but useless "We couldn't confirm your voice guide started building."
//
// A beforeunload listener warns while work looks in flight; leaving never cancels it. Modern
// browsers show their own generic copy and ignore any custom returnValue text — a platform
// limitation, not a bug here.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExtractionChain, type ExtractionStep } from "@/components/extraction-chain";
import { Button } from "@/components/ui/button";
import { pipelineSteps } from "@/lib/voice/extraction-steps";
import {
  checkExtractionReadiness,
  getExtractionProgress,
  startExtraction,
} from "../[id]/voice/actions";

const POLL_INTERVAL_MS = 1750;

type GateState = {
  handle: ExtractionStep;
  profile: ExtractionStep;
  /** The message shown beneath the chain when a gate stopped the run. Null while healthy. */
  error: string | null;
  /** True once both gates passed and the billable phase was handed to `after()`. */
  started: boolean;
};

const INITIAL_GATES: GateState = {
  handle: { key: "handle", label: "Checking the handle", detail: null, state: "active" },
  profile: { key: "profile", label: "Finding the X profile", detail: null, state: "pending" },
  error: null,
  started: false,
};

export function ExtractionProgress({ deskId }: { readonly deskId: string }) {
  const router = useRouter();
  const [gates, setGates] = useState<GateState>(INITIAL_GATES);
  const [run, setRun] = useState({
    stage: null as string | null,
    progressNote: null as string | null,
    reasoningPartial: null as string | null,
    status: "none",
    errorCode: null as string | null,
  });
  // Guards React 18/19 StrictMode's double-invoked effects in dev: without it the gate sequence
  // runs twice and the second pass spends a SECOND billable profile lookup.
  const kickedOffRef = useRef(false);

  const runGates = useCallback(async () => {
    const readiness = await checkExtractionReadiness(deskId);
    const handleGate = readiness.gates.find((g) => g.gate === "handle_shape");
    if (!readiness.ok) {
      setGates((prev) => ({
        ...prev,
        handle: {
          ...prev.handle,
          detail: handleGate?.detail ?? null,
          state: handleGate?.status === "failed" ? "failed" : "complete",
        },
        profile: { ...prev.profile, state: "pending" },
        error: readiness.message,
      }));
      return;
    }
    setGates((prev) => ({
      ...prev,
      handle: { ...prev.handle, detail: handleGate?.detail ?? null, state: "complete" },
      profile: { ...prev.profile, state: "active" },
    }));

    const started = await startExtraction(deskId);
    const profileGate = started.gates.find((g) => g.gate === "profile_lookup");

    // Key the step off the GATE's own verdict, not off `started.ok`. They come apart in one real
    // case: the profile lookup PASSED but this caller lost the run claim because an extraction
    // was already in flight for the desk. `started.ok` is false there, yet nothing failed —
    // reading it as the step's state would paint a passed check red and stop the poll while a
    // paid extraction was genuinely running and about to produce a guide.
    const profilePassed = profileGate?.status === "passed";
    setGates((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        detail: profileGate?.detail ?? null,
        state: profilePassed ? "complete" : "failed",
      },
      // Either we claimed the run or someone else already had it — both mean the pipeline is live
      // and the run row is the thing to watch, so poll and show no error.
      error: started.ok || profilePassed ? null : started.message,
      started: started.ok || profilePassed,
    }));
  }, [deskId]);

  useEffect(() => {
    if (kickedOffRef.current) return;
    kickedOffRef.current = true;
    runGates();
  }, [runGates]);

  // Polls only once the billable phase is actually running — before that there is no run row to
  // read, and polling for one would be the same "waiting on a signal that cannot arrive" bug the
  // gate steps above exist to fix.
  useEffect(() => {
    if (!gates.started) return;
    let cancelled = false;

    async function poll() {
      const result = await getExtractionProgress(deskId);
      if (cancelled || !result.ok) return;
      setRun({
        stage: result.stage,
        progressNote: result.progressNote,
        reasoningPartial: result.reasoningPartial,
        status: result.status,
        errorCode: result.errorCode,
      });
      if (result.status === "completed") router.push(`/agents/${deskId}/voice`);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deskId, gates.started, router]);

  const inFlight = gates.error === null && run.status !== "failed" && run.status !== "completed";

  useEffect(() => {
    if (!inFlight) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue =
        "Your voice guide is still being built. You can leave safely — it keeps running in the background.";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [inFlight]);

  const steps: ExtractionStep[] = [
    { key: "created", label: "Agent created", detail: null, state: "complete" },
    gates.handle,
    gates.profile,
    ...pipelineSteps(run),
  ];

  const stopped = gates.error !== null || run.status === "failed";

  return (
    <div className="flex flex-col gap-5">
      <ExtractionChain
        isStreaming={run.stage === "extracting"}
        reasoning={run.reasoningPartial}
        steps={steps}
        title="Building your voice guide"
      />

      {stopped ? (
        <div className="flex flex-col items-start gap-2">
          {gates.error ? <p className="text-foreground text-sm">{gates.error}</p> : null}
          <p className="text-muted-foreground text-sm">
            Your agent is ready either way — you can retry from its Voice tab anytime.
          </p>
          <Button onClick={() => router.push(`/agents/${deskId}/voice`)} variant="outline">
            Continue to your agent
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          You can leave this page — building your voice guide keeps running in the background.
        </p>
      )}
    </div>
  );
}
