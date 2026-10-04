import { Layers, Rows3 } from "lucide-react";
import Link from "next/link";
import { OneCard } from "@/components/monitor/one-card";
import { lift } from "@/components/one/stage";
import { monitorContent as copy } from "@/lib/monitor/content";
import { type FeedStory, toColumns, toFeedArticle, toFeedStory } from "@/lib/monitor/present";
import type { MonitorFeed } from "@/lib/monitor/read";
import { cn } from "@/lib/utils";

// The One feed (design preview v2/one/feed.tsx): the title with Clustered and Direct at the right, one line under it,
// then the cards three across. Clustered is the stories, Direct the matching articles one card each (view=articles);
// both page with the existing cursor.

export function OneFeed({
  feed,
  handle,
  view,
  storyId,
  title,
  banner,
}: {
  feed: MonitorFeed;
  handle: string;
  view?: string;
  storyId?: string;
  title: string;
  /** What sits under the title: the DM line, the plan states. */
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
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1
          id="feed-title"
          className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
        >
          {title}
        </h1>
        <nav
          aria-label={copy.feed}
          className="ml-auto flex rounded-lg border border-line bg-well p-0.5"
        >
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
      <p className="mt-3 text-[13.5px] text-t3">{direct ? copy.directLine : copy.clusteredLine}</p>
      {banner}
      {feed.pending || feed.failed ? (
        <div role="status" className="mt-3 space-y-1 text-[12.5px] text-t3">
          {feed.pending ? <p>{copy.pendingItems(feed.pending)}</p> : null}
          {feed.failed ? <p>{copy.failedItems(feed.failed)}</p> : null}
        </div>
      ) : null}
      <h2 className="sr-only">{direct ? copy.articles : copy.stories}</h2>
      {list.length ? (
        // Desktop only (owner): three columns; a narrow window stacks them.
        <div className="mt-6 grid items-start gap-6 desk:grid-cols-3 desk:gap-5">
          {toColumns(list).map((column, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: The three columns are fixed positions.
            <div key={i} className="flex min-w-0 flex-col gap-6">
              {column.map((story) => (
                <OneCard key={story.id} story={story} />
              ))}
            </div>
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
