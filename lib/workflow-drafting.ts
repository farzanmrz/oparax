export const TWEET_CHAR_LIMIT = 280
export const WORKFLOW_DRAFTING_STORAGE_PREFIX = "workflowDrafting:"
export const CREATE_WORKFLOW_DRAFTING_ID = "__create__"

export interface DraftingProfile {
  instructions: string
  examples: string[]
}

export interface KnowledgeSource {
  type: "tweet" | "site"
  title: string
  url: string
  publisher: string
}

export interface ScanToolCall {
  type: string
  name: string
  arguments: unknown
}

export interface ScanMetadata {
  model: string
  maxTurns: number
  serverSideToolUsage: Record<string, number>
  toolCalls: ScanToolCall[]
  costInUsdTicks: number | null
}

export interface KnowledgeHeadline {
  id: string
  title: string
  aggregatedContext: string
  evidencePoints: string[]
  primaryTweetUrl: string
  supportingTweetUrls: string[]
  sourceHandles: string[]
  sourceUrls: string[]
  publishedAt?: string
  sources?: KnowledgeSource[]
}

export interface KnowledgeBank {
  generatedAt: string
  headlines: KnowledgeHeadline[]
  scanMetadata?: ScanMetadata
}

export interface DraftedTweet {
  headlineId: string
  headlineTitle: string
  text: string
  charCount: number
  isOverflow: boolean
}

export interface WorkflowDraftingState {
  monitoringDescription: string
  draftingProfile: DraftingProfile
  knowledgeBank: KnowledgeBank | null
  selectedHeadlineIds: string[]
  drafts: DraftedTweet[]
}

export type ParsedScanRunOutput =
  | { kind: "knowledge_bank"; knowledgeBank: KnowledgeBank }
  | { kind: "legacy"; text: string }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
}

function normalizeSources(value: unknown): KnowledgeSource[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sources: KnowledgeSource[] = []
  const seenUrls = new Set<string>()

  for (const item of value) {
    if (!isObject(item)) continue

    const type = item.type === "tweet" || item.type === "site" ? item.type : null
    const url = normalizeString(item.url)

    if (!type || !url || seenUrls.has(url)) {
      continue
    }

    sources.push({
      type,
      url,
      title: normalizeString(item.title) ?? "",
      publisher: normalizeString(item.publisher) ?? "",
    })
    seenUrls.add(url)
  }

  return sources
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!isObject(value)) {
    return {}
  }

  const normalized: Record<string, number> = {}

  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key] = rawValue
    }
  }

  return normalized
}

function normalizeScanMetadata(value: unknown): ScanMetadata | null {
  if (!isObject(value)) {
    return null
  }

  const model = normalizeString(value.model)
  const maxTurns = value.maxTurns
  const costInUsdTicks = value.costInUsdTicks

  if (!model || typeof maxTurns !== "number") {
    return null
  }

  return {
    model,
    maxTurns,
    serverSideToolUsage: normalizeNumberRecord(value.serverSideToolUsage),
    toolCalls: Array.isArray(value.toolCalls)
      ? value.toolCalls
          .filter(isObject)
          .map((toolCall) => ({
            type: normalizeString(toolCall.type) ?? "",
            name: normalizeString(toolCall.name) ?? "",
            arguments: toolCall.arguments ?? null,
          }))
          .filter((toolCall) => toolCall.type || toolCall.name)
      : [],
    costInUsdTicks:
      typeof costInUsdTicks === "number" && Number.isFinite(costInUsdTicks)
        ? costInUsdTicks
        : null,
  }
}

function sourceUrlsByType(sources: KnowledgeSource[], type: KnowledgeSource["type"]) {
  return sources
    .filter((source) => source.type === type)
    .map((source) => source.url)
}

function parseLegacyKnowledgeHeadline(value: Record<string, unknown>): KnowledgeHeadline | null {
  const id = normalizeString(value.id)
  const title = normalizeString(value.title)
  const summary = normalizeString(value.summary)

  if (!id || !title || !summary || !isStringArray(value.keyFacts) || !isStringArray(value.tweetUrls)) {
    return null
  }

  const tweetUrls = normalizeStringArray(value.tweetUrls)
  const sourceUrls = normalizeStringArray(value.sourceUrls)
  const primaryTweetUrl = tweetUrls[0] ?? sourceUrls[0] ?? ""

  return {
    id,
    title,
    aggregatedContext: summary,
    evidencePoints: normalizeStringArray(value.keyFacts),
    primaryTweetUrl,
    supportingTweetUrls: tweetUrls.filter((url) => url !== primaryTweetUrl),
    sourceHandles: normalizeStringArray(value.sourceHandles),
    sourceUrls,
  }
}

