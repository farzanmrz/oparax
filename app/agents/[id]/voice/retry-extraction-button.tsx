"use client";

// app/agents/[id]/voice/retry-extraction-button.tsx
//
// A desk with no guide yet gets a real retry action instead of a dead-end empty state. Calls
// retryExtraction, which runs both pre-flight gates inline (so a bad handle or an unresolvable
// profile comes back as a specific message) and hands the billable phase to after().

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
      // {ok:true}: retryExtraction already revalidated the /agents/[id] layout — the empty state
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
