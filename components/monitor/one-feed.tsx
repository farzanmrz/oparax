import { Layers, Rows3 } from "lucide-react";
import Link from "next/link";
import { DigestBlock } from "@/components/monitor/digest-block";
import { SkippedList } from "@/components/monitor/skipped-list";
import { OneCard } from "@/components/one/card";
import { OneFrame } from "@/components/one/frame";
import { SourceList } from "@/components/one/source-list";
import { lift } from "@/components/one/stage";
import { monitorContent as copy } from "@/lib/monitor/content";
import { asideGroups, type FeedStory, toFeedArticle, toFeedStory } from "@/lib/monitor/present";
import type { MonitorFeed, MonitorSources } from "@/lib/monitor/read";
import { cn } from "@/lib/utils";

// The One feed (design preview v2/one/feed.tsx): the cards read newest first across, left to right: three across at
// 1440, four at 2560. Clustered is the stories, Direct the matching articles one card each (view=articles); both
// page with the existing cursor and keep the aside's source filter (source=).

/** The feed's address for a view and a source. */
export function feedHref(handle: string, direct: boolean, source: string | null) {
  const query = new URLSearchParams();
  if (direct) query.set("view", "articles");
  if (source) query.set("source", source);
  const rest = query.toString();
  return `/${handle}${rest ? `?${rest}` : ""}`;
}

/** Clustered and Direct, as links that keep the source filter. */
export function FeedViews({
  handle,
  direct,
  source,
}: {
  handle: string;
  direct: boolean;
  source: string | null;
}) {
  const tabs = [
    { on: !direct, href: feedHref(handle, false, source), label: copy.clustered, icon: Layers },
    { on: direct, href: feedHref(handle, true, source), label: copy.direct, icon: Rows3 },
  ];
  return (
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
  );
}

export function OneFeed({
  feed,
  handle,
  direct,
  storyId,
  source,
  empty,
}: {
  feed: MonitorFeed;
  handle: string;
  direct: boolean;
  storyId?: string;
  source: string | null;
  /** The line when nothing matches. */
  empty: string;
}) {
  const list: FeedStory[] = direct
    ? feed.articles.map(toFeedArticle)
    : feed.stories.map((story) => toFeedStory(story, handle, storyId));
  const before = direct ? feed.articlesBefore : feed.storiesBefore;
  const beforeId = direct ? feed.articlesBeforeId : feed.storiesBeforeId;
  const more = new URLSearchParams({
    before: before ?? "",
    beforeId: beforeId ?? "",
    view: direct ? "articles" : "stories",
  });
  if (source) more.set("source", source);
  return (
    <>
      <h2 className="sr-only">{direct ? copy.articles : copy.stories}</h2>
      {list.length ? (
        <div className="grid grid-cols-1 gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4">
          {list.map((story) => (
            <OneCard key={story.id} story={story} className="h-full min-w-0" />
          ))}
        </div>
      ) : feed.pending && !source ? null : (
        <p className="text-[14px] text-t2">{empty}</p>
      )}
      {before ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/${handle}?${more.toString()}`}
            className={cn(
              lift,
              "inline-flex h-10 items-center px-4 text-[13.5px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
            )}
          >
            {copy.loadMore}
          </Link>
        </div>
      ) : null}
    </>
  );
}

/**
 * The owner's feed: the title band ("Feed" and the view switch), the source aside, and the work: the plan states,
 * the cards, then the digests and the skipped items.
 */
export function OwnerFeed({
  feed,
  sources,
  handle,
  view,
  storyId,
  source,
  digests,
  banner,
}: {
  feed: MonitorFeed;
  sources: MonitorSources;
  handle: string;
  view?: string;
  storyId?: string;
  source: string | null;
  digests: { github: boolean; productHunt: boolean };
  banner?: React.ReactNode;
}) {
  const direct = !storyId && view === "articles";
  const groups = asideGroups(sources, {
    href: (key) => feedHref(handle, direct, key === source ? null : key),
    selected: source,
    counts: null,
  });
  const selected = groups.flatMap((group) => group.rows).find((row) => row.on) ?? null;
  return (
    <OneFrame
      title={copy.feedTitle}
      extra={<FeedViews handle={handle} direct={direct} source={source} />}
      aside={{
        name: "sources",
        label: copy.aside.title,
        body: (
          <SourceList
            groups={groups}
            all={{ href: feedHref(handle, direct, null), on: source === null }}
          />
        ),
      }}
    >
      {banner}
      <OneFeed
        feed={feed}
        handle={handle}
        direct={direct}
        storyId={storyId}
        source={source}
        empty={selected ? copy.noNewsFrom(selected.name) : copy.noNews}
      />
      <div className="mt-12 grid gap-8 desk:grid-cols-2">
        <SkippedList items={feed.skipped} />
        <DigestBlock
          items={feed.digests}
          github={digests.github}
          productHunt={digests.productHunt}
        />
      </div>
    </OneFrame>
  );
}
