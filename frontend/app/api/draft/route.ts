import { NextResponse } from "next/server"
import {
  buildDraftRepairUserPrompt,
  buildDraftUserPrompt,
  prompts,
} from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"
import {
  countTweetCharacters,
  createDraftedTweet,
  getExampleTweetError,
  normalizeExampleTweets,
  parseKnowledgeHeadline,
  TWEET_CHAR_LIMIT,
} from "@/lib/workflow-drafting"
import type { KnowledgeHeadline } from "@/lib/workflow-drafting"
import { createXaiClient, extractResponseText } from "@/lib/xai"

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

const RAW_URL_RE = /(https?:\/\/\S+|(?:^|\s)x\.com\/\S+)/i
const MARKDOWN_RE = /\*\*|(^|\n)\s*#{1,6}\s+/m

const draftResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          headlineId: {
            type: "string",
            description: "The id of the headline this draft belongs to.",
          },
          headlineTitle: {
            type: "string",
            description: "The title of the headline this draft belongs to.",
          },
          text: {
            type: "string",
            maxLength: TWEET_CHAR_LIMIT,
            description: "The drafted tweet body only.",
          },
        },
        required: ["headlineId", "headlineTitle", "text"],
      },
    },
  },
  required: ["drafts"],
} as const

type ParsedDraft = {
  headlineId: string
  headlineTitle: string
  text: string
}

type RepairCandidate = {
  headline: KnowledgeHeadline
  invalidText: string
  issue: string
}

function getDraftIssue(text: string): string | null {
  if (!text.trim()) {
    return "Draft is empty."
  }

  if (countTweetCharacters(text) > TWEET_CHAR_LIMIT) {
    return `Draft exceeds ${TWEET_CHAR_LIMIT} characters.`
  }

  if (RAW_URL_RE.test(text)) {
    return "Draft includes raw URLs."
  }

  if (MARKDOWN_RE.test(text)) {
    return "Draft includes markdown or heading formatting."
  }

  return null
}

function parseDraftResponse(outputText: string): ParsedDraft[] | null {
  const parsed = JSON.parse(outputText) as { drafts?: ParsedDraft[] }
  return Array.isArray(parsed.drafts) ? parsed.drafts : null
}

async function requestDraftBatch(input: {
  model: ReturnType<typeof createXaiClient>
  systemPrompt: string
  userPrompt: string
}) {
  const response = await input.model.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tweet_drafts",
        schema: draftResponseJsonSchema,
        strict: true,
      },
    },
  })

  const outputText = extractResponseText(response)
  if (!outputText) {
    throw new Error("Drafting service returned an empty response.")
  }

  const drafts = parseDraftResponse(outputText)
  if (!drafts) {
    throw new Error("Drafting service returned an invalid result.")
  }

  return drafts
}

