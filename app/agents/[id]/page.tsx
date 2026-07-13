import { notFound } from "next/navigation";
import { scheduleSchema } from "@/eve/agent/lib/desk-config";
import { createClient } from "@/lib/supabase/server";
import { AgentDashboard } from "./agent-dashboard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Agent details page — the per-desk dashboard. Fetches the signed-in reporter's
 * own desk by `id`; RLS scopes the query to rows they own, so an absent row and
 * another user's row are indistinguishable and both 404. A malformed persisted
 * cadence degrades to fallback text rather than crashing the page.
 */
export default async function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound(); // pre-empt a Postgres uuid cast error
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("name, beat, handles, drafting_instructions, account_tier, cadence, created_at")
    .eq("id", id)
    .maybeSingle();
  // A failed query is NOT a 404 — a transient error must not tell the reporter
  // their desk is gone. Throw to the error boundary instead.
  if (error) throw new Error("Failed to load the desk. Please try again.");
  if (!data) notFound(); // absent OR another user's row — RLS makes them identical

  const cadence = scheduleSchema.safeParse(data.cadence);
  return (
    <AgentDashboard
      agent={{
        name: data.name,
        beat: data.beat,
        handles: data.handles,
        draftingInstructions: data.drafting_instructions,
        accountTier: data.account_tier === "premium" ? "premium" : "standard",
        cadence: cadence.success ? cadence.data : null,
        createdAt: data.created_at,
      }}
    />
  );
}
