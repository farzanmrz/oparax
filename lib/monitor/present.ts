import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type {
  DisplayItem,
  DisplayStory,
  MonitorSources,
  PublicItem,
  VerifiedCard,
} from "@/lib/monitor/read";
import { normalizeValidHandle } from "@/lib/x/handle";

// The display shape of the One feed card, adapted from the public feed read. Display only: no item bodies, scores
// or evidence spans reach the card.

export type FeedItem = {
  id: string;
  title: string | null;
  url: string | null;
  time: string;
  kind: "post" | "article";
  /** The name shown in the card's source row. */
  label: string;
  /** The X handle for a post's avatar, the host for an article's favicon. */
  mark: string;
};
export type FeedStory = {
  id: string;
  headline: string;
  facts: string[];
  image: string | null;
  /** The newest item's time, or the story's last change. */
  time: string;
  items: FeedItem[];
  /** The story's own address, for clustered stories. */
  href: string | null;
  current: boolean;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function toItem(item: PublicItem): FeedItem {
  const post = item.kind === "post";
  const host = hostOf(item.url);
  return {
    id: item.id,
    title: item.title,
    url: safeWebUrl(item.url),
    time: item.published_at,
    kind: post ? "post" : "article",
    label: item.publisher || (post && item.author ? item.author.name : host) || copy.source,
    mark: post && item.author ? item.author.handle : host,
  };
}

const factsOf = (card: VerifiedCard | null) => card?.facts.map((fact) => fact.text) ?? [];
const newestFirst = (a: FeedItem, b: FeedItem) => (a.time < b.time ? 1 : -1);

export function toFeedStory(story: DisplayStory, handle: string, storyId?: string): FeedStory {
  const items = story.reports.map(toItem).sort(newestFirst);
  return {
    id: story.id,
    headline: story.card?.headline || story.fallback_title || copy.unverified,
    facts: factsOf(story.card),
    image: safeWebUrl(story.card?.image ?? story.image, true),
    time: items[0]?.time ?? story.last_changed_at,
    items,
    href: `/${handle}/${story.id}`,
    current: story.id === storyId,
  };
}

export function toFeedArticle({ item, card }: DisplayItem): FeedStory {
  const one = toItem(item);
  return {
    id: item.id,
    headline: card?.headline || item.title || copy.unverified,
    facts: factsOf(card),
    image: safeWebUrl(card?.image, true),
    time: item.published_at,
    items: [one],
    href: null,
    current: false,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 1, 15:01" in UTC, with the year only outside the current one, so server and client agree. */
export function when(iso: string, now = new Date()) {
  const d = new Date(iso);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (d.getUTCFullYear() !== now.getUTCFullYear()) return `${day}, ${d.getUTCFullYear()}`;
  return `${day}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export type AsideKind = "x" | "rss" | "website" | "github";
/** One source in the aside: its feed filter key (the items' source id), its look, and its count when known. */
export type AsideRow = {
  key: string;
  name: string;
  /** The @handle for an account, the host for a site or feed. */
  address: string;
  /** The X handle for the avatar, the host for the favicon. */
  mark: string;
  count: number | null;
  href: string;
  on: boolean;
};
export type AsideGroup = { kind: AsideKind; label: string; rows: AsideRow[] };

/** The source id a feed item carries for this X account (lib/accounts/posts.ts). */
export const accountSourceId = (handle: string) => `x-${handle}`;

/**
 * The agent's sources for the feed's aside: Twitter accounts, RSS feeds, then websites, empty kinds left out. Each row
 * links to the feed filtered to it; `counts` holds items this week by source id, when the read has them.
 */
export function asideGroups(
  data: MonitorSources,
  {
    href,
    selected,
    counts,
  }: { href: (key: string) => string; selected: string | null; counts: Map<string, number> | null },
): AsideGroup[] {
  const row = (key: string, name: string, address: string, mark: string): AsideRow => ({
    key,
    name,
    address,
    mark,
    // A zero is left out, never shown as a count.
    count: counts?.get(key) || null,
    href: href(key),
    on: key === selected,
  });
  const accounts = data.accounts.flatMap((account) => {
    const handle = normalizeValidHandle(account.handle);
    if (!handle) return [];
    const name = account.name && account.name !== handle ? account.name : `@${handle}`;
    return [row(accountSourceId(handle), name, `@${handle}`, handle)];
  });
  const sites = (kind: "rss" | "website") =>
    data.sources.flatMap(({ source_id, sources: source }) =>
      source && source.kind === kind
        ? [row(source_id, source.name, hostOf(source.target), hostOf(source.target))]
        : [],
    );
  const groups = copy.onboarding.groups;
  return (
    [
      { kind: "x", label: groups.x, rows: accounts },
      { kind: "rss", label: groups.rss, rows: sites("rss") },
      { kind: "website", label: groups.website, rows: sites("website") },
    ] satisfies AsideGroup[]
  ).filter((group) => group.rows.length);
}
