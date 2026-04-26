import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/scan/route"

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
  return new Request("http://localhost:3000/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })
    process.env.XAI_API_KEY = "test-key"
  })

  it("returns 400 when description is missing", async () => {
    const response = await POST(
      createJsonRequest({
        description: "   ",
        handles: [],
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "description is required and must be a non-empty string.",
    })
    expect(mockResponsesCreate).not.toHaveBeenCalled()
  })

  it("returns a source-grounded knowledge bank on success", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Hansi Flick separates praise from private Xavi matter",
            aggregatedContext:
              "Flick praised Barca's young players after the Bilbao match, while also treating his comments about Xavi as a separate private matter.",
            evidencePoints: [
              "Flick highlighted Pau Cubarsi, Lamine Yamal, Fermin Lopez, and Marc Bernal after the win.",
              "He described the Xavi topic as private rather than expanding on it publicly.",
            ],
            primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
            supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
            sourceHandles: ["FabrizioRomano"],
            sourceUrls: ["https://x.com/FabrizioRomano/status/1"],
          },
        ],
      }),
    })

    const response = await POST(
      createJsonRequest({
        description: "Barcelona news from Fabrizio Romano",
        handles: ["FabrizioRomano"],
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      generatedAt: "2026-03-10T12:00:00.000Z",
      headlines: [
        expect.objectContaining({
          id: "headline-1",
          title: "Hansi Flick separates praise from private Xavi matter",
          sourceHandles: ["FabrizioRomano"],
        }),
      ],
    })

    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "grok-4-1-fast-reasoning",
        tools: [
          expect.objectContaining({
            type: "x_search",
            allowed_x_handles: ["FabrizioRomano"],
          }),
        ],
      }),
    )
  })

  it("rejects malformed model output", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({
        generatedAt: "2026-03-10T12:00:00.000Z",
        headlines: [
          {
            id: "headline-1",
            title: "Club agrees deal",
            sourceHandles: ["FabrizioRomano"],
          },
        ],
      }),
    })

    const response = await POST(
      createJsonRequest({
        description: "Transfer news",
        handles: ["FabrizioRomano"],
      }),
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "News scanning service returned an invalid result.",
    })
  })
})
