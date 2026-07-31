"use client";

// lib/voice/use-extraction-progress.ts
//
// Shared poll loop for `voice_extraction_runs` progress, used by both watching surfaces —
// Feed's pre-ready panel and the Voice tab's extraction-progress component. Both call
// `getExtractionProgress(deskId)`
// on an interval and spread the same five fields into local state before branching on
// terminal status; this hook is that shared plumbing so the poll loop is never written twice.
//
// The two callers differ in exactly the ways their `options` capture: whether polling is
// gated on something else first (`enabled`), whether the first poll fires immediately or
// waits one interval (`immediate`), and what happens on a terminal result (`onResult`, which
// receives a `stop()` it can call to end polling early when the run reaches a terminal status).
import { useEffect, useRef, useState } from "react";
import { getExtractionProgress } from "@/app/agents/[id]/voice/actions";
import {
  type ExtractionReasoningByStage,
  type ExtractionTextByStage,
  type ExtractionToolActivity,
  mergeExtractionReasoning,
  mergeExtractionToolActivities,
} from "@/lib/voice/extraction-progress-reasoning";

type ExtractionProgressResult = Awaited<ReturnType<typeof getExtractionProgress>>;

export type ExtractionProgressState = {
  stage: string | null;
  progressNote: string | null;
  /** Reasoning observed while each semantic model stage owned the stream. */
  reasoningByStage: ExtractionReasoningByStage;
  /** Every ordinary text block observed while each semantic model stage owned the stream. */
  textByStage: ExtractionTextByStage;
  /** Streamed tool inputs and their eventual calls/results. */
  toolActivities: ExtractionToolActivity[];
  status: string;
  errorCode: string | null;
  /** Evidence hydrated from the persisted, accumulating corpus. */
  corpusPostCount?: number;
  scopeExcludedCount?: number;
};

function retainEvidence(
  current: ExtractionProgressState,
  result: ExtractionProgressState,
): Pick<ExtractionProgressState, "corpusPostCount" | "scopeExcludedCount"> {
  const corpusMatch = result.progressNote?.match(/^Read (\d+) posts?$/);
  const scopeMatch = result.progressNote?.match(/^Set aside (\d+) off-beat posts?/);
  return {
    corpusPostCount:
      result.corpusPostCount ?? (corpusMatch ? Number(corpusMatch[1]) : current.corpusPostCount),
    scopeExcludedCount:
      result.scopeExcludedCount ??
      (scopeMatch
        ? Number(scopeMatch[1])
        : result.progressNote?.startsWith("Kept all posts")
          ? 0
          : current.scopeExcludedCount),
  };
}

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
  const [run, setRun] = useState<ExtractionProgressState>(() => ({
    ...options.initial,
    ...retainEvidence(options.initial, options.initial),
  }));
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
      setRun((current) => {
        const next = {
          stage: result.stage,
          progressNote: result.progressNote,
          reasoningByStage: mergeExtractionReasoning(
            current.reasoningByStage,
            result.reasoningByStage,
          ),
          textByStage: {
            ...current.textByStage,
            ...Object.fromEntries(
              (["scope", "extract"] as const).map((stage) => [
                stage,
                (result.textByStage[stage]?.length ?? 0) >=
                (current.textByStage[stage]?.length ?? 0)
                  ? result.textByStage[stage]
                  : current.textByStage[stage],
              ]),
            ),
          },
          toolActivities: mergeExtractionToolActivities(
            current.toolActivities,
            result.toolActivities,
          ),
          status: result.status,
          errorCode: result.errorCode,
          ...retainEvidence(current, result),
        };
        return next;
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
