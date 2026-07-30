import { getOwnedExtractionProgress } from "@/app/agents/[id]/voice/get-extraction-progress";
import { PageHeading } from "@/components/page-heading";
import { resolveXTier, X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import { fetchFeedPage } from "@/lib/agent/feed-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getXLinkState } from "@/lib/x/link-state";
import { FeedAutoRefresh } from "./feed-auto-refresh";
import { FeedEmptyState, FeedItemCard, type FeedReadiness } from "./feed-item";

/**
 * The Feed — this desk's story/draft card pairs, reverse chronological (unposted stories
 * first, then most-recently-posted). `app/agents/[id]/layout.tsx` already resolved and
 * owner-checked this `id` before this page can render at all (its own `agents` read
 * 404s on a foreign or malformed id), so this page trusts it and does its own small
 * `reporter_handle` read via the owner-scoped cookie client. `fetchFeedPage` runs on the
 * SERVICE-ROLE client instead — `source_posts` carries deny-all RLS (no SELECT policy),
 * so the cookie client would silently return zero rows for the news-card side; every query
 * inside `fetchFeedPage` re-scopes to this `agentId` explicitly, so the elevated client
 * never reads outside this desk.
 */
export default async function FeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [agentResult, stories, xLink, voiceGuideResult] = await Promise.all([
    supabase
      .from("agents")
      .select("reporter_handle, status, tracked_handles")
      .eq("id", id)
      .maybeSingle(),
    fetchFeedPage(admin, id),
    getXLinkState(),
    supabase.from("voice_guides").select("agent_id").eq("agent_id", id).limit(1).maybeSingle(),
  ]);

  if (agentResult.error || !agentResult.data) {
    throw new Error("Failed to load the agent. Please try again.");
  }
  const agent = agentResult.data;
  const reporterHandle = agent.reporter_handle;
  const deskHasGuide = Boolean(voiceGuideResult.data);

  const hasSources = (agent.tracked_handles?.length ?? 0) > 0;
  let readiness: FeedReadiness;
  if (agent.status !== "active") {
    readiness = { kind: "paused" };
  } else if (!hasSources) {
    readiness = { kind: "no_sources" };
  } else if (voiceGuideResult.error) {
    throw new Error("Failed to load the agent. Please try again.");
  } else if (stories.length === 0) {
    const extraction = await getOwnedExtractionProgress(id);
    if (!extraction.ok) throw new Error("Failed to load the agent. Please try again.");
    readiness =
      extraction.status === "running"
        ? {
            kind: "extraction_running",
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
          }
        : extraction.status === "failed"
          ? {
              kind: "extraction_failed",
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
            }
          : deskHasGuide
            ? { kind: "ready" }
            : { kind: "extraction_missing" };
  } else if (deskHasGuide) {
    readiness = { kind: "ready" };
  } else {
    readiness = { kind: "extraction_missing" };
  }

  // The displayed limit reads the STORED tier of the posting account — safe precisely because
  // extraction writes a tier only when the extracted reporter IS that linked posting account.
  const charLimit = X_CHAR_LIMITS[resolveXTier(xLink.tier)];

  // "Ready to review" = at least one platform has a winner, and that story's X winner is not yet
  // CONFIRMED (postedAt AND postedUrl both set — see feed-item.tsx). This includes a story with
  // no X winner at all (LinkedIn/Bluesky-only, nothing acted on yet), an unposted X winner, and
  // an AMBIGUOUS X winner (postedAt set but postedUrl null — X may have accepted the post but the
  // outcome stamp failed) — an ambiguous story still needs the reporter's attention.
  const readyToReviewCount = stories.filter((story) => {
    if (Object.keys(story.winners).length === 0) return false;
    const x = story.winners.x;
    const confirmed = x != null && x.postedAt != null && x.postedUrl != null;
    return !confirmed;
  }).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <FeedAutoRefresh />
      {stories.length === 0 ? (
        // Empty desk: just the empty state — the "Stories / Drafts" count headers only make
        // sense (and only align) once there are card pairs beneath them.
        <FeedEmptyState deskId={id} readiness={readiness} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-7 gap-y-1 md:grid-cols-2">
            <PageHeading>Stories — {stories.length} since the agent went live</PageHeading>
            <PageHeading>Drafts — {readyToReviewCount} ready to review</PageHeading>
          </div>
          <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
            {stories.map((story) => (
              <FeedItemCard
                charLimit={charLimit}
                agentId={id}
                key={story.storyId}
                reporterHandle={reporterHandle}
                story={story}
                xHandle={xLink.handle}
                xLinked={xLink.linked}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
