import { councilStories, digests, items, PREVIEW_NOTE, packDm, type FeedStory, type ItemView, type VerifiedFact } from "@/next/data/feed";
import { githubRelease, heroStory } from "@/next/data/landing";
import { beat, chosenAccounts, chosenSites } from "@/next/data/onboarding";

// Deck v2 content. Every story, fact and span comes from next/data (verified against the public pages); the
// sources are the recorded onboarding run's chosen sites, feeds and Twitter accounts, plus the vercel/next.js GitHub
// repository whose stored release (v15.0.0) is the GitHub item. Counts and the week chart are computed here from
// stored published_at values only. Changes from the accepted Deck feed: the Bank of England story is dropped
// (neither of its sources is in this person's source list), and GitHub is a source like any other: its release
// joins the Next.js 15 story in Clustered and is its own card in Direct.

export { beat, PREVIEW_NOTE, packDm };
export type { FeedStory, ItemView };

export type View = "clustered" | "direct";
/** What an item is: website and RSS items are articles, X items are posts, GitHub items are releases. */
export type Kind = "post" | "article" | "release";
export type Group = "x" | "rss" | "website" | "github";

export const HANDLE = "farzanmrz";

export const kindOf = (item: ItemView): Kind => (item.id === githubRelease.id ? "release" : item.kind);

const ev = (item: ItemView, span: string) => ({ item: item.id, span });
const fact = (text: string, evidence: { item: string; span: string }[]): VerifiedFact => ({
  text,
  evidence,
  support: 0.95,
  attribution: 0.95,
});

/** The GitHub release as its own card: what changed, restated in plain words from the two stored release lines. */
const githubStory: FeedStory = {
  id: "st-github-next15",
  arrangement: "direct",
  items: [githubRelease],
  card: {
    headline: "Next.js v15.0.0 supports React 19 and stops caching fetch by default",
    headline_from: "writer",
    image: null,
    publishers: [{ source_id: githubRelease.source_id, name: "GitHub", url: githubRelease.url }],
    facts: [
      fact("The App Router and the Pages Router both support React 19.", [ev(githubRelease, "Support React 19 in App and Pages router")]),
      fact("Breaking change: fetch requests are no longer cached automatically.", [ev(githubRelease, "Disable automatic fetch caching")]),
    ],
  },
};

const byId = new Map(councilStories.map((s) => [s.id, s]));
const pick = (...ids: string[]) => ids.map((id) => byId.get(id)!);

/** The Next.js 15 story from the person's own sources: the @nextjs post and the vercel/next.js release. The Next.js
 * Blog article is left out because it is not one of this person's sources; every fact keeps its other evidence. */
const restated: Record<number, string> = {
  0: "Next.js 15 was declared stable on October 21, 2024.",
  3: "Fetch requests are no longer cached automatically.",
};
const nextClustered: FeedStory = {
  ...heroStory,
  id: "st-next-15-gh",
  arrangement: "clustered",
  items: heroStory.items.filter((i) => i.id !== items.nextBlog.id),
  card: {
    ...heroStory.card,
    image: null,
    publishers: heroStory.card.publishers.filter((p) => p.source_id !== items.nextBlog.source_id),
    // Each fact keeps only the evidence of the post and the release, and says only what that evidence supports.
    facts: heroStory.card.facts.map((f, i) => ({
      ...f,
      text: restated[i] ?? f.text,
      evidence: f.evidence.filter((e) => e.item !== items.nextBlog.id),
    })),
  },
};

export const stories: Record<View, FeedStory[]> = {
  clustered: [...pick("st-c-olmo", "st-c-mai", "st-c-agent", "st-gpt61-sol", "st-c-mistral"), nextClustered],
  direct: [
    ...pick("st-hf-olmocore3", "st-vercel-mai", "st-vercel-agent", "st-latent-sol", "st-simon-sol", "st-mistral-munich", "st-next-post"),
    githubStory,
  ],
};

/** Every distinct item in the feed (Direct holds each once). */
export const feedItems: ItemView[] = stories.direct.map((s) => s.items[0]);

// ───────────── Sources ─────────────

export type Source = {
  id: string;
  group: Group;
  name: string;
  /** The handle form: @handle for X, the feed or page address for RSS and websites, owner/repo for GitHub. */
  handle: string;
  /** Host for the favicon, or the Twitter handle for the avatar. */
  mark: string;
  focus: string;
  why: string | null;
};

