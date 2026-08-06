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
// Layout (owner spec): char count top-right, no divider, and the post control IS the box's
// full-width bottom footer (overflow-hidden clips it to the rounded corners).
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
    <section className="mt-[clamp(13px,1.5cqw,17px)] overflow-hidden rounded-[7px] border bg-secondary">
      <div className="px-[clamp(14px,1.6cqw,18px)] pt-[clamp(10px,1.2cqw,13px)] pb-[clamp(13px,1.5cqw,17px)]">
        <div className="flex justify-end">
          <CharCounter text={draft.draftText} xLimit={charLimit} />
        </div>
        <p className="mt-1 whitespace-pre-wrap font-sans w-full text-[clamp(14.5px,1.68cqw,17px)] leading-[1.5] text-foreground">
          {draft.draftText}
        </p>
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
