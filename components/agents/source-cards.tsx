"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/agents/chat-avatars";
import { ExternalGlyph } from "@/components/agents/chat-glyphs";
import type { StorySource } from "@/lib/scan/types";

function formatPostedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ── Favicon with initials fallback ───────────────────────────────────────────

function FaviconImg({ domain, fallbackText }: { domain: string; fallbackText: string }) {
  const [errored, setErrored] = useState(false);
  const initials =
    fallbackText
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || domain.slice(0, 2).toUpperCase();

  if (errored) {
    return (
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: 4,
          background: "oklch(0.42 0.04 250)",
          color: "oklch(1 0 0)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          font: "500 0.625rem/1 var(--font-sans)",
        }}
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    // biome-ignore lint/performance/noImgElement: favicon endpoint is external; next/image doesn't support arbitrary external URLs without config
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      style={{
        borderRadius: 3,
        flexShrink: 0,
        objectFit: "contain",
      }}
      onError={() => setErrored(true)}
    />
  );
}

// ── SourceTweetCard ───────────────────────────────────────────────────────────

export function SourceTweetCard({ source }: { source: StorySource }) {
  const date = formatPostedAt(source.postedAt);
  const displayName = source.authorName ?? source.handle ?? "Unknown";

  return (
    <div className="src-card src-card-tweet">
      {/* Header row: avatar + name + date + open icon */}
      <div className="src-card-head">
        <UserAvatar name={displayName} size={24} />
        <span className="src-card-name">{displayName}</span>
        {date && <span className="src-card-date">{date}</span>}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="src-card-open"
          aria-label="Open tweet"
        >
          <ExternalGlyph width={14} height={14} />
        </a>
      </div>
      {/* Body: tweet text clamped to 3 lines */}
      {source.text && <p className="src-card-body src-clamp3">{source.text}</p>}
    </div>
  );
}

// ── SourceArticleCard ─────────────────────────────────────────────────────────

export function SourceArticleCard({ source }: { source: StorySource }) {
  const domain = extractDomain(source.url);
  const date = formatPostedAt(source.postedAt);
  const displayName = source.authorName ?? domain;

  return (
    <div className="src-card src-card-article">
      {/* Header row: favicon + domain + date + open icon */}
      <div className="src-card-head">
        <FaviconImg domain={domain} fallbackText={displayName} />
        <span className="src-card-name">{domain}</span>
        {date && <span className="src-card-date">{date}</span>}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="src-card-open"
          aria-label="Open article"
        >
          <ExternalGlyph width={14} height={14} />
        </a>
      </div>
      {/* Body: article headline clamped to 3 lines */}
      {source.title && <p className="src-card-body src-clamp3">{source.title}</p>}
    </div>
  );
}
