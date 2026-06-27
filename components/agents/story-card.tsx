"use client";

// Renders one PreviewStory: title, summary, sources, and an editable draft.
// When onPost/onRedraft are provided (detail page) action buttons are shown.
// When absent (create preview) only the editable draft textarea is rendered.
//
// On the detail page each card also reflects the DB-backed terminal state of its
// run_item: a posted item shows a "View on X" link + timestamp (and an
// "auto-posted" badge when posted_via === "auto") in place of the Post button,
// so the state survives a refresh; a failed item shows the error and keeps
// Redraft. The optimistic `posted`/`postedUrl` props win over the DB row while a
// post request is in flight, but the DB row is the source of truth on reload.

import { useId } from "react";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Spinner } from "@/components/ui/spinner";
import type { PreviewStory } from "@/lib/scan/types";

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export interface StoryCardProps {
  story: PreviewStory;
  onDraftChange?: (text: string) => void;
  // Detail-page-only props — when provided, show action buttons.
  onPost?: () => void;
  onRedraft?: () => void;
  posting?: boolean;
  redrafting?: boolean;
  // Detail-page terminal state (DB-backed; survives refresh).
  posted?: boolean;
  postedUrl?: string | null;
  postedAt?: string | null;
  postedVia?: "manual" | "auto" | null;
  failedError?: string | null;
  /** Hub only: X connection state. Posting requires X, so Post is disabled (with a hint) when
   *  X is not connected; Redraft and editing stay available. Defaults connected for callers
   *  that don't post. */
  xConnected?: boolean;
}

export function StoryCard({
  story,
  onDraftChange,
  onPost,
  onRedraft,
  posting = false,
  redrafting = false,
  posted = false,
  postedUrl = null,
  postedAt = null,
  postedVia = null,
  failedError = null,
  xConnected = true,
}: StoryCardProps) {
  const allSources = [
    ...(story.primaryTweetUrl ? [story.primaryTweetUrl] : []),
    ...story.sourceUrls.filter((u) => u !== story.primaryTweetUrl),
  ];
  const hasActions = onPost !== undefined || onRedraft !== undefined;
  // A failed draft persists with empty text (status "failed", drafted_text ""). There's
  // nothing to post, so Post is disabled and Redraft is the only recovery — but a failed
  // POST keeps its text, so Post stays available there.
  const hasDraft = story.draft.trim().length > 0;
  // Unique per card — a fixed id would collide across the many cards on the hub and break
  // label→textarea association (clicking a label focused the first card's textarea).
  const draftId = useId();

  return (
    <div className="ws-item">
      {/* Header: title + optional terminal status pill */}
      <div className="ws-item-head">
        <h3 className="ws-item-title">{story.title}</h3>
        {posted && (
          <span className="ws-item-status" data-status="posted">
            <span className="dot" aria-hidden="true" />
            Posted
          </span>
        )}
        {!posted && failedError && (
          <span className="ws-item-status" data-status="failed">
            <span className="dot" aria-hidden="true" />
            Failed
          </span>
        )}
      </div>

      {/* Summary */}
      <p
        style={{
          margin: 0,
          font: "400 0.875rem/1.55 var(--font-sans)",
          color: "var(--muted)",
        }}
      >
        {story.summary}
      </p>

      {/* Sources via AI Elements */}
      {allSources.length > 0 && (
        <Sources>
          <SourcesTrigger count={allSources.length} />
          <SourcesContent>
            {allSources.map((url) => (
              <Source key={url} href={url} title={url} />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {/* Draft textarea */}
      <div className="ffield-wrap">
        <label className="flabel" htmlFor={draftId}>
          Draft
        </label>
        <textarea
          id={draftId}
          className="ws-textarea"
          value={story.draft}
          onChange={(e) => onDraftChange?.(e.target.value)}
          rows={4}
          placeholder={hasDraft ? undefined : "Draft failed — use Redraft to try again."}
          style={{
            minHeight: 100,
          }}
          readOnly={!onDraftChange || posted}
        />
      </div>

      {/* Failed-post error — keep Redraft available below. */}
      {!posted && failedError && (
        <p style={{ margin: 0, font: "400 0.8125rem/1.5 var(--font-sans)", color: "var(--err)" }}>
          {failedError}
        </p>
      )}

      {/* Action buttons / terminal state — detail page only */}
      {hasActions && (
        <div className="ws-item-actions">
          {posted ? (
            <>
              {postedUrl && (
                <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="ws-link">
                  View on X
                </a>
              )}
              {postedAt && (
                <span style={{ font: "400 0.8125rem/1 var(--font-sans)", color: "var(--faint)" }}>
                  {stamp.format(new Date(postedAt))}
                </span>
              )}
              {postedVia === "auto" && <span className="wbadge">auto-posted</span>}
            </>
          ) : (
            <>
              {onPost && (
                <button
                  type="button"
                  className={`btn btn-primary btn-sm${posting ? " loading" : ""}`}
                  onClick={onPost}
                  disabled={posting || redrafting || !hasDraft || !xConnected}
                  title={
                    !hasDraft
                      ? "No draft to post — use Redraft first."
                      : !xConnected
                        ? "Connect X to post."
                        : undefined
                  }
                >
                  <span className="ld" aria-hidden="true" />
                  {posting ? "Posting…" : "Post"}
                </button>
              )}
              {onRedraft && (
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm${redrafting ? " loading" : ""}`}
                  onClick={onRedraft}
                  disabled={posting || redrafting}
                >
                  {redrafting ? (
                    <>
                      <Spinner className="size-3" />
                      Redrafting…
                    </>
                  ) : (
                    "Redraft"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