export function parseKnowledgeHeadline(value: unknown): KnowledgeHeadline | null {
  if (!isObject(value)) return null

  const id = normalizeString(value.id)
  const title = normalizeString(value.title)

  if (!id || !title) {
    return null
  }

  const aggregatedContext = normalizeString(value.aggregatedContext)
  const explanation = normalizeString(value.explanation)
  const primaryTweetUrl = normalizeString(value.primaryTweetUrl)
  const publishedAt = normalizeString(value.publishedAt) ?? undefined
  const sources = normalizeSources(value.sources)

  if (aggregatedContext) {
    return {
      id,
      title,
      aggregatedContext,
      evidencePoints: normalizeStringArray(value.evidencePoints),
      primaryTweetUrl: primaryTweetUrl ?? "",
      supportingTweetUrls: normalizeStringArray(value.supportingTweetUrls).filter(
        (url) => url !== primaryTweetUrl,
      ),
      sourceHandles: normalizeStringArray(value.sourceHandles),
      sourceUrls: normalizeStringArray(value.sourceUrls),
      publishedAt,
      ...(sources.length > 0 && { sources }),
    }
  }

  if (explanation) {
    const tweetUrls = normalizeStringArray(value.sourceTweetUrls)
    const siteUrls = normalizeStringArray(value.sourceSiteUrls)
    const sourceHandles = normalizeStringArray(value.sourceHandles)

    return {
      id,
      title,
      aggregatedContext: explanation,
      evidencePoints: [],
      primaryTweetUrl: "",
      supportingTweetUrls: [
        ...new Set([...tweetUrls, ...sourceUrlsByType(sources, "tweet")]),
      ],
      sourceHandles: [
        ...new Set([
          ...sourceHandles,
          ...sources
            .filter((source) => source.type === "tweet")
            .map((source) => source.publisher)
            .filter(Boolean),
        ]),
      ],
      sourceUrls: [
        ...new Set([...siteUrls, ...sourceUrlsByType(sources, "site")]),
      ],
      publishedAt,
      ...(sources.length > 0 && { sources }),
    }
  }

  return parseLegacyKnowledgeHeadline(value)
}

export function countTweetCharacters(text: string): number {
  return Array.from(text).length
}

export function isTweetWithinLimit(text: string): boolean {
  return countTweetCharacters(text) <= TWEET_CHAR_LIMIT
}

export function getExampleTweetError(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (!isTweetWithinLimit(trimmed)) {
    return `Example tweets must be ${TWEET_CHAR_LIMIT} characters or fewer.`
  }

  return null
}

export function normalizeExampleTweets(examples: string[]): string[] {
  return examples
    .map((example) => example.trim())
    .filter((example) => example.length > 0)
}

export function createDraftedTweet(
  draft: Omit<DraftedTweet, "charCount" | "isOverflow">,
): DraftedTweet {
  const charCount = countTweetCharacters(draft.text)

  return {
    ...draft,
    charCount,
    isOverflow: charCount > TWEET_CHAR_LIMIT,
  }
}

export function isKnowledgeHeadline(value: unknown): value is KnowledgeHeadline {
  return parseKnowledgeHeadline(value) !== null
}

export function isKnowledgeBank(value: unknown): value is KnowledgeBank {
  return parseKnowledgeBank(value) !== null
}

export function parseKnowledgeBank(value: unknown): KnowledgeBank | null {
  if (!isObject(value) || typeof value.generatedAt !== "string") {
    return null
  }

  const rawHeadlines = Array.isArray(value.headlines)
    ? value.headlines
    : Array.isArray(value.newsItems)
      ? value.newsItems
      : null

  if (!rawHeadlines) {
    return null
  }

  const headlines = rawHeadlines
    .map((headline) => parseKnowledgeHeadline(headline))
    .filter((headline): headline is KnowledgeHeadline => headline !== null)

  if (headlines.length !== rawHeadlines.length) {
    return null
  }

  const scanMetadata = normalizeScanMetadata(value.scanMetadata)

  return {
    generatedAt: value.generatedAt,
    headlines,
    ...(scanMetadata && { scanMetadata }),
  }
}

function isDraftedTweet(value: unknown): value is DraftedTweet {
  if (!isObject(value)) return false

  return (
    typeof value.headlineId === "string" &&
    typeof value.headlineTitle === "string" &&
    typeof value.text === "string" &&
    typeof value.charCount === "number" &&
    typeof value.isOverflow === "boolean"
  )
}

