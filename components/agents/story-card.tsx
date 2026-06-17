"use client";

// Renders one PreviewStory: title, summary, sources, and an editable draft.
// When onPost/onRedraft are provided (detail page) action buttons are shown.
// When absent (create preview) only the editable draft textarea is rendered.

import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Spinner } from "@/components/ui/spinner";
import type { PreviewStory } from "@/lib/scan/types";

export interface StoryCardProps {
  story: PreviewStory;
  onDraftChange?: (text: string) => void;
  // Detail-page-only props — when provided, show action buttons.
  onPost?: () => void;
  onRedraft?: () => void;
  posting?: boolean;
  redrafting?: boolean;
}

export function StoryCard({
  story,
  onDraftChange,
  onPost,
  onRedraft,
  posting = false,
  redrafting = false,
}: StoryCardProps) {
  const allSources = [
    ...(story.primaryTweetUrl ? [story.primaryTweetUrl] : []),
    ...story.sourceUrls.filter((u) => u !== story.primaryTweetUrl),
  ];
  const hasActions = onPost !== undefined || onRedraft !== undefined;

  return (
    <div className="ws-item">
      {/* Header: title + optional status */}
      <div className="ws-item-head">
        <h3 className="ws-item-title">{story.title}</h3>
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
        <label className="flabel" htmlFor="sc-draft">
          Draft
        </label>
        <textarea
          id="sc-draft"
          className="ws-textarea"
          value={story.draft}
          onChange={(e) => onDraftChange?.(e.target.value)}
          rows={4}
          style={{
            minHeight: 100,
          }}
          readOnly={!onDraftChange}
        />
      </div>

      {/* Action buttons — detail page only */}
      {hasActions && (
        <div className="ws-item-actions">
          {onPost && (
            <button
              type="button"
              className={`btn btn-primary btn-sm${posting ? " loading" : ""}`}
              onClick={onPost}
              disabled={posting || redrafting}
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
        </div>
      )}
    </div>
  );
}
