"use client";

// app/agents/[id]/post-to-x-control.tsx
//
// Self-contained per-draft post control — a hard export contract T4 (the Feed draft
// card, a later task) drops this into verbatim: `postDraftId` + `draftText` +
// `xLinked`. Nothing else is threaded through — this component owns its own confirm
// state and calls `postDraftToX` directly.
//
// Click flips the Post button to an inline confirm/cancel panel (no modal — the
// locked pattern ported from the old agent-dashboard.tsx DraftCard); Confirm is
// disabled the moment twitter-text says the draft would 4xx at X, so the reporter
// sees why before the network round trip. When the reporter has no linked X account
// this renders the Connect-X affordance instead of Post (also ported from the old
// pattern) — postDraftToX would fail server-side either way, but surfacing it here
// skips that round trip.

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseTweet } from "twitter-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postDraftToX } from "@/lib/x/actions";

const WEIGHTED_LIMIT = 280;

export function PostToXControl({
  postDraftId,
  draftText,
  xLinked,
}: {
  postDraftId: string;
  draftText: string;
  xLinked: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!xLinked) {
    return (
      <Button asChild size="sm" variant="outline">
        {/* Plain link, not a fetch: /auth/x is a full-page OAuth redirect to X.
            returnTo brings the reporter back to this exact desk page after linking. */}
        <a href={`/auth/x?returnTo=${encodeURIComponent(pathname)}`}>Connect X</a>
      </Button>
    );
  }

  const parsed = parseTweet(draftText);
  const overLimit = parsed.weightedLength > WEIGHTED_LIMIT;
  const nearLimit = !overLimit && parsed.weightedLength / WEIGHTED_LIMIT > 0.9;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await postDraftToX(postDraftId);
      if (result.ok) {
        setConfirming(false);
        // No Undo action: the mock's 5s undo implied unpublishing, but a real tweet is
        // published the instant the API returns — deleting-as-undo is a product call
        // not taken here.
        toast.success("Posted to X", {
          action: {
            label: "View post",
            onClick: () => window.open(result.url, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        setError(result.error);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-sm text-muted-foreground">Post this draft to X? It publishes now.</p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              overLimit ? "text-destructive" : nearLimit ? "text-warning" : "text-muted-foreground",
            )}
          >
            {parsed.weightedLength} / {WEIGHTED_LIMIT}
          </span>
          <Button disabled={isPending || !parsed.valid} onClick={handleConfirm} size="sm">
            {isPending ? "Posting…" : "Post to X"}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Button onClick={() => setConfirming(true)} size="sm">
      Post
    </Button>
  );
}
