import { createClient } from "@/lib/supabase/server";
import { AgentsList } from "./agents-list";

/**
 * Agents listing — the post-login landing page. This server component fetches
 * the signed-in reporter's desks newest-first and passes them down. There's no
 * explicit user filter: app/agents/layout.tsx guards auth and RLS scopes the
 * rows to the reporter. The Agent type in agents-list.tsx documents the shape
 * each row expects (id, name, beat, createdAt). Empty / loading / error states
 * live in AgentsList.
 */
export default async function AgentsListingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, beat, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return <AgentsList agents={[]} error="Something went wrong loading your desks." />;
  }
  return (
    <AgentsList
      agents={data.map((row) => ({
        id: row.id,
        name: row.name,
        beat: row.beat,
        createdAt: row.created_at,
      }))}
    />
  );
}
