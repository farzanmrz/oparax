"use client";

// app/agents/[id]/voice/extraction-progress.tsx
//
// The Voice tab's "no guide yet, but extraction is already running" state (T7): a reporter can
// navigate here while the background extraction kicked off from create-desk (T5's
// `after()`-deferred job) is still in flight — this polls `getExtractionProgress` on an
// interval and shows a live view instead of the static empty state, matching this whole plan's
// "extraction survives navigation" requirement. Self-contained: T6's create-form equivalent
// lands concurrently in a different file, not importable from here.
//
// Terminal statuses ("completed"/"failed"/"none" — a claim row that finished or never existed)
// stop the poll and call router.refresh() so the page's server-rendered guide section (or the
// static empty state, on a failure) picks up the finished result on the next render.

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getExtractionProgress } from "./actions";

const STAGE_COPY: Record<string, string> = {
  corpus_fetch: "Fetching recent posts",
  extracting: "Writing the voice guide",
  materializing_rules: "Building voice rules",
  done: "Finishing up",
  failed: "Extraction failed",
};

function stageLabel(stage: string | null): string {
  if (!stage) return "Starting extraction…";
  return STAGE_COPY[stage] ?? "Extraction in progress";
}

const POLL_INTERVAL_MS = 2000;

export function ExtractionProgress({
  deskId,
  reporterHandle,
  initialStage,
  initialProgressNote,
  initialReasoningPartial,
}: {
  readonly deskId: string;
  readonly reporterHandle: string;
  readonly initialStage: string | null;
  readonly initialProgressNote: string | null;
  readonly initialReasoningPartial: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage);
  const [progressNote, setProgressNote] = useState(initialProgressNote);
  const [reasoningPartial, setReasoningPartial] = useState(initialReasoningPartial);
  const settledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (settledRef.current) return;
      const result = await getExtractionProgress(deskId);
      if (!result.ok) return;
      setStage(result.stage);
      setProgressNote(result.progressNote);
      setReasoningPartial(result.reasoningPartial);
      if (result.status !== "reserved") {
        settledRef.current = true;
        clearInterval(interval);
        router.refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [deskId, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center">
      <Loader2Icon aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
      <h3 className="text-sm font-semibold">Extracting the writing guide for @{reporterHandle}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
        {stageLabel(stage)}
        {progressNote ? ` — ${progressNote}` : ""}
      </p>
      {reasoningPartial ? (
        <pre className="mx-auto max-h-40 w-full max-w-md overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground">
          {reasoningPartial}
        </pre>
      ) : null}
    </div>
  );
}
