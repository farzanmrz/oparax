import { AgentsList } from "./agents-list";

/**
 * Agents listing — the post-login landing page. Renders empty for now: once
 * persistence lands, this server component fetches the signed-in reporter's
 * desks and passes them down. The Agent type in agents-list.tsx documents the
 * shape each row expects (id, name, beat, status, lastActiveAt, createdAt,
 * itemsToday, postsPublished). Empty / loading / error states live in
 * AgentsList.
 */
export default function AgentsListingPage() {
  return <AgentsList agents={[]} />;
}
