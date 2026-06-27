// Imports
import type { ScanItem, StorySourceItem } from "@/lib/scan/schema";
import type { RawStory } from "@/lib/scan/types";

// Regex to extract tweet id from X/Twitter status URL
const X_STATUS_RE = /https?:\/\/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i;

/**
 * Extract the numeric tweet id from an X/Twitter status URL.
 * @param url - a candidate source URL
 * @returns the tweet id, or null if the URL is not an X status URL
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(X_STATUS_RE);
  return match ? match[1] : null;
}

/**
 * Normalize one raw item: trim title/body, dedupe non-empty urls. Returns null
 * if the item lacks a title, body, or at least one url (mirrors the schema's
 * minItems:1 so empty items are dropped rather than stored).
 * @param value - one raw item from the parsed JSON
 * @returns a clean ScanItem or null
 */
function normalizeItem(value: unknown): ScanItem | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  if (!title || !body) return null;
  if (!Array.isArray(record.urls)) return null;

  const urls = [
    ...new Set(
      record.urls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  if (urls.length === 0) return null;

  // Extract sources array — default to [] if missing or malformed (matches schema .default([])).
  const sources: StorySourceItem[] = Array.isArray(record.sources)
    ? (record.sources.filter(
        (s): s is StorySourceItem =>
          typeof s === "object" &&
          s !== null &&
          ((s as Record<string, unknown>).type === "tweet" ||
            (s as Record<string, unknown>).type === "article"),
      ) as StorySourceItem[])
    : [];

  return {
    title,
    body,
    urls,
    sources,
  };
}

/**
 * Parse the scan's accumulated answer text into clean items.
 * @param answerText - the structured-JSON output text from the model
 * @returns the array of items, or null if the JSON could not be parsed
 */
export function parseScanItems(answerText: string): ScanItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answerText);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const items = (parsed as Record<string, unknown>).items;
  if (!Array.isArray(items)) return null;

  return items.map(normalizeItem).filter((item): item is ScanItem => item !== null);
}

/**
 * Map a clean item to its raw (pre-draft) story fields, choosing the first X status URL
 * as the primary tweet and deriving a stable dedupe key (tweet id → primary url →
 * first url → title) so (scan_id, dedupe_key) stays unique and non-empty. The draft is
 * attached later by the separate DeepSeek draft leg.
 * @param item - a normalized scan item
 * @returns the raw story fields (no draft; sources are added by storiesFromOutput)
 */
export function toRawStory(item: ScanItem): Omit<RawStory, "sources"> {
  const primaryTweetUrl = item.urls.find((url) => X_STATUS_RE.test(url)) ?? "";
  const tweetId = primaryTweetUrl ? extractTweetId(primaryTweetUrl) : null;
  // First non-empty wins (|| not ?? — primaryTweetUrl is "" when no X URL).
  const dedupeKey = tweetId || primaryTweetUrl || item.urls[0] || item.title;

  return {
    title: item.title,
    summary: item.body,
    sourceUrls: item.urls,
    primaryTweetUrl,
    dedupeKey,
  };
}
