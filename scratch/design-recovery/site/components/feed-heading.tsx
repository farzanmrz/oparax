"use client";

import RubberSegment from "./react-bits/RubberSegment";
import type { DirectionProps } from "./types";
import { sharedCopy } from "../content/free-preview-copy";

export function FeedHeading({
  title,
  description,
  feedMode,
  onFeedMode,
}: Pick<DirectionProps, "feedMode" | "onFeedMode"> & {
  title: string;
  description?: string;
}) {
  return (
    <header className="exploration-feed-heading">
      <h1>{title}</h1>
      <RubberSegment
        className="feed-modes"
        value={feedMode}
        items={[
          { value: "direct", label: sharedCopy.feed.direct },
          { value: "clustered", label: sharedCopy.feed.clustered },
        ]}
        onChange={(value) => {
          if (value === "direct" || value === "clustered") onFeedMode(value);
        }}
        trackColor="var(--soft)"
        thumbColor="var(--blue)"
        textColor="var(--ink)"
        activeTextColor="var(--button-ink)"
        size="md"
        stretch={12}
        squash={0}
        speed={2}
        draggable={false}
        aria-label={sharedCopy.feed.mode}
      />
      {description && <p>{description}</p>}
    </header>
  );
}
