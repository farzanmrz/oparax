// Raw URL (incl. bare x.com) — drafts must strip these (cost + correctness).
export const RAW_URL_RE = /(https?:\/\/\S+|(?:^|\s)x\.com\/\S+)/i;

// Markdown bold / heading markers — drafts must be plain post text.
export const MARKDOWN_RE = /\*\*|(^|\n)\s*#{1,6}\s+/m;

/**
 * Return a human-readable problem with a draft, or null when it is postable. There is NO
 * fixed length cap — the reporter sets their own post length (paid X accounts allow more), so
 * length is steered by the drafting instructions, not enforced here. Only empty text, raw
 * URLs, and markdown are hard failures.
 * @param text - the draft text to validate
 * @returns an issue message, or null if the draft is valid
 */
export function getDraftIssue(text: string): string | null {
  if (!text.trim()) {
    return "Draft is empty.";
  }
  if (RAW_URL_RE.test(text)) {
    return "Draft includes raw URLs.";
  }
  if (MARKDOWN_RE.test(text)) {
    return "Draft includes markdown or heading formatting.";
  }
  return null;
}
