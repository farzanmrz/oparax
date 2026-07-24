"use client";

// app/agents/[id]/voice/retry-extraction-button.tsx
//
// Voice's Part D: state 3 (verified, no guide yet) gets a real retry action instead of a
// dead-end empty state. Calls capReprobe — see its doc comment (../actions.ts) for how it
// distinguishes a capped daily budget from a generic extraction failure.

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { capReprobe } from "./actions";

export function RetryExtractionButton({
  deskId,
  reporterHandle,
}: {
  readonly deskId: string;
  readonly reporterHandle: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await capReprobe(deskId, reporterHandle);
      if (!result.ok) setError(result.error);
      // {ok:true}: capReprobe already revalidated /agents/[id] layout — the empty state
      // resolves to the guide-rendering path on its own.
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button disabled={isPending} onClick={handleRetry} size="sm" variant="outline">
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
