"use client";

// app/agents/[id]/voice/audit-dialog.tsx
//
// The "audit ↗" trigger + dialog for a voice guide's extraction record. Server-fetched
// data comes in as a plain prop (page.tsx already resolved `provenance.modelCallId` →
// one `model_calls` row before this ever mounts) — this component owns interactivity
// only, never fetches. `null` covers both "no provenance stored" and "the referenced
// model_calls row is gone" — the dialog can't tell those apart and doesn't need to; both
// render the same quiet "no extraction record" note. The mock's 5-step timeline has no
// backing log and is intentionally omitted, per the brief.

import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCost } from "@/lib/format";

export type AuditData = {
  readonly reasoning: string | null;
  readonly costUsd: number | null;
  readonly createdAt: string;
};

/** ISO timestamp → "March 3, 2026", pinned to UTC so server and client agree. */
function formatExtractedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function AuditDialog({
  audit,
  reporterHandle,
}: {
  readonly audit: AuditData | null;
  readonly reporterHandle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="gap-1 text-muted-foreground" size="sm" variant="ghost">
          Audit
          <ExternalLinkIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How your writing guide was built</DialogTitle>
          <DialogDescription>
            The extraction record for @{reporterHandle}&rsquo;s writing guide.
          </DialogDescription>
        </DialogHeader>
        {audit ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>Extracted {formatExtractedAt(audit.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatCost(audit.costUsd)}</span>
            </div>
            {audit.reasoning ? (
              <Reasoning defaultOpen={false}>
                <ReasoningTrigger />
                <ReasoningContent>{audit.reasoning}</ReasoningContent>
              </Reasoning>
            ) : (
              <p className="text-sm text-muted-foreground">
                This model didn&rsquo;t expose its reasoning for this extraction.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No extraction record on file for this guide.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
