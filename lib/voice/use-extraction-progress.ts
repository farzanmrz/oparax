"use client";

import { useEffect, useRef, useState } from "react";
import { getExtractionProgress } from "@/app/agents/[id]/voice/actions";

type ExtractionProgressResult = Awaited<ReturnType<typeof getExtractionProgress>>;

export type ExtractionProgressState = {
  stage: string | null;
  status: string;
  errorCode: string | null;
  corpusPostCount?: number;
  scopeExcludedCount?: number;
};

function retainEvidence(current: ExtractionProgressState, result: ExtractionProgressState) {
  return {
    corpusPostCount: result.corpusPostCount ?? current.corpusPostCount,
    scopeExcludedCount: result.scopeExcludedCount ?? current.scopeExcludedCount,
  };
}

export function useExtractionProgress(
  deskId: string,
  options: {
    enabled: boolean;
    intervalMs: number;
    immediate: boolean;
    initial: ExtractionProgressState;
    onResult: (result: ExtractionProgressResult & { ok: true }, stop: () => void) => void;
  },
): ExtractionProgressState {
  const { enabled, intervalMs, immediate } = options;
  const [run, setRun] = useState<ExtractionProgressState>(() => options.initial);
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
      setRun((current) => ({
        stage: result.stage,
        status: result.status,
        errorCode: result.errorCode,
        ...retainEvidence(current, result),
      }));
      onResultRef.current(result, stop);
    }
    if (immediate) poll();
    intervalId = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [deskId, enabled, intervalMs, immediate]);

  return run;
}
