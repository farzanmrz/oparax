"use client";

import { useState } from "react";
import type { PreviewStory } from "@/lib/scan/types";
import { UserAvatar } from "@/components/agents/chat-avatars";

// ── Pencil edit glyph (inline, no shared dep needed) ─────────────────────────

function PencilGlyph({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width={width}
      height={height}
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── DraftCard ─────────────────────────────────────────────────────────────────

export function DraftCard(props: {
  story: PreviewStory;
  draft: string;
  onDraftChange: (text: string) => void;
  xConnected: boolean;
}) {
  const { draft, onDraftChange, xConnected } = props;
  const [editing, setEditing] = useState(false);

  return (
    <div className="draft-card">
      {/* Posted-style header: avatar + name + handle/time */}
      <div className="draft-head">
        <UserAvatar name="You" size={32} />
        <div className="draft-head-meta">
          <span className="draft-author">You</span>
          <span className="draft-handle">@you · now</span>
        </div>
      </div>

      {/* Draft text — editable inline or read-only */}
      {editing ? (
        <div className="draft-edit-wrap">
          <textarea
            className="draft-textarea"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={5}
          />
          <button type="button" className="draft-done-btn" onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
      ) : (
        <p className="draft-text">{draft}</p>
      )}

      {/* Footer: char count + edit toggle */}
      <div className="draft-foot">
        <span className="draft-charcount">{draft.length} characters</span>
        {!editing && (
          <button
            type="button"
            className="draft-edit-btn"
            onClick={() => setEditing(true)}
            aria-label="Edit draft"
          >
            <PencilGlyph /> Edit
          </button>
        )}
      </div>

      {/* Connect-X hint when not connected */}
      {!xConnected && <p className="draft-connect-hint">Connect X at the bottom to post.</p>}
    </div>
  );
}
