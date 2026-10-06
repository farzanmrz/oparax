import { Layers, Rows3 } from "lucide-react";
import Link from "next/link";
import { OneCard } from "@/components/one/card";
import { lift } from "@/components/one/stage";
import { monitorContent as copy } from "@/lib/monitor/content";
import { type FeedStory, toFeedArticle, toFeedStory } from "@/lib/monitor/present";
import type { MonitorFeed } from "@/lib/monitor/read";
import { cn } from "@/lib/utils";

// The One feed (design preview v2/one/feed.tsx): the page line (the title and the Clustered and Direct switch), then
// the cards in level rows read newest first across, left to right: three across at 1440, four at 2560. A row is as
// tall as its tallest card and every card stretches to it. Clustered is the stories, Direct the matching articles
// one card each (view=articles); both page with the existing cursor. The owner's page line is "Feed" alone; a
// visitor's keeps the agent's title and the line under it.

export function OneFeed({
  feed,
  handle,
  view,
  storyId,
  owner,
  title,
  banner,
}: {
  feed: MonitorFeed;
  handle: string;
  view?: string;
  storyId?: string;
  owner: boolean;
  /** The visitor's title. */
  title: string;
  /** What sits under the page line: the plan states. */
  banner?: React.ReactNode;
}) {
  const direct = !storyId && view === "articles";
  const list: FeedStory[] = direct
    ? feed.articles.map(toFeedArticle)
    : feed.stories.map((story) => toFeedStory(story, handle, storyId));
  const before = direct ? feed.articlesBefore : feed.storiesBefore;
  const beforeId = direct ? feed.articlesBeforeId : feed.storiesBeforeId;
  const tabs = [
    { on: !direct, href: `/${handle}`, label: copy.clustered, icon: Layers },
    { on: direct, href: `/${handle}?view=articles`, label: copy.direct, icon: Rows3 },
  ];
  return (
    <section aria-labelledby="feed-title">
      <header className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-3">
        <h1
          id="feed-title"
          className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
        >
          {owner ? copy.feedTitle : title}
        </h1>
        <nav aria-label={copy.feed} className="flex rounded-lg border border-line bg-well p-0.5">
          {tabs.map(({ on, href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
                on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
              )}
            >
              <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {owner ? null : (
        <p className="mt-3 text-[13.5px] text-t3">
          {direct ? copy.directLine : copy.clusteredLine}
        </p>
      )}
      {banner}
      {!owner && (feed.pending || feed.failed) ? (
        <div role="status" className="mt-3 space-y-1 text-[12.5px] text-t3">
          {feed.pending ? <p>{copy.pendingItems(feed.pending)}</p> : null}
          {feed.failed ? <p>{copy.failedItems(feed.failed)}</p> : null}
        </div>
      ) : null}
      <h2 className="sr-only">{direct ? copy.articles : copy.stories}</h2>
      {list.length ? (
        <div className="mt-6 grid grid-cols-1 gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4">
          {list.map((story) => (
            <OneCard key={story.id} story={story} className="h-full min-w-0" />
          ))}
        </div>
      ) : feed.pending ? null : (
        <p className="mt-6 text-[14px] text-t2">{copy.noNews}</p>
      )}
      {before ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/${handle}?before=${encodeURIComponent(before)}&beforeId=${encodeURIComponent(beforeId ?? "")}&view=${direct ? "articles" : "stories"}`}
            className={cn(
              lift,
              "inline-flex h-10 items-center px-4 text-[13.5px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
            )}
          >
            {copy.loadMore}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
