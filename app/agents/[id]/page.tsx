import { AgentDashboard, type AgentDetail } from "./agent-dashboard";

/**
 * Agent details page — the per-desk dashboard (wire feed, drafts, activity
 * traces). Static placeholder data below visualizes the design; a later slice
 * replaces it with the persisted agent looked up by `id`. The AgentDetail type
 * in agent-dashboard.tsx documents the exact shape that query must produce.
 */
export default async function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const placeholder: AgentDetail = {
    id,
    name: humanize(id),
    beat: "AI industry news — model releases, funding rounds, and policy moves",
    status: "live",
    itemsToday: 14,
    draftsPending: 2,
    postsPublished: 31,
    wire: [
      {
        id: "w1",
        headline: "Frontier lab announces new reasoning model with 10x context window",
        summary:
          "The release claims state-of-the-art results on long-horizon agentic benchmarks; API access opens next week with tiered pricing.",
        source: "Company blog",
        minutesAgo: 12,
        breaking: true,
      },
      {
        id: "w2",
        headline: "EU AI Act enforcement guidance published for general-purpose models",
        summary:
          "The guidance clarifies documentation duties for GPAI providers and sets the compliance timeline the industry has been waiting on.",
        source: "Regulatory filing",
        minutesAgo: 47,
      },
      {
        id: "w3",
        headline: "Chip startup raises $400M Series C to challenge inference incumbents",
        summary:
          "The round values the company at $4.1B; early customers report 3x cost reduction on large-batch inference workloads.",
        source: "Press release",
        minutesAgo: 128,
      },
    ],
    drafts: [
      {
        id: "d1",
        text: "New reasoning model just dropped with a 10x context window. If the benchmark numbers hold up, long-horizon agents just got a lot more practical. API opens next week.",
        status: "draft",
        minutesAgo: 9,
      },
      {
        id: "d2",
        text: "The EU's GPAI guidance is out. The headline: documentation duties are now concrete, and the compliance clock starts ticking. Full breakdown in thread.",
        status: "posted",
        minutesAgo: 51,
      },
    ],
    runs: [
      {
        id: "r1",
        label: "Aggregation run",
        minutesAgo: 12,
        steps: [
          "Scanned 6 sources on the AI industry beat",
          "Extracted 3 atomic news items, deduplicated 1",
          "Flagged 1 item as breaking (model release)",
          "Drafted 1 post in reporter voice for review",
        ],
      },
      {
        id: "r2",
        label: "Aggregation run",
        minutesAgo: 74,
        steps: [
          "Scanned 6 sources on the AI industry beat",
          "Extracted 2 atomic news items",
          "No breaking items; queued for the hourly digest",
        ],
      },
    ],
  };

  return <AgentDashboard agent={placeholder} />;
}

/** "capitol-wire" -> "Capitol Wire". Placeholder until real names come from the DB. */
function humanize(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
