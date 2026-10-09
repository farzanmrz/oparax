import { Layers, Newspaper, Rows3 } from "lucide-react";
import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { SkippedList } from "@/components/monitor/skipped-list";
import { OneCard } from "@/components/one/card";
import { OneFrame } from "@/components/one/frame";
import type { ShellPlan } from "@/components/one/header";
import { Masonry, type MasonryItem } from "@/components/one/masonry";
import { SourceList } from "@/components/one/source-list";
import { lift } from "@/components/one/stage";
import { CheckingRow, FeedTiles } from "@/components/one/tiles";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import {
  asideGroups,
  type FeedStats,
  type FeedStory,
  toFeedArticle,
  toFeedStory,
  when,
} from "@/lib/monitor/present";
import type { MonitorFeed, MonitorSources } from "@/lib/monitor/read";
import { cn } from "@/lib/utils";

// The One feed (design preview v2/one/feed.tsx, council October 8): content-sized cards in columns, newest first
// across: three at 1440 with the aside open, four at 2560. Clustered is the stories, Direct the matching articles one
// card each (view=articles); both page with the existing cursor and keep the aside's source filter (source=).

/** A card's height before layout, from its picture, headline and facts, for placing it in the shortest column. */
function estimate(story: FeedStory) {
  const lines = (text: string, perLine: number) => Math.max(1, Math.ceil(text.length / perLine));
  const facts = story.facts.reduce((h, fact) => h + 8 + lines(fact, 46) * 20, 0);
  return (story.image ? 172 : 0) + 64 + lines(story.headline, 34) * 21 + (facts || 22);
}

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
  digest,
}: {
  feed: MonitorFeed;
  handle: string;
  direct: boolean;
  storyId?: string;
  source: string | null;
  /** The line when nothing matches. */
  empty: string;
  /** The owner's digest card, placed in the first row. */
  digest?: MasonryItem | null;
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
  const cards: MasonryItem[] = list.map((story) => ({
    key: story.id,
    height: estimate(story),
    node: <OneCard story={story} className="min-w-0" />,
  }));
  if (digest) cards.splice(2, 0, digest);
  return (
    <>
      <h2 className="sr-only">{direct ? copy.articles : copy.stories}</h2>
      {list.length ? (
        <Masonry items={cards} />
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

/** The newest digest of each kind the person follows, as one small lifted card. */
function DigestCard({
  items,
  github,
  productHunt,
}: {
  items: MonitorFeed["digests"];
  github: boolean;
  productHunt: boolean;
}) {
  const newest = (kind: string) => items.find((item) => item.kind === kind);
  const shown = [
    github ? newest("github") : undefined,
    productHunt ? newest("product_hunt") : undefined,
  ].filter((item) => item !== undefined);
  return (
    <section aria-label={copy.digestCard} className={cn(lift, "min-w-0 overflow-hidden")}>
      <p className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] font-semibold text-t1">
        {/* A neutral mark: the card holds every digest kind, and each row carries its own. */}
        <span className="grid size-[22px] shrink-0 place-items-center rounded-[5px] bg-raised text-t2">
          <Newspaper className="size-3.5" aria-hidden="true" />
        </span>
        {copy.digestCard}
      </p>
      <ul className="divide-y divide-line">
        {shown.map((item) => {
          const href = safeWebUrl(item.url);
          const hunt = item.kind === "product_hunt";
          return (
            <li key={item.id} className="px-4 py-3.5">
              <p className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-t1">
                <BrandIcon
                  name={hunt ? "producthunt" : "github"}
                  className={cn("size-4 shrink-0", hunt ? "" : "text-[var(--kind-github)]")}
                />
                <span className="min-w-0 truncate">
                  {href ? (
                    <a href={href} className="underline-offset-4 hover:underline">
                      {item.name}
                    </a>
                  ) : (
                    item.name
                  )}
                </span>
                <span className="ml-auto shrink-0 text-[11px] font-normal text-t3">
                  {hunt ? copy.productHunt : copy.github}
                </span>
              </p>
              {item.description ? (
                <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{item.description}</p>
              ) : null}
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-t3">{item.why_now}</p>
              <time
                dateTime={item.created_at}
                className="mt-2 block text-[11.5px] text-t3 tabular-nums"
              >
                {when(item.created_at)}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The owner's feed: the title band ("Feed" and the view switch), the source aside with this week's count per source,
 * and the work: the plan states, the Deck's four tiles, the checking row while items are checked, the cards with the
 * digest card among them, and Skipped under the cards.
 */
export function OwnerFeed({
  feed,
  stats,
  sources,
  handle,
  view,
  storyId,
  source,
  digests,
  live,
  plan,
  banner,
}: {
  feed: MonitorFeed;
  stats: FeedStats;
  sources: MonitorSources;
  handle: string;
  view?: string;
  storyId?: string;
  source: string | null;
  digests: { github: boolean; productHunt: boolean };
  /** The agent is watching: the free week or a paid plan. */
  live: boolean;
  plan: ShellPlan | null;
  banner?: React.ReactNode;
}) {
  const direct = !storyId && view === "articles";
  const groups = asideGroups(sources, {
    href: (key) => feedHref(handle, direct, key === source ? null : key),
    selected: source,
    counts: stats.bySource,
  });
  const selected = groups.flatMap((group) => group.rows).find((row) => row.on) ?? null;
  const hasDigest = feed.digests.some(
    (item) =>
      (item.kind === "github" && digests.github) ||
      (item.kind === "product_hunt" && digests.productHunt),
  );
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
      <FeedTiles
        stats={stats}
        live={live}
        pending={feed.pending}
        failed={feed.failed}
        watching={{ sites: sources.sources.length, accounts: sources.accounts.length }}
        plan={plan}
      />
      {feed.pending ? (
        <div className="mt-6">
          <CheckingRow pending={feed.pending} />
        </div>
      ) : null}
      <div className="mt-6">
        <OneFeed
          feed={feed}
          handle={handle}
          direct={direct}
          storyId={storyId}
          source={source}
          empty={selected ? copy.noNewsFrom(selected.name) : copy.noNews}
          digest={
            hasDigest && !source
              ? {
                  key: "digest",
                  height: 220,
                  node: (
                    <DigestCard
                      items={feed.digests}
                      github={digests.github}
                      productHunt={digests.productHunt}
                    />
                  ),
                }
              : null
          }
        />
      </div>
      {feed.skipped.length ? (
        <div className="mt-10">
          <SkippedList items={feed.skipped} />
        </div>
      ) : null}
    </OneFrame>
  );
}
