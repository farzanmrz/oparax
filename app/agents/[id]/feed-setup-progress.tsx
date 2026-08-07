"use client";

import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExtractionChain } from "@/components/extraction-chain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { pipelineSteps } from "@/lib/voice/extraction-steps";
import {
  type ExtractionProgressState,
  useExtractionProgress,
} from "@/lib/voice/use-extraction-progress";

const POLL_INTERVAL_MS = 1750;
const COMPLETION_HOLD_MS = 1500;

export function FeedSetupProgress({
  deskId,
  initial,
}: {
  readonly deskId: string;
  readonly initial: ExtractionProgressState;
}) {
  const router = useRouter();
  const run = useExtractionProgress(deskId, {
    enabled: initial.status === "running",
    intervalMs: POLL_INTERVAL_MS,
    immediate: false,
    initial,
    onResult: (result, stop) => {
      if (result.status === "completed") {
        stop();
        window.setTimeout(() => router.refresh(), COMPLETION_HOLD_MS);
        return;
      }
      if (result.status !== "running") stop();
    },
  });
  const failed = run.status === "failed";

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="sr-only">Setting up your agent</h1>
      <Alert className="border-primary/30 bg-primary/8 text-foreground" role="status">
        <InfoIcon aria-hidden="true" className="text-primary" />
        <AlertDescription className="text-foreground/90">
          Agent setup will take 5–6 minutes. You can safely leave and return to this page while
          Voice and Sources fill automatically.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border p-4 desk:p-5">
        <ExtractionChain
          isStreaming={run.status === "running"}
          reasoningByStage={run.reasoningByStage}
          textByStage={run.textByStage}
          toolActivities={run.toolActivities}
          steps={pipelineSteps(run)}
        />
        {failed ? (
          <div className="mt-5 border-border border-t pt-4">
            <Button asChild className="min-h-11" size="sm" variant="outline">
              <Link href={`/agents/${deskId}/voice`}>Retry in Voice</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