function collectDraftBatch(
  rawDrafts: ParsedDraft[],
  expectedHeadlines: KnowledgeHeadline[],
) {
  if (rawDrafts.length !== expectedHeadlines.length) {
    return { error: "Drafting service returned an incomplete result." }
  }

  const expected = new Map(expectedHeadlines.map((headline) => [headline.id, headline]))
  const seenHeadlineIds = new Set<string>()
  const acceptedDrafts = new Map<string, ParsedDraft>()
  const repairCandidates: RepairCandidate[] = []

  for (const draft of rawDrafts) {
    if (
      typeof draft?.headlineId !== "string" ||
      typeof draft?.headlineTitle !== "string" ||
      typeof draft?.text !== "string"
    ) {
      return { error: "Drafting service returned an invalid result." }
    }

    const sourceHeadline = expected.get(draft.headlineId)
    if (!sourceHeadline || seenHeadlineIds.has(draft.headlineId)) {
      return { error: "Drafting service returned mismatched headlines." }
    }

    seenHeadlineIds.add(draft.headlineId)

    const trimmedText = draft.text.trim()
    const issue = getDraftIssue(trimmedText)

    if (issue) {
      repairCandidates.push({
        headline: sourceHeadline,
        invalidText: trimmedText,
        issue,
      })
      continue
    }

    acceptedDrafts.set(draft.headlineId, {
      headlineId: draft.headlineId,
      headlineTitle: sourceHeadline.title,
      text: trimmedText,
    })
  }

  if (seenHeadlineIds.size !== expected.size) {
    return { error: "Drafting service returned an incomplete result." }
  }

  return { acceptedDrafts, repairCandidates }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return error("Authentication required.", 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON.", 400)
  }

  if (!body || typeof body !== "object") {
    return error("Request body must be a JSON object.", 400)
  }

  const {
    monitoringDescription,
    draftingInstructions,
    exampleTweets,
    headlines,
  } = body as {
    monitoringDescription?: unknown
    draftingInstructions?: unknown
    exampleTweets?: unknown
    headlines?: unknown
  }

  if (
    typeof monitoringDescription !== "string" ||
    !monitoringDescription.trim()
  ) {
    return error(
      "monitoringDescription is required and must be a non-empty string.",
      400,
    )
  }

  if (
    typeof draftingInstructions !== "string" ||
    !draftingInstructions.trim()
  ) {
    return error(
      "draftingInstructions is required and must be a non-empty string.",
      400,
    )
  }

  if (!Array.isArray(exampleTweets)) {
    return error("exampleTweets must be an array.", 400)
  }

  const normalizedExamples = normalizeExampleTweets(
    exampleTweets.filter((tweet): tweet is string => typeof tweet === "string"),
  )

  const invalidExample = normalizedExamples.find((tweet) => getExampleTweetError(tweet))
  if (invalidExample) {
    return error(getExampleTweetError(invalidExample) ?? "Invalid example tweet.", 400)
  }

  if (!Array.isArray(headlines) || headlines.length === 0) {
    return error("At least one headline must be provided.", 400)
  }

  const validHeadlines = headlines
    .map((headline) => parseKnowledgeHeadline(headline))
    .filter((headline): headline is KnowledgeHeadline => headline !== null)

  if (validHeadlines.length !== headlines.length) {
    return error("headlines must be an array of valid headline objects.", 400)
  }

  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not configured.")
    return error("Server configuration error.", 500)
  }

  try {
    const model = createXaiClient()
    const initialDrafts = await requestDraftBatch({
      model,
      systemPrompt: prompts.sysprompt_draft,
      userPrompt: buildDraftUserPrompt({
        monitoringDescription,
        draftingInstructions,
        exampleTweets: normalizedExamples,
        headlines: validHeadlines,
      }),
    })

    const initialCollection = collectDraftBatch(initialDrafts, validHeadlines)
    if ("error" in initialCollection) {
      return error(initialCollection.error, 502)
    }

    const draftMap = new Map(initialCollection.acceptedDrafts)

    if (initialCollection.repairCandidates.length > 0) {
      const repairedDrafts = await requestDraftBatch({
        model,
        systemPrompt: prompts.sysprompt_draft_repair,
        userPrompt: buildDraftRepairUserPrompt({
          monitoringDescription,
          draftingInstructions,
          exampleTweets: normalizedExamples,
          invalidDrafts: initialCollection.repairCandidates,
        }),
      })

      const repairedCollection = collectDraftBatch(
        repairedDrafts,
        initialCollection.repairCandidates.map((candidate) => candidate.headline),
      )

      if ("error" in repairedCollection) {
        return error(repairedCollection.error, 502)
      }

      if (repairedCollection.repairCandidates.length > 0) {
        return error("Drafting service could not produce valid tweet text.", 502)
      }

      for (const [headlineId, repairedDraft] of repairedCollection.acceptedDrafts.entries()) {
        draftMap.set(headlineId, repairedDraft)
      }
    }

    if (draftMap.size !== validHeadlines.length) {
      return error("Drafting service returned an incomplete result.", 502)
    }

    return NextResponse.json({
      drafts: validHeadlines.map((headline) =>
        createDraftedTweet({
          headlineId: headline.id,
          headlineTitle: headline.title,
          text: draftMap.get(headline.id)?.text ?? "",
        }),
      ),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach drafting service."

    if (
      message === "Drafting service returned an empty response." ||
      message === "Drafting service returned an invalid result."
    ) {
      return error(message, 502)
    }

    console.error("Grok draft error:", err instanceof Error ? err.message : err)
    return error("Failed to reach drafting service.", 502)
  }
}
