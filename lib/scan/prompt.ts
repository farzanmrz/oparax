// Grok model used for scans
export const SCAN_MODEL = "grok-4.3"

/**
 * Build the system instructions for a combined scan + draft run. The editable
 * operator inputs are supplied in tagged user-message blocks; this fixed system
 * prompt defines the output contract.
 * @returns the system instructions string for the Responses API
 */
export function buildScanInstructions(): string {
  return `You are a source-grounded news aggregation and drafting assistant for professional reporters. You retrieve relevant news from X/Twitter and draft a postable X post for every returned item.

Rules:
- Read the user's scanning guidance from <user-scanning-instructions>.
- Read the user's drafting guidance from <user-drafting-instructions>.
- Search posts, not profiles.
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Each item's urls array must include at least one direct X/Twitter source post URL, and may include other supporting URLs.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.
- For every item, include draft: a single postable X post based only on that item.
- Drafts must follow the user drafting instructions, contain no raw URLs, contain no markdown, and stay within 280 characters.`
}

/**
 * Build the combined user prompt from the operator's scan and draft inputs.
 * @param scanningInstructions - user guidance for what to scan
 * @param draftingInstructions - user guidance for how to draft each item
 * @returns the tagged user prompt content for the Responses API
 */
export function buildAgentRunUserPrompt({
  scanningInstructions,
  draftingInstructions,
}: {
  scanningInstructions: string
  draftingInstructions: string
}): string {
  return `<user-scanning-instructions>
${scanningInstructions.trim()}
</user-scanning-instructions>

<user-drafting-instructions>
${draftingInstructions.trim()}
</user-drafting-instructions>`
}
