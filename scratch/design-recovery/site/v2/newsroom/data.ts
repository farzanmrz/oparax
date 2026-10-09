import { councilStories, recentItems, items as baseItems, type FeedStory, type ItemView, type VerifiedFact } from "@/next/data/feed";
import { githubRelease } from "@/next/data/landing";
import { digests } from "@/next/data/feed";
import {
  beat,
  brief,
  buildLog,
  candidateCount,
  chosenAccounts,
  chosenSites,
  droppedSample,
  kept,
  posts,
  postsRead,
  profile,
  type Candidate,
} from "@/next/data/onboarding";

// Newsroom v2 content. Everything comes from the recorded preview data in next/data: the verified stories and
// their items, the recorded onboarding run (chosen sources, scores, posts, brief, build log) and the verified
// vercel/next.js v15.0.0 release. Counts and the weekly chart are computed from stored published_at values.
// The feed holds only items whose source is one of the person's sources (the recorded run's 17, plus the
// vercel/next.js repository as the GitHub source); the off-beat Bank of England and CNBC items are left out.

export { beat, brief, buildLog, candidateCount, droppedSample, kept, posts, postsRead, profile };
export type { Candidate };

export const HANDLE = "farzanmrz";
export const PREVIEW_NOTE = "Preview data from public sources, not from your agent.";

export type View = "clustered" | "direct";
export type Group = "x" | "rss" | "website" | "github";
export type Kind = "post" | "article" | "github";

export const groupLabel: Record<Group, string> = {
  x: "TWITTER ACCOUNTS",
  rss: "RSS FEEDS",
  website: "WEBSITES",
  github: "GITHUB",
};

export const groupSingular: Record<Group, string> = {
  x: "Twitter account",
  rss: "RSS feed",
  website: "Website",
  github: "GitHub repository",
};

export type Source = {
  id: string;
  group: Group;
  name: string;
  /** Twitter handle, feed or page address, or owner/repo: what the "Handle" toggle shows. */
  handle: string;
  host: string;
  focus: string;
  why: string | null;
};

export function hostOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

const shortAddress = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export const GITHUB_SOURCE_ID = "gh-vercel-next";

export const sources: Source[] = [
  ...chosenAccounts.map((a) => ({
    id: a.id,
    group: "x" as const,
    name: a.name,
    handle: a.handle,
    host: "x.com",
    focus: a.focus,
    why: a.why,
  })),
  ...chosenSites.map((s) => ({
    id: s.id,
    group: (s.kind === "website" ? "website" : "rss") as Group,
    name: s.name,
    handle: shortAddress(s.target),
    host: hostOf(s.target),
    focus: s.focus,
    why: s.why,
  })),
  {
    id: GITHUB_SOURCE_ID,
    group: "github",
    name: "Next.js",
    handle: "vercel/next.js",
    host: "github.com",
    focus: digests[0].description,
    why: null,
  },
];

export const groups: Group[] = ["x", "rss", "website", "github"];
export const sourcesIn = (g: Group) => sources.filter((s) => s.group === g);
export const sourceById = new Map(sources.map((s) => [s.id, s]));

/** One item in the feed: an article (website or RSS feed), a post (X) or a GitHub release. */
export type FeedItem = Omit<ItemView, "kind"> & { kind: Kind; sourceId: string };

/** Item source ids in next/data map onto the run's source ids. */
const sourceAlias: Record<string, string> = { "src-x-nextjs": "q-nextjs", "src-github-nextjs": GITHUB_SOURCE_ID };

const asItem = (i: ItemView, kind: Kind = i.kind): FeedItem => ({ ...i, kind, sourceId: sourceAlias[i.source_id] ?? i.source_id });

export type Story = { id: string; card: FeedStory["card"]; items: FeedItem[] };

const fromFeed = (id: string): Story => {
  const s = councilStories.find((x) => x.id === id) ?? (null as never);
  return { id: s.id, card: s.card, items: s.items.map((i) => asItem(i)) };
};

const release = asItem(githubRelease, "github");

const ev = (span: string) => ({ item: release.id, span });
const fact = (text: string, spans: string[]): VerifiedFact => ({ text, evidence: spans.map(ev), support: 0.95, attribution: 0.95 });

