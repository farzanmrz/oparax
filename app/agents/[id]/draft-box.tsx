"use client";

import { CheckIcon } from "lucide-react";
import twitterText from "twitter-text";

import type { FeedDraft } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import { PostToXControl } from "./post-to-x-control";

function CharCounter({ text, xLimit }: { text: string; xLimit: number }) {
  const length = twitterText.parseTweet(text).weightedLength;
  const overLimit = length > xLimit;
  const nearLimit = !overLimit && length / xLimit > 0.9;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        nearLimit ? "text-warning" : overLimit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length} chars
    </span>
  );
}

// Read-only by owner decision: inline editing, Save, and the version-history dialog were
// removed as premature — the draft box shows the winner and offers Post, nothing else.
// Presentation: the draft is a full-bleed plate on a lighter surface (secondary over the
// card's darker ground) with a soft inset top highlight — elevation does the separating,
// not another border-on-dark box. The char count anchors bottom-right under the text like
// a sign-off stamp, and the post control is the full-width footer of the entire card.
export function DraftBox({
  draft,
  charLimit,
  xLinked,
}: {
  draft: FeedDraft;
  charLimit: number;
  xLinked: boolean;
}) {
  const confirmed = Boolean(draft.postedAt && draft.postedUrl);
  const ambiguous = Boolean(draft.postedAt && !draft.postedUrl);
  const posting = Boolean(draft.postingClaimedAt);

  return (
    <section className="bg-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="px-[clamp(15px,2.1cqw,22px)] pt-[clamp(13px,1.6cqw,17px)] pb-[clamp(10px,1.2cqw,13px)]">
        <p className="whitespace-pre-wrap font-sans w-full text-[clamp(15px,1.75cqw,17.5px)] leading-[1.55] text-foreground">
          {draft.draftText}
        </p>
        <div className="mt-[clamp(8px,1cqw,11px)] flex justify-end">
          <CharCounter text={draft.draftText} xLimit={charLimit} />
        </div>
      </div>
      {posting ? (
        <span className="flex h-11 w-full items-center justify-center border-t bg-muted text-sm text-muted-foreground">
          Posting…
        </span>
      ) : confirmed ? (
        <a
          className="animate-in fade-in duration-200 flex h-11 w-full items-center justify-center gap-1.5 border-t border-primary/35 bg-primary/12 text-sm text-accent-foreground"
          href={draft.postedUrl ?? "#"}
          rel="noreferrer"
          target="_blank"
        >
          <CheckIcon aria-hidden="true" className="size-3.5" />
          Posted
        </a>
      ) : ambiguous ? (
        <span
          className="flex h-11 w-full items-center justify-center gap-1.5 border-t border-warning/35 bg-warning/12 text-sm text-warning"
          title="Couldn't confirm this reached X — check your account on X"
        >
          <svg
            aria-hidden="true"
            className="size-3.5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 8v4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
            <circle cx="12" cy="16" fill="currentColor" r="0.9" />
            <path
              d="M5 22h14l-2-13H7L5 22z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M9 9h6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          Unconfirmed
        </span>
      ) : (
        <PostToXControl
          charLimit={charLimit}
          draftId={draft.draftId}
          draftText={draft.draftText}
          xLinked={xLinked}
        />
      )}
    </section>
  );
}
