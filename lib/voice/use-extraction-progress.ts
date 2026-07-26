"use client";

// lib/voice/use-extraction-progress.ts
//
// Shared poll loop for `voice_extraction_runs` progress, used by both watching surfaces —
// the create screen's `app/agents/new/extraction-progress.tsx` and the Voice tab's
// `app/agents/[id]/voice/extraction-progress.tsx`. Both call `getExtractionProgress(deskId)`
// on an interval and spread the same five fields into local state before branching on
// terminal status; this hook is that shared plumbing so the poll loop is never written twice.
//
// The two callers differ in exactly the ways their `options` capture: whether polling is
// gated on something else first (`enabled`), whether the first poll fires immediately or
// waits one interval (`immediate`), and what happens on a terminal result (`onResult`, which
// receives a `stop()` it can call to end polling early — mirroring the Voice tab's
// `settledRef` + `clearInterval` on a terminal status, while the create screen never calls
// it and keeps polling until the component unmounts).
import { useEffect, useRef, useState } from "react";
import { getExtractionProgress } from "@/app/agents/[id]/voice/actions";

type ExtractionProgressResult = Awaited<ReturnType<typeof getExtractionProgress>>;

export type ExtractionProgressState = {
  stage: string | null;
  progressNote: string | null;
  reasoningPartial: string | null;
  status: string;
  errorCode: string | null;
};

export function useExtractionProgress(
  deskId: string,
  options: {
    /** Whether the poll loop should be running at all. */
    enabled: boolean;
    intervalMs: number;
    /** Whether the first poll fires immediately, or waits one `intervalMs` like the rest. */
    immediate: boolean;
    initial: ExtractionProgressState;
    /** Called after each successful poll with the raw result and a `stop()` callback the
     *  caller can invoke to end polling early (e.g. on a terminal status). */
    onResult: (result: ExtractionProgressResult & { ok: true }, stop: () => void) => void;
  },
): ExtractionProgressState {
  const { enabled, intervalMs, immediate } = options;
  const [run, setRun] = useState<ExtractionProgressState>(options.initial);
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function stop() {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    }

    async function poll() {
      if (cancelled) return;
      const result = await getExtractionProgress(deskId);
      if (cancelled || !result.ok) return;
      setRun({
        stage: result.stage,
        progressNote: result.progressNote,
        reasoningPartial: result.reasoningPartial,
        status: result.status,
        errorCode: result.errorCode,
      });
      onResultRef.current(result, stop);
    }

    if (immediate) poll();
    intervalId = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskId, enabled, intervalMs, immediate]);

  return run;
}
