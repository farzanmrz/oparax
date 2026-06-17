"use client";

// Renders a list of StoryCards.
// Used in two contexts:
//   1. Create flow (agent-chat.tsx): onSave + saving provided; per-item post/redraft absent.
//   2. Detail page (F2): per-item onPost/onRedraft provided; onSave absent.

import type { PreviewStory, ScanMetrics } from "@/lib/scan/types";
import { StoryCard } from "./story-card";

export interface PerItemHandlers {
  onPost: (index: number) => void;
  onRedraft: (index: number) => void;
  posting: number | null;
  redrafting: number | null;
}

export interface ScanPreviewProps {
  stories: PreviewStory[];
  metrics?: ScanMetrics | null;
  // Create-flow: save handler
  onSave?: () => void;
  saving?: boolean;
  // Detail-page: per-item handlers
  perItem?: PerItemHandlers;
  // Controlled draft edits — when provided each card updates this
  drafts?: string[];
  onDraftChange?: (index: number, text: string) => void;
}

export function ScanPreview({
  stories,
  metrics,
  onSave,
  saving = false,
  perItem,
  drafts,
  onDraftChange,
}: ScanPreviewProps) {
  if (stories.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          font: "400 0.9375rem/1.5 var(--font-sans)",
          color: "var(--muted)",
        }}
      >
        No stories found in this scan.
      </p>
    );
  }

  return (
    <div className="ws-run">
      {/* Metrics summary */}
      {metrics && (
        <p className="ws-results-note">
          Found {stories.length} {stories.length === 1 ? "story" : "stories"}
          {metrics.elapsedMs ? ` in ${(metrics.elapsedMs / 1000).toFixed(1)}s` : ""}
          {metrics.costUsd != null ? ` · $${metrics.costUsd.toFixed(4)}` : ""}
        </p>
      )}

      <div className="ws-stories">
        {stories.map((story, i) => (
          <StoryCard
            key={story.dedupeKey}
            story={
              drafts
                ? {
                    ...story,
                    draft: drafts[i] ?? story.draft,
                  }
                : story
            }
            onDraftChange={onDraftChange ? (text) => onDraftChange(i, text) : undefined}
            onPost={perItem ? () => perItem.onPost(i) : undefined}
            onRedraft={perItem ? () => perItem.onRedraft(i) : undefined}
            posting={perItem ? perItem.posting === i : undefined}
            redrafting={perItem ? perItem.redrafting === i : undefined}
          />
        ))}
      </div>

      {/* Save button — create flow only */}
      {onSave && (
        <div className="ws-save">
          <button
            type="button"
            className={`btn btn-primary${saving ? " loading" : ""}`}
            onClick={onSave}
            disabled={saving}
          >
            <span className="ld" aria-hidden="true" />
            {saving ? "Saving…" : "Save agent"}
          </button>
        </div>
      )}
    </div>
  );
}
