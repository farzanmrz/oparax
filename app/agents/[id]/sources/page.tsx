import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWebsites } from "@/lib/websites";
import { SourcesCard } from "./sources-card";

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
