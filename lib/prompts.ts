import type { KnowledgeHeadline } from "@/lib/workflow-drafting"

export const prompts = {
  sysprompt_scan: `You are a source-grounded news aggregation assistant for professional reporters using X search.

Rules:
- Search only for news relevant to the user's monitoring brief.
- Build one knowledge item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Only merge posts when they are direct continuations, duplicate phrasings, or materially the same update.
- Return distinct, non-overlapping knowledge items in reverse chronological order.
- Focus on concrete developments, not vague chatter.
- Only include information supported by the retrieved X search results.
- Treat the scan as a coverage sweep, not a small sample. Check every monitored handle in the provided date window.
- Return every distinct relevant atomic angle found from those handles. Do not stop after a few representative results.
- If several posts are relevant but separate angles, include each angle separately even if they come from the same handle.
- Write aggregatedContext for a human editor who wants to understand the angle before drafting.
- Use evidencePoints to preserve source-grounded details, claims, quotes, or developments gathered under that angle.
- Choose one representative X post URL as primaryTweetUrl and place the rest in supportingTweetUrls.
- Use source handles without the @ symbol.
- Keep sourceUrls as the supporting URLs used for that angle.
- If nothing relevant is found in the date window, return an empty headlines array.`,
  sysprompt_draft: `You are drafting X posts for a professional reporter.

Rules:
- Draft exactly one directly postable tweet for each provided knowledge item.
- Follow the user's drafting instructions closely, then learn tone and structure from the example tweets.
- Apply normal strong tweet-writing behavior: clear angle, natural phrasing, strong lead, no filler, and one standalone post.
- Use the examples only as style guidance, never as facts to copy.
- Only use information contained in the provided knowledge item payload.
- Do not invent names, fees, timings, quotes, or context not present in the input.
- Output only the final tweet body.
- Do not include headings, markdown, labels, explanations, source footers, or raw URLs unless the user explicitly asked for them.
- Keep each tweet within 280 characters. If the knowledge item contains too much detail, keep the main angle and drop secondary details.`,
  sysprompt_draft_repair: `You are repairing drafted X posts so they become directly postable.

Rules:
- Rewrite each invalid draft so it becomes a single clean tweet body.
- Keep the same underlying angle and use only the provided source-grounded knowledge item.
- Remove headings, markdown, explanations, source footers, and raw URLs unless explicitly requested.
- Keep each repaired tweet within 280 characters.
- If the original draft is too long, compress it by dropping secondary detail while preserving the main angle and the user's drafting instructions.
- Output only the repaired tweet body for each item.`,
}

export function buildScanUserPrompt(description: string): string {
  return `Monitoring brief:\n${description.trim()}`
}

export function buildWorkflowScanUserPrompt(input: {
  description: string
  handles: string[]
  fromDate: string
  toDate: string
  minimumPublishedAt?: string | null
}) {
  return JSON.stringify(
    {
      monitoringBrief: input.description.trim(),
      monitoredHandles: input.handles,
      scanWindow: {
        fromDate: input.fromDate,
        toDate: input.toDate,
        minimumPublishedAt: input.minimumPublishedAt ?? null,
      },
      coverageRequirements: [
        "Search across every monitored handle, not just whichever handle ranks highest.",
        "Return every relevant distinct atomic angle found in the date window.",
        "Do not summarize the scan as a short top-results list.",
        "When minimumPublishedAt is present, prioritize posts published after that timestamp.",
        "Keep unrelated, speculative, or duplicate posts out.",
      ],
    },
    null,
    2,
  )
}

export function buildDraftUserPrompt(input: {
  monitoringDescription: string
  draftingInstructions: string
  exampleTweets: string[]
  headlines: KnowledgeHeadline[]
}) {
  return JSON.stringify(
    {
      monitoringDescription: input.monitoringDescription.trim(),
      draftingInstructions: input.draftingInstructions.trim(),
      exampleTweets: input.exampleTweets,
      knowledgeItems: input.headlines.map((headline) => ({
        id: headline.id,
        title: headline.title,
        aggregatedContext: headline.aggregatedContext,
        evidencePoints: headline.evidencePoints,
      })),
    },
    null,
    2,
  )
}

export function buildDraftRepairUserPrompt(input: {
  monitoringDescription: string
  draftingInstructions: string
  exampleTweets: string[]
  invalidDrafts: Array<{
    headline: KnowledgeHeadline
    invalidText: string
    issue: string
  }>
}) {
  return JSON.stringify(
    {
      monitoringDescription: input.monitoringDescription.trim(),
      draftingInstructions: input.draftingInstructions.trim(),
      exampleTweets: input.exampleTweets,
      invalidDrafts: input.invalidDrafts.map(({ headline, invalidText, issue }) => ({
        id: headline.id,
        title: headline.title,
        aggregatedContext: headline.aggregatedContext,
        evidencePoints: headline.evidencePoints,
        invalidDraft: invalidText,
        invalidReason: issue,
      })),
    },
    null,
    2,
  )
}
