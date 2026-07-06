import { AgentsList, type Agent } from "./agents-list";

/**
 * Agents listing — the post-login landing page. A responsive card grid of the
 * user's news desks with search + sort and a prominent "New agent" action.
 * AgentsList takes the desks as a prop so it can render straight from persisted
 * data in a later slice; for now we seed a couple of mock desks so the grid
 * design is visible. The empty / loading / error states live in AgentsList.
 */
export default function AgentsListingPage() {
  const now = Date.now();
  const mockAgents: Agent[] = [
    {
      id: "capitol-wire",
      name: "Capitol Wire",
      beat: "US federal politics, floor votes, and agency rulemaking",
      status: "live",
      lastActiveAt: new Date(now - 3 * 60_000).toISOString(),
    },
    {
      id: "market-open",
      name: "Market Open",
      beat: "Equities, earnings, and macro moves before the bell",
      status: "idle",
      lastActiveAt: new Date(now - 5 * 60 * 60_000).toISOString(),
    },
  ];

  return <AgentsList agents={mockAgents} />;
}
