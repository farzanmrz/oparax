import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/draft/route"
import { countTweetCharacters, TWEET_CHAR_LIMIT } from "@/lib/workflow-drafting"

const mockGetUser = vi.fn()
const mockResponsesCreate = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/lib/xai", () => ({
  createXaiClient: () => ({
    responses: {
      create: (...args: unknown[]) => mockResponsesCreate(...args),
    },
  }),
  extractResponseText: (response: { output_text?: string }) =>
    response.output_text ?? null,
}))

function createJsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const baseBody = {
  monitoringDescription: "Barcelona news from Fabrizio Romano",
  draftingInstructions: "Be direct, enthusiastic, and start with the siren emoji.",
  exampleTweets: ["BREAKING: Example tweet"],
  headlines: [
    {
      id: "headline-1",
      title: "Flick separates two Barcelona angles",
      aggregatedContext:
        "Flick praised several young Barcelona players after the Bilbao match, while also treating the topic of Xavi as a separate private matter.",
      evidencePoints: [
        "Flick praised Pau Cubarsi, Lamine Yamal, Fermin Lopez, and Marc Bernal after the win.",
        "He described the Xavi issue as private and declined to expand on it publicly.",
      ],
      primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
      supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
      sourceHandles: ["FabrizioRomano"],
      sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
    },
  ],
}

describe("POST /api/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })
    process.env.XAI_API_KEY = "test-key"
  })

  it("returns 400 when an example tweet exceeds the character limit", async () => {
    const response = await POST(
      createJsonRequest({
        ...baseBody,
        exampleTweets: ["x".repeat(TWEET_CHAR_LIMIT + 1)],
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: `Example tweets must be ${TWEET_CHAR_LIMIT} characters or fewer.`,
    })
    expect(mockResponsesCreate).not.toHaveBeenCalled()
  })

  it("builds the draft prompt from accumulated knowledge and excludes source metadata", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        drafts: [
          {
            headlineId: "headline-1",
            headlineTitle: baseBody.headlines[0].title,
            text: "🚨 Flick keeps the focus on Barca's young stars after Bilbao and leaves the Xavi topic private.",
          },
        ],
      }),
    })

    const response = await POST(createJsonRequest(baseBody))
    expect(response.status).toBe(200)

    const firstCall = mockResponsesCreate.mock.calls[0][0]
    const userPrompt = firstCall.input[1].content as string

    expect(userPrompt).toContain("aggregatedContext")
    expect(userPrompt).toContain("evidencePoints")
    expect(userPrompt).not.toContain("sourceHandles")
    expect(userPrompt).not.toContain("sourceUrls")
    expect(userPrompt).not.toContain("primaryTweetUrl")
    expect(userPrompt).not.toContain("supportingTweetUrls")
  })

  it("repairs drafts that include raw source urls", async () => {
    mockResponsesCreate
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          drafts: [
            {
              headlineId: "headline-1",
              headlineTitle: baseBody.headlines[0].title,
              text: "🚨 Flick praises Barca's youngsters after Bilbao. https://x.com/FabrizioRomano/status/1",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          drafts: [
            {
              headlineId: "headline-1",
              headlineTitle: baseBody.headlines[0].title,
              text: "🚨 Flick praises Barca's young stars after Bilbao and keeps the Xavi matter private.",
            },
          ],
        }),
      })

    const response = await POST(createJsonRequest(baseBody))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      drafts: [
        {
          headlineId: "headline-1",
          headlineTitle: baseBody.headlines[0].title,
          text: "🚨 Flick praises Barca's young stars after Bilbao and keeps the Xavi matter private.",
          charCount: countTweetCharacters(
            "🚨 Flick praises Barca's young stars after Bilbao and keeps the Xavi matter private.",
          ),
          isOverflow: false,
        },
      ],
    })

    expect(mockResponsesCreate).toHaveBeenCalledTimes(2)
  })

  it("returns 502 when the repair pass still produces invalid output", async () => {
    mockResponsesCreate
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          drafts: [
            {
              headlineId: "headline-1",
              headlineTitle: baseBody.headlines[0].title,
              text: "🚨 Flick update https://x.com/FabrizioRomano/status/1",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify({
          drafts: [
            {
              headlineId: "headline-1",
              headlineTitle: baseBody.headlines[0].title,
              text: "🚨 Still invalid https://x.com/FabrizioRomano/status/1",
            },
          ],
        }),
      })

    const response = await POST(createJsonRequest(baseBody))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "Drafting service could not produce valid tweet text.",
    })
  })

  it("rejects incomplete draft sets that do not match the selected headlines", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        drafts: [],
      }),
    })

    const response = await POST(createJsonRequest(baseBody))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "Drafting service returned an incomplete result.",
    })
  })
})
