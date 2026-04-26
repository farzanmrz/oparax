import { beforeEach, describe, expect, it } from "vitest"
import {
  CREATE_WORKFLOW_DRAFTING_ID,
  createDraftedTweet,
  createEmptyWorkflowDraftingState,
  getExampleTweetError,
  getHeadlineTweetUrls,
  getWorkflowDraftingScopeId,
  loadWorkflowDraftingState,
  migrateWorkflowDraftingState,
  normalizeExampleTweets,
  parseStoredScanRunOutput,
  saveWorkflowDraftingState,
  TWEET_CHAR_LIMIT,
} from "@/lib/workflow-drafting"

describe("workflow drafting helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("normalizes examples by trimming blanks", () => {
    expect(
      normalizeExampleTweets([
        "  BREAKING: First example  ",
        "",
        "   ",
        "Confirmed: Second example",
      ]),
    ).toEqual(["BREAKING: First example", "Confirmed: Second example"])
  })

  it("flags example tweets above the tweet character limit", () => {
    expect(getExampleTweetError("x".repeat(TWEET_CHAR_LIMIT))).toBeNull()
    expect(getExampleTweetError("x".repeat(TWEET_CHAR_LIMIT + 1))).toBe(
      `Example tweets must be ${TWEET_CHAR_LIMIT} characters or fewer.`,
    )
  })

  it("computes draft char counts and overflow state", () => {
    expect(
      createDraftedTweet({
        headlineId: "headline-1",
        headlineTitle: "Headline",
        text: "x".repeat(TWEET_CHAR_LIMIT + 1),
      }),
    ).toMatchObject({
      charCount: TWEET_CHAR_LIMIT + 1,
      isOverflow: true,
    })
  })

  it("saves, loads, and migrates browser drafting state", () => {
    const state = {
      ...createEmptyWorkflowDraftingState("Monitor transfer news"),
      draftingProfile: {
        instructions: "Keep it authoritative and concise.",
        examples: ["BREAKING: Example tweet"],
      },
    }

    saveWorkflowDraftingState(localStorage, CREATE_WORKFLOW_DRAFTING_ID, state)

    expect(
      loadWorkflowDraftingState(localStorage, CREATE_WORKFLOW_DRAFTING_ID),
    ).toEqual(state)

    migrateWorkflowDraftingState(
      localStorage,
      CREATE_WORKFLOW_DRAFTING_ID,
      "workflow-123",
    )

    expect(
      loadWorkflowDraftingState(localStorage, CREATE_WORKFLOW_DRAFTING_ID),
    ).toBeNull()
    expect(loadWorkflowDraftingState(localStorage, "workflow-123")).toEqual(state)
  })

  it("creates trigger-scoped storage ids when a trigger id is present", () => {
    expect(getWorkflowDraftingScopeId("workflow-123")).toBe("workflow-123")
    expect(getWorkflowDraftingScopeId("workflow-123", "trigger-456")).toBe(
      "workflow-123:trigger-456",
    )
  })

  it("parses the new structured knowledge bank format", () => {
    const structured = parseStoredScanRunOutput(
      JSON.stringify({
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            aggregatedContext:
              "Multiple sources indicate the club reached an agreement and is now preparing the medical process.",
            evidencePoints: ["Fee agreed with the selling club", "Medical is expected next"],
            primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
            supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
            sourceHandles: ["FabrizioRomano"],
            sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
          },
        ],
      }),
    )

    expect(structured).toMatchObject({
      kind: "knowledge_bank",
      knowledgeBank: {
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            aggregatedContext: expect.stringContaining("agreement"),
          },
        ],
      },
    })
  })

  it("normalizes older structured scan output into the richer model", () => {
    const structured = parseStoredScanRunOutput(
      JSON.stringify({
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            summary: "Agreement reached for a new signing.",
            keyFacts: ["Fee agreed", "Medical pending"],
            sourceHandles: ["FabrizioRomano"],
            sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
            tweetUrls: [
              "https://x.com/FabrizioRomano/status/1",
              "https://x.com/FabrizioRomano/status/2",
            ],
          },
        ],
      }),
    )

    expect(structured).toEqual({
      kind: "knowledge_bank",
      knowledgeBank: {
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            aggregatedContext: "Agreement reached for a new signing.",
            evidencePoints: ["Fee agreed", "Medical pending"],
            primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
            supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
            sourceHandles: ["FabrizioRomano"],
            sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
          },
        ],
      },
    })
  })

  it("normalizes legacy browser drafting state on load", () => {
    localStorage.setItem(
      "workflowDrafting:__create__",
      JSON.stringify({
        monitoringDescription: "Barcelona news",
        draftingProfile: {
          instructions: "Be direct",
          examples: [" BREAKING: Example tweet "],
        },
        knowledgeBank: {
          generatedAt: "2026-03-10T12:00:00.000Z",
          headlines: [
            {
              id: "headline-1",
              title: "Club agrees deal",
              summary: "Agreement reached for a new signing.",
              keyFacts: ["Fee agreed", "Medical pending"],
              sourceHandles: ["FabrizioRomano"],
              sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
              tweetUrls: [
                "https://x.com/FabrizioRomano/status/1",
                "https://x.com/FabrizioRomano/status/2",
              ],
            },
          ],
        },
        selectedHeadlineIds: ["headline-1"],
        drafts: [
          {
            headlineId: "headline-1",
            headlineTitle: "Club agrees deal",
            text: "BREAKING: Club agrees deal",
            charCount: 26,
            isOverflow: false,
          },
        ],
      }),
    )

    expect(loadWorkflowDraftingState(localStorage, CREATE_WORKFLOW_DRAFTING_ID)).toEqual({
      monitoringDescription: "Barcelona news",
      draftingProfile: {
        instructions: "Be direct",
        examples: ["BREAKING: Example tweet"],
      },
      knowledgeBank: {
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            aggregatedContext: "Agreement reached for a new signing.",
            evidencePoints: ["Fee agreed", "Medical pending"],
            primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
            supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
            sourceHandles: ["FabrizioRomano"],
            sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
          },
        ],
      },
      selectedHeadlineIds: ["headline-1"],
      drafts: [
        {
          headlineId: "headline-1",
          headlineTitle: "Club agrees deal",
          text: "BREAKING: Club agrees deal",
          charCount: 26,
          isOverflow: false,
        },
      ],
    })
  })

  it("collects primary and supporting tweet urls without duplicates", () => {
    expect(
      getHeadlineTweetUrls({
        id: "headline-1",
        title: "Headline",
        aggregatedContext: "Context",
        evidencePoints: [],
        primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
        supportingTweetUrls: [
          "https://x.com/FabrizioRomano/status/1",
          "https://x.com/FabrizioRomano/status/2",
        ],
        sourceHandles: ["FabrizioRomano"],
        sourceUrls: [],
      }),
    ).toEqual([
      "https://x.com/FabrizioRomano/status/1",
      "https://x.com/FabrizioRomano/status/2",
    ])
  })

  it("falls back to legacy text for old scan results", () => {
    expect(parseStoredScanRunOutput("## Legacy result")).toEqual({
      kind: "legacy",
      text: "## Legacy result",
    })
  })
})
