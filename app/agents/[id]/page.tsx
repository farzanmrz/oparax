import { PageHeading } from "@/components/page-heading";
import { X_CHAR_LIMITS } from "@/lib/agent/desk-config";
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
  // Drafting is hard-declared `accountTier: "standard"` at every call site, and posting always
  // publishes via `postDraftToXForOwner`'s `getXAccount(ownerId)` — the OWNER's linked X
  // account, which is deliberately a DIFFERENT account from the desk's `reporter_handle` under
  // the admin extract-from-override feature. So the displayed/enforced limit here must match
  // what drafting/posting actually enforce (standard), never a premium ceiling inferred from
  // the desk's voice corpus (`voice_guides.measured_facts` describes the REPORTER's account,
  // not the account that will actually publish). `X_CHAR_LIMITS.premium` and `accountTier`
  // stay in place for when a real per-account tier is resolved — this just stops the UI from
  // promising a limit the posting account can't honor.
  const charLimit = X_CHAR_LIMITS.standard;

  // "Ready to review" = at least one platform has a winner, and that story hasn't been posted
  // to X yet (only X's own winner ever carries a real posted_at — see feed-item.tsx). A story
  // with no X winner at all (LinkedIn/Bluesky-only) still counts: nothing about it has been
  // acted on yet either.
  const readyToReviewCount = stories.filter(
    (story) => Object.keys(story.winners).length > 0 && story.winners.x?.postedAt == null,
  ).length;

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
