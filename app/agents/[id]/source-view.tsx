"use client";

import { useMemo, useState } from "react";
import type { FeedSourceView } from "@/lib/agent/feed-query";
import { ExpandableBody } from "./expandable-body";
import { PostBody } from "./post-card";
import styles from "./source-tweet.module.css";

export function SourceChip({ kind }: { kind: FeedSourceView["kind"] }) {
  return (
    <span
      aria-label={kind === "x" ? "Source: X" : "Source: website"}
      className={styles.chip}
      role="img"
    >
      {kind === "x" ? (
        <svg aria-hidden="true" fill="currentColor" height="12" viewBox="0 0 24 24" width="12">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ) : (
        <span aria-hidden="true">◎</span>
      )}
    </span>
  );
}

function MediaStrip({ source }: { source: FeedSourceView }) {
  if (!source.mediaThumbs.length) return null;
  return (
    <div className={styles.mediaStrip}>
      {source.mediaThumbs.map((media) => (
        <span className={styles.thumb} key={media.thumbUrl}>
          {/* biome-ignore lint/performance/noImgElement: media thumbs straight from X's CDN — next/image would only proxy them */}
          <img alt="" src={media.thumbUrl} />
          {media.kind === "video" ? (
            <span aria-hidden="true" className={styles.playGlyph}>
              ▶
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function SourceTweetView({
  source,
  translation,
}: {
  source: FeedSourceView;
  translation: string | null;
}) {
  const [original, setOriginal] = useState(false);
  const language = useMemo(() => {
    try {
      return source.lang ? new Intl.DisplayNames("en", { type: "language" }).of(source.lang) : null;
    } catch {
      return null;
    }
  }, [source.lang]);
  if (source.kind !== "x")
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">{source.title}</p>
        <p className="text-muted-foreground">{source.siteName}</p>
        {source.kind === "article" ? <ExpandableBody>{source.text}</ExpandableBody> : null}
      </div>
    );
  const text = translation && !original ? translation : source.text;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {source.gone ? <span className={styles.archived}>No longer on X · archived</span> : null}
      {translation && !original ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{language ? `Translated from ${language}` : "Translated"}</span>
          <button
            className="min-h-11 text-foreground underline"
            onClick={() => setOriginal(true)}
            type="button"
          >
            View original
          </button>
        </div>
      ) : null}
      {translation && original ? (
        <button
          className="min-h-11 self-start underline"
          onClick={() => setOriginal(false)}
          type="button"
        >
          View translation
        </button>
      ) : null}
      <ExpandableBody>
        <PostBody mediaUrls={source.mediaUrls} text={text} urls={source.urlEntities} />
        <MediaStrip source={source} />
      </ExpandableBody>
      {source.url && !source.gone ? (
        <a
          className="self-start text-sm font-medium underline"
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          View on X ↗
        </a>
      ) : null}
    </div>
  );
}
