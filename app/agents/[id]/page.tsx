import { PageHeading } from "@/components/page-heading";
import { resolveXTier, X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import { fetchFeedPage } from "@/lib/agent/feed-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getXLinkState } from "@/lib/x/link-state";
import { FeedAutoRefresh } from "./feed-auto-refresh";
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
    throw new Error("Failed to load the agent. Please try again.");
  }
  const reporterHandle = experimentResult.data.reporter_handle;
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
        <FeedEmptyState />
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
                experimentId={id}
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
