// app/agents/[id]/draft-platform-switcher.tsx
//
// The narrow client boundary `feed-item.tsx`'s `DraftCard` delegates to once a story has at
// least one winning draft — owns ONLY the local pill-switcher state (`useState<Platform>`)
// and everything downstream of "which platform's draft is on screen right now": the pill
// row, the draft text, the character counter, and the action row (Edit / History / Council /
// Post-to-X). This is a NEW file, not enumerated by name in the task brief's Owns line (which
// names `feed-item.tsx` itself) — pulled out anyway because Next.js's "use client" boundary
// is whole-module: the brief's own "push use client down to the smallest boundary" mandate is
// unreachable any other way without making the ENTIRE feed-item.tsx module client (see
// task-25-report.md for this call).
"use client";

import { useState } from "react";
import twitterText from "twitter-text";
import { Badge } from "@/components/ui/badge";
import { NON_X_PLATFORM_CHAR_LIMITS, type Platform } from "@/lib/agent/desk-config";
import type { FeedStory } from "@/lib/agent/feed-query";
import { cn } from "@/lib/utils";
import { CouncilDialog } from "./council-dialog";
import { DraftEditDialog } from "./draft-edit-dialog";
import { DraftHistoryDialog } from "./draft-history-dialog";
import { PostToXControl } from "./post-to-x-control";
import styles from "./source-tweet.module.css";

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
};

/** X first when present (it's the only platform with a posting mechanism this slice, so it's
 *  the most useful default view); otherwise whichever platform actually has a winner. */
function defaultPlatform(winners: FeedStory["winners"]): Platform {
  if (winners.x) return "x";
  const [first] = Object.keys(winners) as Platform[];
  // Safe: this component only ever renders when `winners` has at least one entry (DraftCard's
  // own "no winners yet" branch handles the empty case) — see feed-item.tsx.
  return first as Platform;
}

/** X keeps `twitter-text`'s weighted-length logic unchanged (a URL counts as a fixed weight
 *  regardless of its real length, X's own rule). LinkedIn/Bluesky have no such weighting — a
 *  plain code-point count against each platform's own flat ceiling
 *  (`NON_X_PLATFORM_CHAR_LIMITS`) is the reasonable substitute (documented in
 *  task-25-report.md; the brief explicitly allows this or omitting the counter for non-X
 *  platforms — kept, since a counter is more useful than none). */
function CharCounter({
  platform,
  text,
  xLimit,
}: {
  platform: Platform;
  text: string;
  xLimit: number;
}) {
  const length = platform === "x" ? twitterText.parseTweet(text).weightedLength : [...text].length;
  const limit = platform === "x" ? xLimit : NON_X_PLATFORM_CHAR_LIMITS[platform];
  const overLimit = length > limit;
  const nearLimit = !overLimit && length / limit > 0.9;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        overLimit ? "text-destructive" : nearLimit ? "text-warning" : "text-muted-foreground",
      )}
    >
      {length} / {limit}
    </span>
  );
}

export function DraftPlatformSwitcher({
  story,
  experimentId,
  charLimit,
  xLinked,
}: {
  story: FeedStory;
  experimentId: string;
  /** The desk's X character ceiling — 280, or 25,000 when the reporter's own corpus proves a
   *  premium account (an over-280 post exists). Inferred in page.tsx, never asked for. */
  charLimit: number;
  xLinked: boolean;
}) {
  const platforms = Object.keys(story.winners) as Platform[];
  const [selected, setSelected] = useState<Platform>(() => defaultPlatform(story.winners));
  // Guards against a platform disappearing out from under a stale selection on revalidate
  // (e.g. this task's own edit action never removes a platform, but defensive regardless).
  const activePlatform = platforms.includes(selected) ? selected : defaultPlatform(story.winners);
  const winner = story.winners[activePlatform];
  const sourcePost = story.sourcePosts[0];

  if (!winner) return null; // unreachable: DraftCard only mounts this once winners is non-empty

  const posted = activePlatform === "x" && winner.postedAt !== null;

  return (
    <>
      {/* The pill row only earns its pixels when there is genuinely a choice — with one
          platform live (X, today) a single lonely pill read as a stray duplicate of the
          header's platform chip. A toggle group, not tabs — aria-pressed (not role="tab")
          since there's no arrow-key roving-focus behavior implemented. */}
      {platforms.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {platforms.map((platform) => (
            <Badge
              asChild
              className={cn(
                "font-mono",
                platform !== activePlatform && "cursor-pointer opacity-60",
              )}
              key={platform}
              variant="secondary"
            >
              <button
                aria-pressed={platform === activePlatform}
                onClick={() => setSelected(platform)}
                type="button"
              >
                {PLATFORM_LABELS[platform]}
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <p className="text-sm whitespace-pre-wrap">{winner.text}</p>
      {/* An explicit growing spacer, NOT `mt-auto` on the row below: auto margins did not
          resolve inside react-tweet's article (measured — 92-112px of dead space stayed
          BELOW the action row), and `flex-1` on a real element is deterministic. This is what
          pins edit/history/info + counter/Post to the card's bottom edge while the card
          stretches to match its taller row partner. */}
      <div aria-hidden="true" className="flex-1" />
      {/* Layout from the CSS module, not Tailwind: react-tweet's unlayered `* { padding: 0 }`
          kills utility spacing inside these cards — see source-tweet.module.css. */}
      <div className={styles.actionRow}>
        <div className="flex flex-wrap items-center gap-1.5">
          <DraftEditDialog
            currentText={winner.text}
            disabled={posted}
            postDraftId={winner.postDraftId}
          />
          <DraftHistoryDialog winningPostDraftId={winner.postDraftId} />
          {/* The model-count/cost badge is gone from the card — that breakdown lives in the
              council dialog behind the info button, where someone actually asking for it
              looks. */}
          {sourcePost ? (
            <CouncilDialog experimentId={experimentId} sourcePostId={sourcePost.id} />
          ) : null}
        </div>
        {activePlatform !== "x" ? (
          <div className="flex items-center gap-2">
            <CharCounter platform={activePlatform} text={winner.text} xLimit={charLimit} />
            <span className="text-sm text-muted-foreground">Drafted — not published</span>
          </div>
        ) : posted ? (
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Posted to X</span>
            {winner.postedUrl ? (
              <a
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                href={winner.postedUrl}
                rel="noreferrer"
                target="_blank"
              >
                View post ↗
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <CharCounter platform="x" text={winner.text} xLimit={charLimit} />
            <PostToXControl
              charLimit={charLimit}
              draftText={winner.text}
              postDraftId={winner.postDraftId}
              xLinked={xLinked}
            />
          </div>
        )}
      </div>
    </>
  );
}
