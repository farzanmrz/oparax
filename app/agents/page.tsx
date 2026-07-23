import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentsList } from "./agents-list";

/**
 * Feed-first landing — `/agents` never renders a listing of its own. It reads
 * the `last_desk_id` cookie (set by proxy.ts on every `/agents/{id}` visit),
 * validates it against the reporter's own `experiments` rows (RLS scopes the
 * select, so a stale or foreign id just misses), and redirects straight into
 * that desk. On a miss it falls back to the most recently created owned desk.
 * Only a reporter with zero desks ever sees `<AgentsList />` — the designed
 * empty state; everywhere else, the site header's desk switcher is the
 * listing.
 */
export default async function AgentsListingPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const lastDeskId = cookieStore.get("last_desk_id")?.value;

  if (lastDeskId) {
    const { data } = await supabase
      .from("experiments")
      .select("id")
      .eq("id", lastDeskId)
      .maybeSingle();
    if (data) redirect(`/agents/${data.id}`);
  }

  const { data, error } = await supabase
    .from("experiments")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return <AgentsList error="Something went wrong loading your desks." />;
  }

  if (data) redirect(`/agents/${data.id}`);

  return <AgentsList />;
}
