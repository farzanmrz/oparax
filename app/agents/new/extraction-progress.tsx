"use client";

// app/agents/new/extraction-progress.tsx
//
// The live extraction view create-desk-form.tsx swaps in once a desk exists (T6). Polls
// getExtractionProgress(deskId) (app/agents/[id]/voice/actions.ts, T5) on an interval and
// renders today's voice_extraction_claims row for that desk's reporter. attemptVoiceExtraction
// runs fire-and-forget from createDesk's after() (../actions.ts) — nothing here started the
// job, this view only observes it. That means a preflight rejection, a malformed handle, or an
// "already extracted" no-op (create-desk-extraction.ts's other early-exit outcomes) never write
// a claim row at all, so they're indistinguishable from "hasn't started yet" until the grace
// period below expires — at which point this view stops guessing and just lets the reporter
// continue into their desk, where the Voice tab (real-time on revisit, or its own retry) is the
// full recovery surface either way.
//
// A beforeunload listener warns while a claim looks in-flight; leaving never cancels the
// work — extraction survives navigation by design (T5). Modern browsers show their own generic
// "leave site?" copy for beforeunload and ignore any custom returnValue text; that's a browser
// platform limitation, not a bug here.

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import { getExtractionProgress } from "../[id]/voice/actions";

const POLL_INTERVAL_MS = 1750;

/** How long to wait for a claim row to appear at all before assuming this attempt never wrote
 *  one (see the header comment above) rather than that it's merely slow to start. */
const NO_CLAIM_GRACE_MS = 20000;

type Progress = Awaited<ReturnType<typeof getExtractionProgress>>;

const STAGE_COPY: Record<string, string> = {
  corpus_fetch: "Reading your recent posts…",
  extracting: "Learning how you write…",
  materializing_rules: "Saving your voice rules…",
  done: "Done — taking you to your agent…",
};

export function ExtractionProgress({ deskId }: { readonly deskId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await getExtractionProgress(deskId);
      if (cancelled) return;

      if (result.ok && (result.stage === "done" || result.status === "completed")) {
        router.push(`/agents/${deskId}/voice`);
        return;
      }
      setProgress(result);
      if (
        result.ok &&
        result.status === "none" &&
        Date.now() - startedAtRef.current > NO_CLAIM_GRACE_MS
      ) {
        setTimedOut(true);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deskId, router]);

  const status = progress?.ok ? progress.status : null;
  const inProgress = !(status === "failed" || timedOut || (progress && !progress.ok));

  useEffect(() => {
    if (!inProgress) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue =
        "Your voice guide is still being built. You can leave safely — it keeps running in the background.";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [inProgress]);

  function continueToDesk() {
    router.push(`/agents/${deskId}/voice`);
  }

  if (progress && !progress.ok) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-destructive text-sm">{progress.error}</p>
        <Button onClick={continueToDesk} variant="outline">
          Continue to your agent
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-foreground text-sm">
          Building your voice guide didn&apos;t finish this time.
        </p>
        <p className="text-muted-foreground text-sm">
          Your agent is ready — you can retry from its Voice tab anytime.
        </p>
        <Button onClick={continueToDesk} variant="outline">
          Continue to your agent
        </Button>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-foreground text-sm">
          We couldn&apos;t confirm your voice guide started building.
        </p>
        <p className="text-muted-foreground text-sm">
          Your agent is ready — you can start extraction from its Voice tab anytime.
        </p>
        <Button onClick={continueToDesk} variant="outline">
          Continue to your agent
        </Button>
      </div>
    );
  }

  const stage = progress?.ok ? progress.stage : null;
  const stageLabel = (stage ? STAGE_COPY[stage] : null) ?? "Preparing to build your voice guide…";
  const reasoning = progress?.ok ? progress.reasoningPartial : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        {stageLabel}
      </div>
      {reasoning ? (
        <Reasoning defaultOpen isStreaming>
          <ReasoningTrigger />
          <ReasoningContent>{reasoning}</ReasoningContent>
        </Reasoning>
      ) : null}
      <p className="text-muted-foreground text-xs">
        You can leave this page — building your voice guide keeps running in the background.
      </p>
    </div>
  );
}
