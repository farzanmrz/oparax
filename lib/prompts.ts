import type { KnowledgeHeadline } from "@/lib/workflow-drafting"

export const prompts = {
  sysprompt_scan: `You are a source-grounded news aggregation assistant for professional reporters.

Rules:
- Use x_search for X coverage. When monitored X handles are provided, search those handles. When no monitored X handles are provided, run broad general X searches for the monitoring brief.
- Use web_search to search the wider web for relevant supporting or standalone site coverage.
- Search only for news relevant to the user's monitoring brief.
- Search broadly and deeply. Create multiple X and web search queries as needed for the monitoring brief, including obvious aliases, clubs, people, competitions, transfer targets, quoted claims, and related terminology.
- Do not treat the first results page as enough. Keep searching until the returned sources stop revealing new relevant angles within the API tool budget.
- The monitored X handles are an optional X scope, not the whole scan. Web coverage may produce site-only scan items, and general X coverage may produce tweet-backed scan items when no handles are supplied.
- Never simulate searches, source retrieval, URLs, or tool calls. If real retrieved sources do not support an item, omit it.
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Only merge posts when they are direct continuations, duplicate phrasings, or materially the same update.
- Focus on concrete developments, not vague chatter.
- Only include information supported by retrieved X or web sources.
- Write neutral reportorial aggregation only. Do not add drafting style, persuasion, jokes, flourish, or engagement framing.
- Do not include confidence markers, confidence scores, tool strategy commentary, or internal reasoning in any news item.
- Return tweet sources with type "tweet" and website sources with type "site".
- A news item may be supported by tweets, sites, or both.
- Put X post/profile URLs in sourceTweetUrls and non-X website URLs in sourceSiteUrls.
- Do not choose a primary source. Sources are peers unless the explanation itself says one outlet first reported or confirmed something.
- Do not write separate evidence bullets. Put the useful explanation in the explanation field.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.
- For broad briefs with many available developments, keep expanding coverage and return up to 100 distinct scan items. Do not invent items to hit this target.
- If a freshness hint is provided, use it to prioritize very recent developments, but do not treat it as a hard cutoff. Return relevant source-grounded items from the full scan window so downstream storage can dedupe what is already known.
- If several posts are relevant but separate angles, include each angle separately even if they come from the same handle.
- If nothing relevant is found in the date window, return an empty newsItems array.`,
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
      xSearchScope:
        input.handles.length > 0
          ? "Search each monitored handle and use broader X searches when they help find relevant developments."
          : "No monitored handles were provided. Run broad general X searches for relevant posts, people, titles, outlets, and keywords from the monitoring brief.",
      scanWindow: {
        fromDate: input.fromDate,
        toDate: input.toDate,
      },
      coverageTarget: {
        maxDistinctItems: 100,
        instruction:
          "For broad briefs, keep searching and return as many distinct source-grounded items as are genuinely available, up to 100. Do not stop at a small representative list.",
      },
      freshnessHint: {
        preferItemsPublishedAfter: input.minimumPublishedAt ?? null,
        hardFilter: false,
        note: input.minimumPublishedAt
          ? "Prioritize items after this timestamp, but still return relevant source-grounded items from the full scan window. The application will dedupe already-known items after the scan."
          : "No prior run timestamp is available.",
      },
      coverageRequirements: [
        input.handles.length > 0
          ? "Search across every monitored handle, not just whichever handle ranks highest."
          : "Use general X search because no monitored handles were provided.",
        "Search the wider web for supporting or standalone site coverage.",
        "Use both X and web search unless one tool genuinely returns no relevant sources.",
        "Return every relevant distinct atomic angle found in the date window.",
        "Do not summarize the scan as a short top-results list.",
        "For broad briefs with many relevant developments, continue toward the coverage target instead of stopping after a handful of items.",
        "Treat the freshness hint as ranking guidance, not as a reason to return an empty array when scan-window sources still exist.",
        "Keep unrelated, speculative, or duplicate posts out.",
        "Never simulate sources or tool use. Return only information grounded in retrieved sources.",
        "Keep explanations neutral and informational; drafting style comes later.",
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
