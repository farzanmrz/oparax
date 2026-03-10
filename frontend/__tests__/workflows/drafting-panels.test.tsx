import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DraftPreviewPanel } from "@/components/draft-preview-panel"
import { KnowledgeBankPanel } from "@/components/knowledge-bank-panel"

vi.mock("react-tweet", () => ({
  Tweet: ({ id }: { id: string }) => <div data-testid={`tweet-${id}`}>Tweet {id}</div>,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const knowledgeBank = {
  generatedAt: "2026-03-10T12:00:00.000Z",
  headlines: [
    {
      id: "headline-1",
      title: "Flick splits praise and Xavi response into separate angles",
      aggregatedContext:
        "The gathered posts show Flick praising Barcelona's young players after the Bilbao match, while his remarks about Xavi were framed as a separate private matter.",
      evidencePoints: [
        "He highlighted Cubarsi, Yamal, Fermin Lopez, and Marc Bernal after the win.",
        "He described the Xavi matter as private rather than elaborating in public.",
      ],
      primaryTweetUrl: "https://x.com/FabrizioRomano/status/1",
      supportingTweetUrls: ["https://x.com/FabrizioRomano/status/2"],
      sourceHandles: ["FabrizioRomano"],
      sourceUrls: [
        "https://x.com/FabrizioRomano/status/1",
        "https://x.com/FabrizioRomano/status/2",
      ],
    },
  ],
}

describe("knowledge bank and draft preview panels", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("renders aggregated context, evidence points, and primary/supporting embeds distinctly", () => {
    render(
      <KnowledgeBankPanel
        knowledgeBank={knowledgeBank}
        selectedHeadlineIds={[]}
        canRunScan
        isScanning={false}
        scanError={null}
        onRunScan={() => {}}
        onToggleHeadline={() => {}}
      />,
    )

    expect(screen.getByText(/source-grounded angles/i)).toBeInTheDocument()
    expect(screen.getByText(/Evidence gathered/i)).toBeInTheDocument()
    expect(screen.getByText(/Primary source/i)).toBeInTheDocument()
    expect(screen.getByText(/Supporting sources/i)).toBeInTheDocument()
    expect(screen.getByTestId("tweet-1")).toBeInTheDocument()
    expect(screen.getByTestId("tweet-2")).toBeInTheDocument()
  })

  it("renders draft text as the primary content with provenance in secondary metadata", () => {
    render(
      <DraftPreviewPanel
        drafts={[
          {
            headlineId: "headline-1",
            headlineTitle: knowledgeBank.headlines[0].title,
            text: "🚨 Flick praises Barca's young stars after Bilbao and keeps the Xavi matter private.",
            charCount: 84,
            isOverflow: false,
          },
        ]}
        sourceHeadlines={knowledgeBank.headlines}
        canGenerateDrafts
        isDrafting={false}
        draftError={null}
        selectedCount={1}
        onGenerateDrafts={() => {}}
      />,
    )

    expect(screen.getByText(/keeps the Xavi matter private/i)).toBeInTheDocument()
    expect(screen.getByText(/^Based on:/i)).toBeInTheDocument()
    expect(screen.queryByText(/Source headline/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy draft/i })).toBeInTheDocument()
  })
})
