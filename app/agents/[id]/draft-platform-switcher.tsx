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

import twitterText from "twitter-text";
import { Badge } from "@/components/ui/badge";
import { NON_X_PLATFORM_CHAR_LIMITS, type Platform } from "@/lib/agent/desk-config";
import type { FeedDraft } from "@/lib/agent/feed-query";
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
  winners,
  activePlatform,
  onPlatformChange,
  sourcePostId,
  agentId,
  charLimit,
  xLinked,
}: {
  winners: Partial<Record<Platform, FeedDraft>>;
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  sourcePostId: string;
  agentId: string;
  /** The desk's X character ceiling — 280, or 25,000 when the reporter's own corpus proves a
   *  premium account (an over-280 post exists). Inferred in page.tsx, never asked for. */
  charLimit: number;
  xLinked: boolean;
}) {
  const platforms = Object.keys(winners) as Platform[];
  const winner = winners[activePlatform] ?? winners.x ?? Object.values(winners)[0];

  if (!winner) return null; // unreachable: DraftCard only mounts this once winners is non-empty

  // postedAt alone is a CAS claim flag (lib/x/post-core.ts), not proof of a live post — it's set
  // BEFORE createTweet runs, and survives with postedUrl null on an ambiguous X-side failure (and
  // on the rarer stamp-failure-after-real-success collision, ~post-core.ts:180-189; from these two
  // columns alone the UI can't and doesn't try to distinguish the two). Only postedUrl also being
  // set means the post is confirmed.
  const confirmed = activePlatform === "x" && winner.postedAt !== null && winner.postedUrl !== null;
  const ambiguous = activePlatform === "x" && winner.postedAt !== null && winner.postedUrl === null;

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
                onClick={() => onPlatformChange(platform)}
                type="button"
              >
                {PLATFORM_LABELS[platform]}
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <p className="text-sm whitespace-pre-wrap">{winner.text}</p>
      {/* An explicit growing spacer rather than `mt-auto` on the row below — `flex-1` on a real
          element is deterministic where an auto margin depends on the parent resolving a free
          height. This is what pins edit/history/info + counter/Post to the card's bottom edge
          while the card stretches to match its taller row partner. */}
      <div aria-hidden="true" className="flex-1" />
      {/* Layout in the CSS module, colocated with the button it sizes (post-to-x-control.tsx). */}
      <div className={styles.actionRow}>
        <div className="flex flex-wrap items-center gap-1.5">
          <DraftEditDialog
            currentText={winner.text}
            disabled={confirmed}
            draftId={winner.draftId}
          />
          <DraftHistoryDialog winningDraftId={winner.draftId} />
          {/* The model-count/cost badge is gone from the card — that breakdown lives in the
              council dialog behind the info button, where someone actually asking for it
              looks. */}
          <CouncilDialog agentId={agentId} sourcePostId={sourcePostId} />
        </div>
        {activePlatform !== "x" ? (
          <div className="flex items-center gap-2">
            <CharCounter platform={activePlatform} text={winner.text} xLimit={charLimit} />
            <span className="text-sm text-muted-foreground">Drafted — not published</span>
          </div>
        ) : confirmed ? (
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
        ) : ambiguous ? (
          // No PostToXControl mounted here — postDraftToXForOwner (lib/x/post-core.ts) rejects
          // any draft with postedAt set before ever touching X, so a Post button would
          // deterministically no-op. The real recovery path is editing: DraftEditDialog is
          // enabled above (disabled={confirmed}, not this), and a resubmit mints a fresh winner
          // row with postedAt null, flipping this card back to the unposted branch below.
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">
              Couldn't confirm this reached X — check your account, then edit to resend if it didn't
              post
            </span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <CharCounter platform="x" text={winner.text} xLimit={charLimit} />
            <PostToXControl
              charLimit={charLimit}
              draftText={winner.text}
              draftId={winner.draftId}
              xLinked={xLinked}
            />
          </div>
        )}
      </div>
      {winner.judgeNotes !== null || winner.correctedFields.length > 0 ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Judge notes</summary>
          {winner.judgeNotes ? <p className="mt-1">{winner.judgeNotes}</p> : null}
          <div className="mt-1 flex flex-wrap gap-1">{winner.correctedFields.map((field) => <Badge key={field} variant="secondary">{field}</Badge>)}</div>
        </details>
      ) : null}
    </>
  );
}
