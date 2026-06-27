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

/**
 * A scanned story BEFORE drafting — produced by the Grok scan leg. The draft is added
 * separately by the DeepSeek draft leg (a PreviewStory is a RawStory + draft).
 */
export interface RawStory {
  title: string;
  summary: string;
  sourceUrls: string[];
  primaryTweetUrl: string;
  dedupeKey: string;
  /** Preview-only enrichment: structured per-source metadata. Not persisted to DB. */
  sources: StorySource[];
}

/** A RawStory with its drafted X post attached (after the DeepSeek draft leg). */
export interface PreviewStory extends RawStory {
  draft: string;
}

/**
 * Result of the chat `scan` tool — news ITEMS only (no drafts). The create chat's scan
 * phase renders these; the reporter tunes retrieval (re-scan) before any drafting. An empty
 * `items` with a `notice` means a gated scan or an error.
 */
export interface ScanToolResult {
  items: RawStory[];
  metrics: ScanMetrics;
  notice?: string;
}

/**
 * Result of the chat `draft` tool — one tweet per item (PreviewStory[]). The draft phase
 * renders these; the reporter tunes voice (re-draft). An empty `stories` with a `notice`
 * means "scan first" or an error. One shared type so the server tool and both client
 * consumers (chat-message-row, agent-chat) can't drift.
 */
export interface DraftToolResult {
  stories: PreviewStory[];
  metrics: ScanMetrics;
  notice?: string;
}
