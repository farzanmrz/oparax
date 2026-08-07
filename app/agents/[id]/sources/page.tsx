import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWebsites } from "@/lib/websites";
import { SourcesCard } from "./sources-card";

// Mirrors app/agents/new/page.tsx's maxDuration (see its comment for the 800 rationale): the
// sources-card's website onboarding kicks off discovery + up to 10 sub-sitemap fetches + fetch
// + a Qwen call under `after()`, still bound by this route's lifetime — without this ceiling
// the platform can kill a long run before markPendingSourceFailed executes, leaving a
// permanently-pending chip.
export const maxDuration = 800;

export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: desk, error } = await supabase
    .from("agents")
    .select("id, tracked_handles, websites")
    .eq("id", id)
    .maybeSingle();
  if (error || !desk) notFound();

  return (
    <div className="py-4 desk:py-6">
      <SourcesCard
        deskId={desk.id}
        trackedHandles={desk.tracked_handles}
        websites={parseWebsites(desk.websites)}
      />
    </div>
  );
}
