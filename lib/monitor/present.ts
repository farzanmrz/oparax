import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { DisplayItem, DisplayStory, PublicItem, VerifiedCard } from "@/lib/monitor/read";

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

/** Newest first, each story into the shorter of three columns by estimated height (the Deck's layout). */
export function toColumns(list: FeedStory[], n = 3): FeedStory[][] {
  const cols: FeedStory[][] = Array.from({ length: n }, () => []);
  const heights = Array.from({ length: n }, () => 0);
  for (const story of list) {
    const c = heights.indexOf(Math.min(...heights));
    cols[c].push(story);
    heights[c] += (story.image ? 172 : 0) + 128 + story.facts.length * 46 + 48;
  }
  return cols;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 1, 15:01" in UTC, with the year only outside the current one, so server and client agree. */
export function when(iso: string, now = new Date()) {
  const d = new Date(iso);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (d.getUTCFullYear() !== now.getUTCFullYear()) return `${day}, ${d.getUTCFullYear()}`;
  return `${day}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