function isDraftingProfile(value: unknown): value is DraftingProfile {
  if (!isObject(value)) return false

  return (
    typeof value.instructions === "string" && isStringArray(value.examples)
  )
}

export function createEmptyWorkflowDraftingState(
  monitoringDescription = "",
): WorkflowDraftingState {
  return {
    monitoringDescription,
    draftingProfile: {
      instructions: "",
      examples: [],
    },
    knowledgeBank: null,
    selectedHeadlineIds: [],
    drafts: [],
  }
}

export function isWorkflowDraftingState(
  value: unknown,
): value is WorkflowDraftingState {
  if (!isObject(value)) return false

  const knowledgeBank = value.knowledgeBank

  return (
    typeof value.monitoringDescription === "string" &&
    isDraftingProfile(value.draftingProfile) &&
    (knowledgeBank === null || isKnowledgeBank(knowledgeBank)) &&
    isStringArray(value.selectedHeadlineIds) &&
    Array.isArray(value.drafts) &&
    value.drafts.every(isDraftedTweet)
  )
}

export function getWorkflowDraftingStorageKey(workflowId: string): string {
  return `${WORKFLOW_DRAFTING_STORAGE_PREFIX}${workflowId}`
}

export function getWorkflowDraftingScopeId(
  workflowId: string,
  triggerId?: string,
): string {
  return triggerId ? `${workflowId}:${triggerId}` : workflowId
}

export function parseWorkflowDraftingState(
  value: string | null,
): WorkflowDraftingState | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (!isObject(parsed)) {
      return null
    }

    const knowledgeBank =
      parsed.knowledgeBank === null ? null : parseKnowledgeBank(parsed.knowledgeBank)

    if (
      typeof parsed.monitoringDescription !== "string" ||
      !isDraftingProfile(parsed.draftingProfile) ||
      (parsed.knowledgeBank !== null && !knowledgeBank) ||
      !isStringArray(parsed.selectedHeadlineIds) ||
      !Array.isArray(parsed.drafts) ||
      !parsed.drafts.every(isDraftedTweet)
    ) {
      return null
    }

    const validHeadlineIds = new Set(
      knowledgeBank?.headlines.map((headline) => headline.id) ?? [],
    )

    return {
      monitoringDescription: parsed.monitoringDescription,
      draftingProfile: {
        instructions: parsed.draftingProfile.instructions,
        examples: normalizeExampleTweets(parsed.draftingProfile.examples),
      },
      knowledgeBank,
      selectedHeadlineIds: parsed.selectedHeadlineIds.filter((headlineId) =>
        knowledgeBank ? validHeadlineIds.has(headlineId) : false,
      ),
      drafts: parsed.drafts.map((draft) =>
        createDraftedTweet({
          headlineId: draft.headlineId,
          headlineTitle: draft.headlineTitle,
          text: draft.text,
        }),
      ),
    }
  } catch {
    return null
  }
}

export function loadWorkflowDraftingState(
  storage: Storage,
  workflowId: string,
): WorkflowDraftingState | null {
  return parseWorkflowDraftingState(
    storage.getItem(getWorkflowDraftingStorageKey(workflowId)),
  )
}

export function saveWorkflowDraftingState(
  storage: Storage,
  workflowId: string,
  state: WorkflowDraftingState,
) {
  storage.setItem(getWorkflowDraftingStorageKey(workflowId), JSON.stringify(state))
}

export function migrateWorkflowDraftingState(
  storage: Storage,
  fromWorkflowId: string,
  toWorkflowId: string,
) {
  const fromKey = getWorkflowDraftingStorageKey(fromWorkflowId)
  const raw = storage.getItem(fromKey)
  if (!raw) return

  storage.setItem(getWorkflowDraftingStorageKey(toWorkflowId), raw)
  storage.removeItem(fromKey)
}

export function clearWorkflowDraftingState(storage: Storage, workflowId: string) {
  storage.removeItem(getWorkflowDraftingStorageKey(workflowId))
}

export function getHeadlineTweetUrls(headline: KnowledgeHeadline): string[] {
  return [
    ...new Set(
      [headline.primaryTweetUrl, ...headline.supportingTweetUrls]
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ]
}

export function parseStoredScanRunOutput(
  rawOutput: string | null,
): ParsedScanRunOutput | null {
  if (!rawOutput) return null

  try {
    const parsed = JSON.parse(rawOutput)
    const knowledgeBank = parseKnowledgeBank(parsed)

    if (knowledgeBank) {
      return { kind: "knowledge_bank", knowledgeBank }
    }
  } catch {
    // Legacy scan runs stored plain markdown/text.
  }

  return { kind: "legacy", text: rawOutput }
}
