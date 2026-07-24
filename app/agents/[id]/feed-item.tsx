// app/agents/[id]/feed-item.tsx
//
// The Feed's story/draft card pair. Module-scope, plain Server Component (no "use client" —
// every interactive piece it composes, `CouncilDialog`/`DraftHistoryDialog`/`PostToXControl`/
// `DraftEditDialog`/`DraftPlatformSwitcher`, already owns its own client boundary; there is
// nothing left here that needs one). Renders as a React fragment of TWO sibling grid children
// so the parent's `grid-cols-2` places the news card and its draft card side by side without
// an extra wrapper div — see `page.tsx`.
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FeedStory } from "@/lib/agent/feed-query";
import { cn } from "@/lib/utils";
import { DraftPlatformSwitcher } from "./draft-platform-switcher";

/** Pinned to UTC so a server render never disagrees with itself — this is a plain Server
 *  Component, never re-hydrated client-side, but the same discipline the rest of the app's
 *  timestamp formatters use. `postedAt` is nullable (an ingested post with no captured
 *  publish time); the design's "Broke {ago} ago" fallback needs a relative reference point
 *  this pinned type doesn't carry, so the fallback is static rather than fabricated. */
function formatBrokeAt(iso: string | null): string {
  if (!iso) return "Broke recently";
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

/** The 𝕏 origin badge — lucide ships no brand glyphs, so this is the platform's own
 *  character in a small rounded square, exactly like the design's "𝕏 glyph in a 24px
 *  rounded square". Decorative; the surrounding header always carries its own text label. */
function OriginBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold"
    >
      𝕏
    </span>
  );
}

/**
 * NewsCard renders `sourcePosts[0]` only (the post that started the story — clustering's
 * assignment order guarantees this, see `feed-query.ts`'s `story_assignments` fetch). A
 * clustered story with more than one source post gets a small "+N" badge/tooltip instead of
 * a full multi-source layout: clustering is brand new (T2.4b) and typically still one post
 * per story in practice, so building a real multi-card layout isn't earned yet — documented
 * in task-25-report.md as the minimal choice the brief explicitly allows.
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
    <Card className={cn(opacityClass)}>
      <CardHeader className="flex-row items-center gap-2">
        <OriginBadge />
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">
          {/* author_handle is nullable as of this Wave's website-source support — a website
              post carries no handle, so this falls back to a generic label rather than
              rendering the literal "@null". */}
          {sourcePost.authorHandle ? `@${sourcePost.authorHandle}` : "Source"}
        </span>
        {extraSourceCount > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="shrink-0 font-mono" variant="secondary">
                  +{extraSourceCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {extraSourceCount} more source{extraSourceCount === 1 ? "" : "s"} clustered into
                this story
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatBrokeAt(sourcePost.postedAt)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm whitespace-pre-wrap">{sourcePost.text}</p>
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* No `x_post_id`/URL in the pinned FeedStory shape, so there is nowhere real
                    for this to link to yet — a disabled scaffold rather than a placeholder
                    `href="#"`, which the design's own mock uses but which fails
                    `useValidAnchor`. */}
                <Button
                  aria-disabled="true"
                  aria-label="View source on X"
                  disabled
                  size="icon-sm"
                  variant="ghost"
                >
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View source on X</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

function DraftCard({
  story,
  experimentId,
  reporterHandle,
  xLinked,
  opacityClass,
}: {
  story: FeedStory;
  experimentId: string;
  reporterHandle: string;
  xLinked: boolean;
  opacityClass: string | undefined;
}) {
  const sourcePost = story.sourcePosts[0];
  const hasWinners = Object.keys(story.winners).length > 0;

  if (!hasWinners) {
    // Re-keyed off "no entries in winners yet" (any platform still drafting, or every
    // platform failed) rather than the old single-`winner` null check — same placeholder UX.
    return (
      <Card className={cn(opacityClass)}>
        <CardHeader className="flex-row items-center gap-2">
          <OriginBadge />
          <span className="text-sm font-semibold">Draft</span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Drafting…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(opacityClass)}>
      <CardHeader className="flex-row items-center gap-2">
        <OriginBadge />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          Draft <span className="font-mono text-xs text-muted-foreground">@{reporterHandle}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatBrokeAt(sourcePost?.postedAt ?? null)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DraftPlatformSwitcher experimentId={experimentId} story={story} xLinked={xLinked} />
      </CardContent>
    </Card>
  );
}

/** One story's news-card/draft-card pair — the news card (the source post) and the draft
 *  card (the winning draft) as TWO sibling grid children, not a wrapped pair, so the caller's
 *  `grid-cols-2` places them side by side across the whole page's grid flow (see `page.tsx`).
 *  Posted stories render both cards at reduced opacity per the design (§4). */
export function FeedItemCard({
  story,
  experimentId,
  reporterHandle,
  xLinked,
}: {
  story: FeedStory;
  experimentId: string;
  reporterHandle: string;
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
        experimentId={experimentId}
        opacityClass={opacityClass}
        reporterHandle={reporterHandle}
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
        As your desk drafts posts on this beat, they'll appear here — a source story and its winning
        draft, side by side, newest first.
      </p>
    </div>
  );
}
