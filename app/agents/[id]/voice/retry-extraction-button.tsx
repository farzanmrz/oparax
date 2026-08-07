"use client";

// app/agents/[id]/voice/retry-extraction-button.tsx
//
// A stopped extraction gets a real retry action instead of a dead end. Calls retryExtraction,
// which runs the handle-shape gate inline, claims the desk's run row, and hands the billable
// phase to after().

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retryExtraction } from "./actions";

export function RetryExtractionButton({ deskId }: { readonly deskId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryExtraction(deskId);
      if (!result.ok) setError(result.error);
      // {ok:true}: retryExtraction claimed the run row before returning, so the revalidate it
      // already issued re-renders the Voice tab against a "running" row. Whether it began from
      // an empty state or a failed guide, the page switches to ExtractionProgress, which polls
      // until the terminal status and then refreshes itself. Nothing to do here.
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        className="min-h-11 desk:h-7 desk:min-h-0"
        disabled={isPending}
        onClick={handleRetry}
        size="sm"
        variant="outline"
      >
        {isPending ? "Retrying…" : "Retry extraction"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
