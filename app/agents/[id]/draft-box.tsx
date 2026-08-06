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
// Presentation: the draft is the only element in the reporter's voice, so it renders as a
// distinct full-bleed plate (lighter surface, no inner bordered box) with a small-caps
// "Draft · your voice" kicker that also anchors the char count. The post control is the
// plate's full-width bottom footer — on mobile that is the card's footer; at @[48rem] the
// plate is the card's right column and Post pins to its bottom via mt-auto.
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
    <section className="flex min-w-0 flex-col border-t border-border bg-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] @[48rem]:border-t-0 @[48rem]:border-l">
      <div className="flex flex-1 flex-col px-[clamp(15px,2.1cqw,22px)] pt-[clamp(13px,1.5cqw,18px)] pb-[clamp(14px,1.8cqw,20px)]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-foreground/80">
            Draft · your voice
          </span>
          <CharCounter text={draft.draftText} xLimit={charLimit} />
        </div>
        <p className="mt-[clamp(10px,1.1cqw,13px)] w-full whitespace-pre-wrap font-sans text-[clamp(14.5px,1.68cqw,17px)] leading-[1.55] text-foreground">
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
