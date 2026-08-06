"use client";

import { CheckIcon } from "lucide-react";

import type { FeedDraft } from "@/lib/agent/feed-shared";
import { PostToXControl } from "./post-to-x-control";

// Read-only by owner decision: inline editing, Save, and the version-history dialog were
// removed as premature — the draft box shows the winner and offers Post, nothing else.
// Presentation: a reduced X-post preview, content only — the draft text is set exactly like
// tweet body copy (17px-ish, regular weight, 1.5 leading) on a lighter full-bleed plate.
// No char count in the body: budget lives in the footer's progress ring (PostToXControl),
// which sits beside Post exactly where X's composer puts it.
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
      <div className="px-[clamp(15px,2.1cqw,22px)] py-[clamp(14px,1.7cqw,19px)]">
        <p className="whitespace-pre-wrap font-sans w-full text-[clamp(15px,1.75cqw,17px)] font-normal leading-[1.5] text-foreground">
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