/** The GitHub release as its own story: what changed, in plain words, from the stored release lines only. */
export const githubStory: Story = {
  id: "st-gh-next-15",
  items: [release],
  card: {
    headline: "Next.js v15.0.0 adds React 19 support and stops caching fetch requests by default",
    headline_from: "writer",
    image: null,
    publishers: [{ source_id: GITHUB_SOURCE_ID, name: "GitHub", url: release.url }],
    facts: [
      fact("vercel/next.js published release v15.0.0 on October 21, 2024, a full release, not a prerelease.", ["v15.0.0"]),
      fact("The App Router and the Pages Router now both support React 19 (pull request #65058).", [
        "Support React 19 in App and Pages router: #65058",
      ]),
      fact("Breaking change: fetch requests are no longer cached automatically (pull request #66004).", [
        "[Breaking] Disable automatic fetch caching: #66004",
      ]),
    ],
  },
};

/** The release lines exactly as stored, for the release block. */
export const releaseLines = githubRelease.text.split("\n");
export const releaseMeta = { repo: "vercel/next.js", tag: "v15.0.0", description: digests[0].description, released: digests[0].released_at };

const direct: Story[] = [
  fromFeed("st-hf-olmocore3"),
  fromFeed("st-vercel-mai"),
  fromFeed("st-vercel-agent"),
  fromFeed("st-latent-sol"),
  fromFeed("st-simon-sol"),
  fromFeed("st-mistral-munich"),
  fromFeed("st-next-post"),
  githubStory,
];

const clustered: Story[] = [
  fromFeed("st-hf-olmocore3"),
  fromFeed("st-vercel-mai"),
  fromFeed("st-vercel-agent"),
  fromFeed("st-gpt61-sol"),
  fromFeed("st-mistral-munich"),
  fromFeed("st-next-post"),
  githubStory,
];

export function newest(story: Story) {
  return story.items.reduce((a, b) => (a.published_at > b.published_at ? a : b));
}

const byNewest = (a: Story, b: Story) => (newest(a).published_at < newest(b).published_at ? 1 : -1);

export function storiesFor(view: View): Story[] {
  return [...(view === "clustered" ? clustered : direct)].sort(byNewest);
}

/** Every item in the feed once. */
export const feedItems: FeedItem[] = direct.map((s) => s.items[0]);

export const itemsFrom = (sourceId: string) => feedItems.filter((i) => i.sourceId === sourceId).length;

export const kindWord: Record<Kind, [string, string]> = {
  post: ["post", "posts"],
  article: ["article", "articles"],
  github: ["GitHub release", "GitHub releases"],
};

export const plural = (n: number, kind: Kind) => `${n} ${kindWord[kind][n === 1 ? 0 : 1]}`;

/** Preview status, the same fixture states as the accepted feeds: one item still checking after the replay,
 * one failed, alerts not connected, the free week just started. */
export const status = { pending: 2, failed: 1, daysLeft: 7, trialDays: 7, poolUsed: 0, poolLimit: 300 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function day(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear() === 2026 ? "" : `, ${d.getUTCFullYear()}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${y}`;
}

export function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Items per UTC day for the seven days ending on the newest stored item, by publication date. */
export const week = (() => {
  const last = feedItems.reduce((a, r) => (r.published_at > a ? r.published_at : a), "").slice(0, 10);
  const end = new Date(`${last}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const key = new Date(end - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    const on = feedItems.filter((r) => r.published_at.slice(0, 10) === key);
    return { key, label: day(`${key}T00:00:00Z`), count: on.length };
  });
})();
export const weekItems = feedItems.filter((r) => r.published_at.slice(0, 10) >= week[0].key);

/** The ARRIVAL replay: the newest story lands once after this delay. */
export const ARRIVAL_DELAY_MS = 2600;

export function href(base: string, params: Record<string, string | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export const themeParam = (theme?: string) => (theme === "light" || theme === "dark" ? theme : undefined);

// Landing hero: the Next.js 15 day of October 21, 2024, from next/data/landing (verified spans).
export { heroStory, heroArrivals } from "@/next/data/landing";
export const heroItems = {
  blog: asItem(baseItems.nextBlog),
  release,
  post: asItem(baseItems.nextPost),
};
export const recent = recentItems;

export const plans = [
  { name: "Hobby", price: "$5", posts: 100, alerts: "One DM a day" },
  { name: "Creator", price: "$30", posts: 3000, alerts: "One DM a day" },
  { name: "Wire", price: "$99", posts: 4000, alerts: "Every 15 minutes when there is news" },
] as const;

/** Recorded onboarding numbers (build_state): candidates scored, passed the keep line, chosen. */
export const funnel = {
  candidates: candidateCount,
  passed: kept.length,
  chosen: chosenSites.length + chosenAccounts.length,
};
export const chosenIds = new Set([...chosenSites.map((s) => s.id), ...chosenAccounts.map((a) => a.id)]);
export const whyById = new Map<string, string>([...chosenSites, ...chosenAccounts].map((c) => [c.id, c.why]));
export const KEEP_LINE = 0.35;
