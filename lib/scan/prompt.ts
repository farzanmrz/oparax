// Grok model used for scans
export const SCAN_MODEL = "grok-4.3"

/**
 * Build the system instructions for a scan. Reproduced fresh from the proven
 * test-scan prompt, plus the "search posts, not profiles" steer (SPEC §3.2) to
 * keep the x_search sub-tool on posts rather than profile lookups.
 * @returns the system instructions string for the Responses API
 */
export function buildScanInstructions(): string {
  return `You are a source-grounded news aggregation assistant for professional reporters. You take the user prompt and retrieve relevant news about it.

Rules:
- Search posts, not profiles.
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Each item's urls array must include at least one direct X/Twitter source post URL, and may include other supporting URLs.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.`
}

/**
 * Build the user prompt from the monitor's monitoring description.
 * @param monitoringDescription - the monitor's free-text description of what to surface
 * @returns the user prompt content for the Responses API
 */
export function buildScanUserPrompt(monitoringDescription: string): string {
  const trimmed = monitoringDescription.trim()
  return trimmed || "Surface the latest distinct news from the monitored accounts."
}
