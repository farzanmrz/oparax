import { X as CloseIcon, Layers, Newspaper, Rows3 } from "lucide-react";
import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { SkippedList } from "@/components/monitor/skipped-list";
import { PageLine } from "@/components/one/app-shell";
import { BandCard } from "@/components/one/band-card";
import { OneCard } from "@/components/one/card";
import { Grid, type GridItem } from "@/components/one/grid";
import { SourceMark } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import {
  asideGroups,
  type FeedStory,
  toFeedArticle,
  toFeedStory,
  when,
} from "@/lib/monitor/present";
import type { MonitorFeed, MonitorSources } from "@/lib/monitor/read";
import { feedHref } from "@/lib/monitor/routes";
import { cn } from "@/lib/utils";

// The One feed inside the shell (lab v2/one/feed.tsx; owner, Oct 10: "Feed looks fine"). The page line: Feed, the
// "from {name}" chip beside it while a source is pressed, and at its right end the Clustered and Direct switch
// (owner, Oct 9: "make it a toggle on the right of our header"). Then the stories packed into columns, newest first.
// The rail's Filter rows press a source; the chip's x, or Feed in the rail, shows the whole feed again. Clustered is
// the stories, Direct the matching articles one card each (view=articles); both page with the existing cursor.

export { feedHref };

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
    <nav
      aria-label={copy.feed}
      className="flex rounded-lg border border-line bg-[var(--well)] p-0.5"
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
  );
}

/** The filter chip beside the title: the source's mark, "from" and its name, and an x that shows the whole feed. */
function FilterChip({
  kind,
  mark,
  name,
  clear,
}: {
  kind: "x" | "site" | "github";
  mark: string;
  name: string;
  clear: string;
}) {
  return (
    <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] pr-1 pl-2 text-[12.5px] text-t1">
      <SourceMark
        kind={kind}
        mark={mark}
        size={14}
        className={kind === "x" ? "" : "rounded-[3px]"}
      />
      <span className="truncate">{copy.from(name)}</span>
      <Link
        href={clear}
        aria-label={copy.wholeFeed}
        className="grid size-5 shrink-0 place-items-center rounded-full text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CloseIcon className="size-3" aria-hidden="true" />
      </Link>
    </span>
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
  /** The owner's digest card, placed among the first cards. */
  digest?: GridItem | null;
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
  const cards: GridItem[] = list.map((story) => ({
    key: story.id,
    node: <OneCard story={story} />,
  }));
  if (digest) cards.splice(2, 0, digest);
  return (
    <>
      <h2 className="sr-only">{direct ? copy.articles : copy.stories}</h2>
      {list.length ? (
        <Grid items={cards} />
      ) : feed.pending && !source ? null : (
        <p className="text-[13.5px] text-t2">{empty}</p>
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

/** The newest digest of each kind the person follows, in the one band card. */
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
    <BandCard
      glyph={<Newspaper className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />}
      heading={copy.digestCard}
      bodyClassName="px-4 py-1"
    >
      <ul className="divide-y divide-line">
        {shown.map((item) => {
          const href = safeWebUrl(item.url);
          const hunt = item.kind === "product_hunt";
          return (
            <li key={item.id} className="py-3">
              <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium text-t1">
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
    </BandCard>
  );
}

/**
 * The owner's feed: the page line (Feed, the pressed source's chip, the view switch), then the cards with the digest
 * card among them, and Skipped under the cards. The rail beside it holds the sources as the feed's filters.
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
    href: () => "",
    selected: source,
    counts: null,
  });
  const selected = groups
    .flatMap((group) => group.rows.map((row) => ({ ...row, kind: group.kind })))
    .find((row) => row.on);
  const hasDigest = feed.digests.some(
    (item) =>
      (item.kind === "github" && digests.github) ||
      (item.kind === "product_hunt" && digests.productHunt),
  );
  return (
    <>
      <PageLine
        title={copy.feedTitle}
        home={`/${handle}`}
        beside={
          selected ? (
            <FilterChip
              kind={selected.kind === "x" ? "x" : selected.kind === "github" ? "github" : "site"}
              mark={selected.mark}
              name={selected.name}
              clear={feedHref(handle, direct, null)}
            />
          ) : null
        }
        right={<FeedViews handle={handle} direct={direct} source={source} />}
      />
      {banner}
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
    </>
  );
}
