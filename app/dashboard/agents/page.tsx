import { AgentChat } from "./agent-chat";

/**
 * Stub agents page: a minimal chat over the repo's eve agent, adapted from
 * eve's scaffold web template. Renders into the dashboard layout's stub
 * chrome; v0 owns the real design.
 */
export default function AgentsPage() {
  return (
    <div className="space-y-4">
      <h1>Agents</h1>
      <AgentChat />
    </div>
  );
}
