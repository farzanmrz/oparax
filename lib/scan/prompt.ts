// Grok model used for scans
export const SCAN_MODEL = "grok-4.3";

/**
 * Build the system instructions for a scan run. The scan retrieves news items ONLY —
 * drafting is a separate DeepSeek leg, so this prompt deliberately does NOT ask for
 * post text. The editable operator inputs are supplied in tagged user-message blocks;
 * this fixed system prompt defines the output contract.
 * @returns the system instructions string for the Responses API
 */
export function buildScanInstructions(): string {
  return `You are a source-grounded news aggregation assistant for professional reporters. You retrieve relevant, recent news from X/Twitter (and the web when enabled). You do NOT write posts — drafting happens in a separate step.

Rules:
- Read the user's scanning guidance from <user-scanning-instructions>.
- Search posts, not profiles.
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Each item's urls array must include at least one direct X/Twitter source post URL, and may include other supporting URLs.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.
- For every item, include sources: an array with one entry per source URL. For each source:
  - Set type to "tweet" for X/Twitter post URLs or "article" for web/news URLs.
  - Set url to the exact source URL.
  - For tweets: include authorName (display name), handle (username without @), text (tweet text), and postedAt (ISO 8601 date/time) if available.
  - For articles: include title (headline), authorName (publication or site name), and postedAt (ISO 8601 date/time) if available.
  - Do NOT invent or fabricate avatars, profile images, or metadata you do not have. Omit optional fields rather than guessing.`;
}

/**
 * Build the user prompt from the operator's scan input. Drafting guidance is NOT
 * included — the scan retrieves items only; voice/style is applied by the separate
 * DeepSeek draft leg.
 * @param scanningInstructions - user guidance for what to scan
 * @returns the tagged user prompt content for the Responses API
 */
export function buildAgentRunUserPrompt({
  scanningInstructions,
}: {
  scanningInstructions: string;
}): string {
  return `<user-scanning-instructions>
${scanningInstructions.trim()}
</user-scanning-instructions>`;
}
