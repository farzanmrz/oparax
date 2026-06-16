// Imports
import { TWEET_WEIGHTED_LIMIT, weightedLength } from "@/lib/draft/count";

// Raw URL (incl. bare x.com) — drafts must strip these (cost + correctness).
export const RAW_URL_RE = /(https?:\/\/\S+|(?:^|\s)x\.com\/\S+)/i;

// Markdown bold / heading markers — drafts must be plain tweet text.
export const MARKDOWN_RE = /\*\*|(^|\n)\s*#{1,6}\s+/m;

/**
 * Return a human-readable problem with a draft, or null when it is postable.
 * Reproduces the legacy getDraftIssue checks but counts weighted length.
 * @param text - the draft text to validate
 * @returns an issue message, or null if the draft is valid
 */
export function getDraftIssue(text: string): string | null {
  if (!text.trim()) {
    return "Draft is empty.";
  }
  if (weightedLength(text) > TWEET_WEIGHTED_LIMIT) {
    return `Draft exceeds ${TWEET_WEIGHTED_LIMIT} weighted characters.`;
  }
  if (RAW_URL_RE.test(text)) {
    return "Draft includes raw URLs.";
  }
  if (MARKDOWN_RE.test(text)) {
    return "Draft includes markdown or heading formatting.";
  }
  return null;
}
