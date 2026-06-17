"use client";

import { useState } from "react";
import type { PreviewStory, StorySource } from "@/lib/scan/types";
import { UserAvatar } from "@/components/agents/chat-avatars";
import { SourceTweetCard, SourceArticleCard } from "@/components/agents/source-cards";

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

export function ScanNewsCard({ story }: { story: PreviewStory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="scan-card">
      {/* Summary clamped to 2 lines */}
      <p className="scan-summary src-clamp2">{story.summary}</p>

      {/* Pills + avatar stack row */}
      <div className="scan-meta">
        <SourcePills sources={story.sources} />
        <AvatarStack sources={story.sources} />
      </div>

      {/* View sources toggle */}
      <button
        type="button"
        className="scan-view-btn"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide sources" : "View sources"}
      </button>

      {/* Expandable carousel */}
      {expanded && story.sources.length > 0 && (
        <div className="scan-carousel-wrap">
          <div className="scan-carousel">
            {story.sources.map((src) =>
              src.type === "tweet" ? (
                <SourceTweetCard key={src.url} source={src} variant="carousel" />
              ) : (
                <SourceArticleCard key={src.url} source={src} variant="carousel" />
              ),
            )}
          </div>
          <div className="scan-carousel-fade" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

// ── ScanNewsGrid ──────────────────────────────────────────────────────────────

export function ScanNewsGrid({ stories }: { stories: PreviewStory[] }) {
  if (stories.length === 0) return null;
  return (
    <div className="scan-grid">
      {stories.map((story) => (
        <ScanNewsCard key={story.dedupeKey} story={story} />
      ))}
    </div>
  );
}
