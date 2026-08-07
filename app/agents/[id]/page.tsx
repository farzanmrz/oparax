import { notFound } from "next/navigation";
import { getOwnedExtractionProgress } from "@/app/agents/[id]/voice/get-extraction-progress";
import { resolveXTier, X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import { fetchFeedCounts, fetchFeedPage } from "@/lib/agent/feed-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getXLinkState } from "@/lib/x/link-state";
import { FeedAutoRefresh } from "./feed-auto-refresh";
import { FeedEmptyState, type FeedReadiness } from "./feed-item";
import { FeedList } from "./feed-list";

export default async function FeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // Ownership is intentionally awaited before any service-role work. Layout guards protect
  // rendering, but do not prove this server component has not already started an admin read.
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("reporter_handle, status, tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (agentError || !agent) notFound();
  const admin = createAdminClient();
  const [page, counts, xLink, voiceGuideResult] = await Promise.all([
    fetchFeedPage(admin, id),
    fetchFeedCounts(admin, id),
    getXLinkState(),
    supabase.from("voice_guides").select("agent_id").eq("agent_id", id).limit(1).maybeSingle(),
  ]);
  if (voiceGuideResult.error) throw new Error("Failed to load the agent. Please try again.");
  const hasSources = (agent.tracked_handles?.length ?? 0) > 0;
  const deskHasGuide = Boolean(voiceGuideResult.data);
  let readiness: FeedReadiness = deskHasGuide ? { kind: "ready" } : { kind: "extraction_missing" };
  if (agent.status !== "active") readiness = { kind: "paused" };
  else if (!hasSources) readiness = { kind: "no_sources" };
  else if (counts.totalStories === 0) {
    const extraction = await getOwnedExtractionProgress(id);
    if (!extraction.ok) throw new Error("Failed to load the agent. Please try again.");
    if (extraction.status === "running" || extraction.status === "failed")
      readiness = {
        kind: extraction.status === "running" ? "extraction_running" : "extraction_failed",
        initial: {
          stage: extraction.stage,
          progressNote: extraction.progressNote,
          reasoningByStage: extraction.reasoningByStage,
          textByStage: extraction.textByStage,
          toolActivities: extraction.toolActivities,
          status: extraction.status,
          errorCode: extraction.errorCode,
          corpusPostCount: extraction.corpusPostCount,
          scopeExcludedCount: extraction.scopeExcludedCount,
        },
      };
  }
  const charLimit = X_CHAR_LIMITS[resolveXTier(xLink.tier)];
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col gap-4 py-4">
      <FeedAutoRefresh />
      {counts.totalStories === 0 ? (
        <FeedEmptyState deskId={id} readiness={readiness} />
      ) : (
        <FeedList
          agentId={id}
          charLimit={charLimit}
          fetchedAt={Date.now()}
          initialCursor={page.nextCursor}
          initialItems={page.items}
          xLinked={xLink.linked}
        />
      )}
    </div>
  );
}
