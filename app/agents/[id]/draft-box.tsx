"use client";

import { CheckIcon } from "lucide-react";
import twitterText from "twitter-text";

import type { FeedDraft } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import { PostToXControl } from "./post-to-x-control";

function CharCounter({ text, xLimit }: { text: string; xLimit: number }) {
  const length = twitterText.parseTweet(text).weightedLength;
  const limit = xLimit;
  const overLimit = length > limit;
  const nearLimit = !overLimit && length / limit > 0.9;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        nearLimit ? "text-warning" : overLimit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length} / {limit}
    </span>
  );
}

// Read-only by owner decision: inline editing, Save, and the version-history dialog were
// removed as premature — the draft box shows the winner and offers Post, nothing else.
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
    <section
      className={
        "mt-[clamp(13px,1.5cqw,17px)] rounded-[7px] border bg-secondary pt-[clamp(13px,1.5cqw,17px)] px-[clamp(14px,1.6cqw,18px)] pb-[clamp(8px,0.9cqw,10px)]"
      }
    >
      <p className="whitespace-pre-wrap font-sans w-full text-[clamp(14.5px,1.68cqw,17px)] leading-[1.5] text-foreground">
        {draft.draftText}
      </p>
      <div className="mt-[clamp(11px,1.3cqw,14px)] h-px bg-border" />
      <div className="flex items-center justify-end gap-2.5 pt-1">
        <div className="flex items-center gap-2.5">
          <CharCounter text={draft.draftText} xLimit={charLimit} />
          {posting ? (
            <span className="flex h-[30px] items-center rounded-[2px] border border-muted-foreground/35 bg-muted px-3 text-sm text-muted-foreground">
              Posting…
            </span>
          ) : confirmed ? (
            <a
              className="animate-in fade-in slide-in-from-bottom-1 duration-200 flex h-[30px] items-center gap-1.5 rounded-[2px] border border-primary/35 bg-primary/12 px-3 text-sm text-accent-foreground"
              href={draft.postedUrl ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              <CheckIcon aria-hidden="true" className="size-3.5" />
              Posted
            </a>
          ) : ambiguous ? (
            <span
              className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-warning/35 bg-warning/12 px-3 text-sm text-warning"
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
        </div>
      </div>
    </section>
  );
}
