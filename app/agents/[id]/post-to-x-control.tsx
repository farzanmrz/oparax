"use client";

// app/agents/[id]/post-to-x-control.tsx
//
// Self-contained per-draft post control — a hard export contract T4 (the Feed draft
// card, a later task) drops this into verbatim: `draftId` + `draftText` +
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
// twitter-text 3.x is CommonJS — its ESM interop exposes only a default export (the
// twttr object), never a named `parseTweet`, so a named import typechecks but fails the
// bundler at build time. Import the default and read parseTweet off it.
import twitterText from "twitter-text";
import { Button } from "@/components/ui/button";
import { publishDraftToX } from "@/lib/x/actions";
import styles from "./source-tweet.module.css";

export function PostToXControl({
  draftId,
  draftText,
  charLimit,
  xLinked,
}: {
  draftId: string;
  draftText: string;
  /** The desk's X ceiling — 280, or 25,000 when the posting account's stored `x_accounts.tier`
   *  is premium (resolved by `resolveXTier` in page.tsx). Also why the disable check below uses this rather than
   *  twitter-text's `parsed.valid`, which is hardwired to 280 and would wrongly block a
   *  premium-length draft. */
  charLimit: number;
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

  const parsed = twitterText.parseTweet(draftText);
  const overLimit = parsed.weightedLength > charLimit;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await publishDraftToX(draftId);
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
          {/* No counter here — the card's own char counter (draft-platform-switcher.tsx's
              CharCounter, rendered beside this control in both the idle and confirming states)
              already shows this number; a second one here duplicated it verbatim. */}
          <Button disabled={isPending || overLimit} onClick={handleConfirm} size="sm">
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

  // Publishing is the card's whole point, so the button is sized like a primary action rather
  // than the `sm` chip it used to be — at that size, wedged against the card edge next to a
  // mono character counter, it read as another metadata pill instead of the one control the
  // reporter is here to press.
  // Sizing lives in the CSS module beside the action row it sits in, so the two stay in step.
  // (It moved there when react-tweet's unlayered `* { padding: 0 }` was silently zeroing every
  // Tailwind spacing utility in these cards — that library's CSS is gone now and utilities work
  // here again, so this is a colocation choice rather than a workaround.)
  // Just "Post": the card header already carries the X chip and the handle, so naming the
  // platform again on the button is the third time the same word appears in one card. The
  // confirm step below still says "Post to X", where the destination is the thing being agreed to.
  return (
    <Button className={styles.postButton} onClick={() => setConfirming(true)}>
      Post
    </Button>
  );
}
