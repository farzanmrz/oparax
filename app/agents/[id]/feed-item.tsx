// app/agents/[id]/feed-item.tsx
//
// The Feed's story/draft card pair. Module-scope, plain Server Component (no "use client" —
// every interactive piece it composes, `DraftPlatformSwitcher` and its dialogs, owns its own
// client boundary). Renders as a React fragment of TWO sibling grid children so the parent's
// `grid-cols-2` places the news card and its draft card side by side without an extra wrapper
// div — see `page.tsx`.
//
// BOTH columns wear the same card anatomy on purpose (`PostCard` + the shared header
// template from source-tweet.module.css): the story card shows the SOURCE
// account's identity, the draft card shows the identity of the X ACCOUNT THAT WOULD PUBLISH —
// the linked OAuth account's handle, not the desk's `reporter_handle`. Those are the same
// person for a normal reporter; for the owner-override case (admin extracts from a reporter
// they can't authenticate as) they deliberately differ, and the card must show where the post
// would actually land. Falls back to `reporter_handle` when no X account is linked yet.
import type { FeedStory } from "@/lib/agent/feed-query";
import { cn } from "@/lib/utils";
import { DraftPlatformSwitcher } from "./draft-platform-switcher";
import { ExtraSourcesBadge } from "./feed-tooltips";
import { PostCard } from "./post-card";
import { RelativeTime } from "./relative-time";
import { SourceChip, SourceTweet } from "./source-tweet";
import styles from "./source-tweet.module.css";
import { XAvatar } from "./x-avatar";

/**
 * NewsCard renders `sourcePosts[0]` only (the post that started the story — clustering's
 * assignment order guarantees this, see `feed-query.ts`'s `story_assignments` fetch). A
 * clustered story with more than one source post gets a small "+N" badge/tooltip instead of
 * a full multi-source layout: clustering is brand new (T2.4b) and typically still one post
 * per story in practice, so building a real multi-card layout isn't earned yet.
 */
function NewsCard({
  sourcePost,
  extraSourceCount,
  opacityClass,
}: {
  sourcePost: FeedStory["sourcePosts"][number];
  extraSourceCount: number;
  opacityClass: string | undefined;
}) {
  return (
    <div className={cn("flex h-full flex-col gap-2", opacityClass)}>
      {extraSourceCount > 0 ? (
        <div className="flex justify-end">
          <ExtraSourcesBadge count={extraSourceCount} />
        </div>
      ) : null}
      <SourceTweet sourcePost={sourcePost} />
    </div>
  );
}

/** The draft card's header — same template as the source card's (avatar · bold handle ·
 *  platform chip far right), so the two columns read as one system. The avatar resolves by
 *  handle (see x-avatar.tsx) because the linked account appears in no tweet payload. */
function DraftHeader({ handle, draftedAt }: { handle: string; draftedAt?: string }) {
  return (
    <div className={styles.header}>
      <XAvatar handle={handle} />
      <span className={styles.handle}>@{handle}</span>
      <span className={styles.spacer} />
      {draftedAt ? (
        <span className={styles.time}>
          <RelativeTime iso={draftedAt} prefix="Drafted" />
        </span>
      ) : null}
      <SourceChip kind="x" />
    </div>
  );
}

function DraftCard({
  story,
  experimentId,
  publishHandle,
  charLimit,
  xLinked,
  opacityClass,
}: {
  story: FeedStory;
  experimentId: string;
  publishHandle: string;
  charLimit: number;
  xLinked: boolean;
  opacityClass: string | undefined;
}) {
  const hasWinners = Object.keys(story.winners).length > 0;
  // X's winner is the card's default view (see DraftPlatformSwitcher), so its creation time is
  // the one the header dates; fall back to whichever platform produced a winner.
  const draftedAt = (story.winners.x ?? Object.values(story.winners)[0])?.createdAt;

  if (!hasWinners) {
    // A winner-less story is EITHER mid-council (normal for ~a minute after delivery) or
    // permanently failed (the council errored, the claim was released, the worker's retries
    // exhausted). The rows are identical, so age is the only available discriminator: past
    // ten minutes nothing is still legitimately drafting. Fresh gets a skeleton (the draft
    // is genuinely being written right now); stale gets the honest no-draft copy. The feed
    // auto-refresh re-renders this every ~20s, so both states resolve without a reload.
    const startedAt = story.sourcePosts[0]?.postedAt;
    const stale = startedAt ? Date.now() - new Date(startedAt).getTime() > 10 * 60 * 1000 : true;
    return (
      <div className={cn("flex h-full flex-col", opacityClass)}>
        <PostCard>
          <DraftHeader handle={publishHandle} />
          {stale ? (
            <p className="text-sm text-muted-foreground">
              Nothing drafted from this post — there wasn't enough to write from.
            </p>
          ) : (
            // A status line, not a skeleton: gray bars imply a layout waiting on data, and
            // read as broken when they persist for the ~minute a council takes. This says
            // what is actually happening; the feed auto-refresh swaps in the draft.
            <div className="flex items-center gap-2" role="status">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary"
              />
              <span className="text-sm text-muted-foreground">
                Drafting in your voice — a few models are writing…
              </span>
            </div>
          )}
        </PostCard>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", opacityClass)}>
      <PostCard>
        <DraftHeader draftedAt={draftedAt} handle={publishHandle} />
        <DraftPlatformSwitcher
          charLimit={charLimit}
          experimentId={experimentId}
          story={story}
          xLinked={xLinked}
        />
      </PostCard>
    </div>
  );
}

/** One story's news-card/draft-card pair — TWO sibling grid children, not a wrapped pair, so
 *  the caller's `grid-cols-2` places them side by side across the whole page's grid flow (see
 *  `page.tsx`). Posted stories render both cards at reduced opacity per the design (§4). */
export function FeedItemCard({
  story,
  experimentId,
  reporterHandle,
  xHandle,
  charLimit,
  xLinked,
}: {
  story: FeedStory;
  experimentId: string;
  reporterHandle: string;
  xHandle: string | null;
  charLimit: number;
  xLinked: boolean;
}) {
  const sourcePost = story.sourcePosts[0];
  // Only X ever carries a real posted_at (the only platform with a posting mechanism this
  // slice) — a story counts as "posted" once its X winner has been posted, regardless of
  // whether LinkedIn/Bluesky winners exist alongside it.
  const opacityClass = story.winners.x?.postedAt != null ? "opacity-[0.66]" : undefined;

  if (!sourcePost) return null; // defensive: a winner whose source_posts row went missing

  return (
    <>
      <NewsCard
        extraSourceCount={story.sourcePosts.length - 1}
        opacityClass={opacityClass}
        sourcePost={sourcePost}
      />
      <DraftCard
        charLimit={charLimit}
        experimentId={experimentId}
        opacityClass={opacityClass}
        publishHandle={xHandle ?? reporterHandle}
        story={story}
        xLinked={xLinked}
      />
    </>
  );
}

/** The Feed's designed empty state — the pre-worker Feed WILL be sparse (no drafting worker
 *  exists yet to populate it), so this copy is deliberate, not a placeholder. */
export function FeedEmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center">
      <h3 className="text-sm font-semibold">Nothing on the wire yet</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
        As your agent drafts posts on this beat, they'll appear here — a source story and its
        winning draft, side by side, newest first.
      </p>
    </div>
  );
}
