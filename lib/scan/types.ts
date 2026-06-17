export interface ScanMetrics {
  costUsd: number | null;
  elapsedMs: number;
  xSearchCalls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface StorySource {
  type: "tweet" | "article";
  url: string;
  authorName?: string; // tweet display name OR article site name
  handle?: string; // tweet @handle (no @)
  title?: string; // article headline
  text?: string; // tweet text
  postedAt?: string; // ISO 8601 if known
}

export interface PreviewStory {
  title: string;
  summary: string;
  sourceUrls: string[];
  primaryTweetUrl: string;
  dedupeKey: string;
  draft: string;
  /** Preview-only enrichment: structured per-source metadata. Not persisted to DB. */
  sources: StorySource[];
}
