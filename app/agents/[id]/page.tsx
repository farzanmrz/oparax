import { fetchFeedPage } from "@/lib/agent/feed-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getXLinkState } from "@/lib/x/link-state";
import { FeedEmptyState, FeedItemCard } from "./feed-item";

/**
 * The Feed — this desk's story/draft card pairs, reverse chronological (unposted stories
 * first, then most-recently-posted). `app/agents/[id]/layout.tsx` already resolved and
 * owner-checked this `id` before this page can render at all (its own `experiments` read
 * 404s on a foreign or malformed id), so this page trusts it and does its own small
 * `reporter_handle` read via the owner-scoped cookie client. `fetchFeedPage` runs on the
 * SERVICE-ROLE client instead — `source_posts` carries deny-all RLS (no SELECT policy),
 * so the cookie client would silently return zero rows for the news-card side; every query
 * inside `fetchFeedPage` re-scopes to this `experimentId` explicitly, so the elevated client
 * never reads outside this desk.
 */
export default async function FeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [experimentResult, stories, xLink] = await Promise.all([
    supabase.from("experiments").select("reporter_handle").eq("id", id).maybeSingle(),
    fetchFeedPage(admin, id),
    getXLinkState(),
  ]);

  if (experimentResult.error || !experimentResult.data) {
    throw new Error("Failed to load the desk. Please try again.");
  }
  const reporterHandle = experimentResult.data.reporter_handle;

  const readyToReviewCount = stories.filter(
    (story) => story.winner !== null && story.winner.postedAt === null,
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <div className="grid grid-cols-1 gap-x-7 gap-y-1 md:grid-cols-2">
        <h2 className="text-sm font-semibold text-foreground">
          Stories — {stories.length} since the desk went live
        </h2>
        <h2 className="text-sm font-semibold text-foreground">
          Drafts — {readyToReviewCount} ready to review
        </h2>
      </div>

      {stories.length === 0 ? (
        <FeedEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
          {stories.map((story) => (
            <FeedItemCard
              experimentId={id}
              key={story.winner?.postDraftId ?? story.sourcePosts[0]?.id}
              reporterHandle={reporterHandle}
              story={story}
              xLinked={xLink.linked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
