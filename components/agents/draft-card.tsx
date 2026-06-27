"use client";

import { Fragment, useState } from "react";
import type { PreviewStory } from "@/lib/scan/types";

// ── Entity highlighting ──────────────────────────────────────────────────────
// Render #hashtags, @mentions, and links in accent blue, the way X displays a post.
// Read-only only — the edit textarea stays plain text. ONE capturing group is the single
// source of truth: String.split() interleaves the captured entities at ODD indices, so we
// classify by parity (no second regex to keep in sync). The @mention requires a non-word /
// non-@ char before it so emails ("foo@bar.com") aren't mis-highlighted, and the link stops
// before trailing punctuation ("see https://x.co/a." → the period stays plain). The @mention
// body ([A-Za-z0-9_]{1,15}) mirrors HANDLE_RE in lib/scan/handles.ts — keep them consistent.
const ENTITY_RE =
  /((?<![\w@])@[A-Za-z0-9_]{1,15}|#[\p{L}\p{N}_]+|https?:\/\/[^\s]*[^\s.,!?;:)\]}'"])/gu;

function PostText({ text }: { text: string }) {
  return (
    <p className="draft-text">
      {text.split(ENTITY_RE).map((part, i) =>
        i % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is positional and stable for a given string.
          <span key={i} className="post-entity">
            {part}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is positional and stable for a given string.
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

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
}) {
  const { draft, onDraftChange } = props;
  const [editing, setEditing] = useState(false);
  // A failed draft arrives as empty text — show a recoverable note instead of a blank post.
  const hasDraft = draft.trim().length > 0;

  return (
    <div className="draft-card">
      {/* Draft text — editable inline, read-only when present, or a failed-draft note. */}
      {editing ? (
        <div className="draft-edit-wrap">
          <textarea
            className="draft-textarea"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Write your post here…"
            rows={5}
          />
          <button type="button" className="draft-done-btn" onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
      ) : hasDraft ? (
        <PostText text={draft} />
      ) : (
        <p className="draft-text" style={{ color: "var(--err)" }}>
          Draft failed — try a voice tweak or a re-scan, or write it yourself with Edit.
        </p>
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
    </div>
  );
}