const address = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/** Focus lines for the quoted accounts, which joined from the person's posts and so have no table focus line. */
const quotedFocus: Record<string, string> = {
  "q-nextjs": "Next.js releases and framework announcements",
  "q-rauchg": "Vercel's CEO on Next.js direction and the AI cloud",
  "q-leerob": "Next.js practice and developer experience",
};

export const sources: Source[] = [
  ...chosenAccounts.map((a) => ({
    id: a.id,
    group: "x" as const,
    name: a.name,
    handle: a.handle,
    mark: a.handle,
    focus: a.focus || quotedFocus[a.id] || "",
    why: a.why,
  })),
  ...chosenSites.map((s) => ({
    id: s.id,
    group: (s.kind === "website" ? "website" : "rss") as Group,
    name: s.name,
    handle: address(s.target),
    mark: hostOf(s.target),
    focus: s.focus,
    why: s.why,
  })),
  {
    id: "github-vercel-nextjs",
    group: "github",
    name: "vercel/next.js",
    handle: "github.com/vercel/next.js",
    mark: "github",
    focus: digests[0].description,
    why: null,
  },
];

export const groups: { id: Group; label: string }[] = [
  { id: "x", label: "Twitter accounts" },
  { id: "rss", label: "RSS feeds" },
  { id: "website", label: "Websites" },
  { id: "github", label: "GitHub" },
];

/** Which source an item came from. */
const itemSource: Record<string, string> = {
  [items.nextPost.id]: "q-nextjs",
  [githubRelease.id]: "github-vercel-nextjs",
};
export function sourceOf(item: ItemView): Source | undefined {
  const id = itemSource[item.id] ?? item.source_id;
  return sources.find((s) => s.id === id);
}

export function itemsFrom(sourceId: string) {
  return feedItems.filter((i) => sourceOf(i)?.id === sourceId);
}

const unit: Record<Kind, [string, string]> = {
  post: ["post", "posts"],
  article: ["article", "articles"],
  release: ["release", "releases"],
};
export const kindCount = (kind: Kind, n: number) => `${n} ${unit[kind][n === 1 ? 0 : 1]}`;

/** "2 articles", "1 post": what a source has in the feed now, or null when it has nothing. */
export function sourceCount(sourceId: string) {
  const list = itemsFrom(sourceId);
  if (!list.length) return null;
  const k = kindOf(list[0]);
  return kindCount(k, list.length);
}

export function storyHasSource(story: FeedStory, sourceId: string) {
  return story.items.some((i) => sourceOf(i)?.id === sourceId);
}

/** The label of an item's publisher in name or handle mode. */
export function itemLabel(item: ItemView, mode: "name" | "handle") {
  const src = sourceOf(item);
  if (mode === "name") return src?.name ?? item.publisher;
  if (src) return src.handle;
  return item.kind === "post" ? (item.author ?? item.publisher) : address(item.url).split("/")[0];
}

// ───────────── Time and the week ─────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed UTC formatting so server and client agree; the year shows only outside 2026. */
export function when(iso: string, withTime = true) {
  const d = new Date(iso);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const year = d.getUTCFullYear() === 2026 ? "" : `, ${d.getUTCFullYear()}`;
  if (!withTime || year) return `${day}${year}`;
  return `${day}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function newest(story: FeedStory) {
  return story.items.reduce((a, b) => (a.published_at > b.published_at ? a : b));
}

/** Stories per UTC day, by the day of each story's newest item, for the seven days ending on the newest item. */
function storiesPerDay(days = 7) {
  const list = stories.clustered;
  const last = feedItems.reduce((a, r) => (r.published_at > a ? r.published_at : a), "").slice(0, 10);
  const end = new Date(`${last}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return {
      day: key,
      label: when(`${key}T00:00:00Z`, false),
      count: list.filter((s) => newest(s).published_at.slice(0, 10) === key).length,
    };
  });
}

export const week = storiesPerDay();
export const storiesThisWeek = week.reduce((n, d) => n + d.count, 0);
export const newestItem = feedItems.reduce((a, b) => (a.published_at > b.published_at ? a : b));

/** Preview status values (the accepted feeds' fixture: 2 checking, 1 failed, alerts not connected, free week day 1). */
export const status = { pending: 2, failed: 1, daysLeft: 7, trialDays: 7, poolUsed: 0, poolLimit: 300 };

/** The newest story replays its arrival once on load (a preview replay of a stored item, not live activity). */
export const ARRIVAL_DELAY_MS = 2600;
