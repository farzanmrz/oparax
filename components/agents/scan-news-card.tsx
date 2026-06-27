"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/agents/chat-avatars";
import { SourceArticleCard, SourceTweetCard } from "@/components/agents/source-cards";
import type { RawStory, StorySource } from "@/lib/scan/types";

// ── Type-count pills ──────────────────────────────────────────────────────────

function SourcePills({ sources }: { sources: StorySource[] }) {
  const tweets = sources.filter((s) => s.type === "tweet").length;
  const articles = sources.filter((s) => s.type === "article").length;
  return (
    <div className="scan-pills">
      {tweets > 0 && (
        <span className="scan-pill">
          {tweets} {tweets === 1 ? "tweet" : "tweets"}
        </span>
      )}
      {articles > 0 && (
        <span className="scan-pill">
          {articles} {articles === 1 ? "article" : "articles"}
        </span>
      )}
    </div>
  );
}

// ── Overlapping author-avatar preview ─────────────────────────────────────────

function AvatarStack({ sources }: { sources: StorySource[] }) {
  // Deduplicate by authorName/handle and take up to 4
  const seen = new Set<string>();
  const unique: StorySource[] = [];
  for (const s of sources) {
    const key = s.authorName ?? s.handle ?? s.url;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
    if (unique.length >= 4) break;
  }

  if (unique.length === 0) return null;

  return (
    <div className="scan-avatar-stack" aria-hidden="true">
      {unique.map((s, i) => {
        const name = s.authorName ?? s.handle ?? "?";
        const stableKey = s.authorName ?? s.handle ?? s.url;
        return (
          <span
            key={stableKey}
            className="scan-avatar-wrap"
            style={{
              zIndex: unique.length - i,
            }}
          >
            <UserAvatar name={name} size={20} />
          </span>
        );
      })}
    </div>
  );
}

// ── ScanNewsCard ──────────────────────────────────────────────────────────────

export function ScanNewsCard({ story }: { story: RawStory }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = story.sources.length > 0;

  return (
    <div className="scan-card">
      {/* Headline + summary */}
      {story.title && <h3 className="scan-title src-clamp2">{story.title}</h3>}
      <p className="scan-summary src-clamp3">{story.summary}</p>

      {/* Pills + avatar stack row */}
      {hasSources && (
        <div className="scan-meta">
          <SourcePills sources={story.sources} />
          <AvatarStack sources={story.sources} />
        </div>
      )}

      {/* View sources toggle — only when there are sources to show */}
      {hasSources && (
        <button
          type="button"
          className="scan-view-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide sources" : "View sources"}
        </button>
      )}

      {/* Expanded sources — a vertical list of full-width source rows */}
      {expanded && hasSources && (
        <div className="scan-sources-list">
          {story.sources.map((src) =>
            src.type === "tweet" ? (
              <SourceTweetCard key={src.url} source={src} />
            ) : (
              <SourceArticleCard key={src.url} source={src} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── ScanNewsGrid ──────────────────────────────────────────────────────────────

export function ScanNewsGrid({ items }: { items: RawStory[] }) {
  if (items.length === 0) return null;
  return (
    <div className="scan-grid">
      {items.map((story) => (
        <ScanNewsCard key={story.dedupeKey} story={story} />
      ))}
    </div>
  );
}
