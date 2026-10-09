import { councilStories, recentItems, items as oldItems, type FeedStory as BaseStory, type ItemView as BaseItem } from "@/next/data/feed";
import { githubRelease } from "@/next/data/landing";
import {
  beat,
  brief,
  chosenAccounts,
  chosenSites,
  profile,
  posts,
  postsRead,
  kept,
  droppedSample,
  candidateCount,
  tableRows,
  KEEP_LINE,
  batches,
  DAYS,
  SITES_MAX,
} from "@/next/data/onboarding";

// Window direction, v2. Every story, source and quote comes from next/data (verified public pages, the recorded
// onboarding run and the stored GitHub release lines). Nothing here calls a model. Changes from the accepted
// feed's data, each from the owner's October 2 notes:
// - Sources are grouped by what they are (TWITTER ACCOUNTS, RSS FEEDS, WEBSITES, GITHUB, PRODUCT HUNT), all weighed the same.
// - GitHub is a source: its stored release lines become a story card (Direct) and join the Next.js 15 story with the
//   @nextjs post (Clustered). Facts come only from the stored post text and the stored release lines.
// - The Bank of England and CNBC stories are left out: their sources are not in this person's source list.
// - The Next.js blog article is left out for the same reason; the Next.js 15 story is rebuilt from the post and the
//   release, both of which are in the list.

export { beat, brief, profile, posts, postsRead, kept, droppedSample, candidateCount, tableRows, KEEP_LINE, batches, DAYS, SITES_MAX };

export const HANDLE = "farzanmrz";
export const PREVIEW_NOTE = "Preview data from public sources, not from your agent";

export type Kind = "post" | "article" | "github";
export type Group = "x" | "rss" | "website" | "github" | "producthunt";

export type Source = {
  id: string;
  group: Group;
  name: string;
  /** What the "handle" toggle shows: @handle for X, host for feeds and websites, owner/repo for GitHub. */
  handle: string;
  /** Favicon host, or null for X avatars and brand marks. */
  host: string | null;
  focus: string;
  why: string | null;
};

export type Item = Omit<BaseItem, "kind"> & { kind: Kind; sourceId: string };

export type Fact = { text: string; evidence: { item: string; span: string }[] };

export type Story = {
  id: string;
  view: "clustered" | "direct";
  headline: string;
  image: string | null;
  items: Item[];
  facts: Fact[];
};

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export const groups: { id: Group; label: string }[] = [
  { id: "x", label: "Twitter accounts" },
  { id: "rss", label: "RSS feeds" },
  { id: "website", label: "Websites" },
  { id: "github", label: "GitHub" },
  { id: "producthunt", label: "Product Hunt" },
];

export const sources: Source[] = [
  ...chosenAccounts.map((a) => ({
    id: a.id,
    group: "x" as const,
    name: a.name,
    handle: a.handle,
    host: null,
    focus: a.focus,
    why: a.why,
  })),
  ...chosenSites
    .filter((s) => s.kind === "rss")
    .map((s) => ({ id: s.id, group: "rss" as const, name: s.name, handle: hostOf(s.target), host: hostOf(s.target), focus: s.focus, why: s.why })),
  ...chosenSites
    .filter((s) => s.kind === "website")
    .map((s) => ({
      id: s.id,
      group: "website" as const,
      name: s.name,
      handle: `${hostOf(s.target)}${new URL(s.target).pathname}`,
      host: hostOf(s.target),
      focus: s.focus,
      why: s.why,
    })),
  // The repository and its description are the stored GitHub API values (next/data/feed.ts digests).
  {
    id: "github-vercel-nextjs",
    group: "github",
    name: "vercel/next.js",
    handle: "github.com/vercel/next.js",
    host: null,
    focus: "The React Framework",
    why: null,
  },
  // No Product Hunt item is stored for this preview, so it carries no stories here.
  {
    id: "producthunt-launches",
    group: "producthunt",
    name: "Product Hunt",
    handle: "producthunt.com",
    host: null,
    focus: "Daily launches",
    why: null,
  },
];

export const sourceById = new Map(sources.map((s) => [s.id, s]));

const asItem = (item: BaseItem, sourceId: string, kind: Kind = item.kind): Item => ({ ...item, kind, sourceId });

const r = recentItems;
const items = {
  olmo: asItem(r.olmoCore, "hugging-face-community-ml-research-blog"),
  mai: asItem(r.vercelMai, "vercel-product-and-platform-news"),
  agent: asItem(r.vercelAgent, "vercel-product-and-platform-news"),
  latent: asItem(r.latentSol, "latent-space-ai-engineering-newsletter-and-podcast"),
  simon: asItem(r.simonSol, "simon-willison-personal-tech-blog"),
  mistral: asItem(r.mistralMunich, "mistral-ai-company-news"),
  nextPost: asItem(oldItems.nextPost, "q-nextjs"),
  release: {
    ...asItem(githubRelease, "github-vercel-nextjs", "github"),
    publisher: "vercel/next.js",
    title: "v15.0.0",
  },
};
export { items };

const ev = (item: Item, span: string) => ({ item: item.id, span });
const f = (text: string, ...evidence: { item: string; span: string }[]): Fact => ({ text, evidence });

const fromBase = (s: BaseStory, view: Story["view"], list: Item[]): Story => ({
  id: s.id,
  view,
  headline: s.card.headline,
  image: s.card.image,
  items: list,
  facts: s.card.facts.map((x) => ({ text: x.text, evidence: x.evidence })),
});

// The verified cards from next/data/feed.ts, looked up by id so their facts stay exactly as stored.
const card = (id: string) => councilStories.find((s) => s.id === id)!;

const olmo = (view: Story["view"]) => ({ ...fromBase(card("st-hf-olmocore3"), view, [items.olmo]), id: `${view}-olmo` });
const mai = (view: Story["view"]) => ({ ...fromBase(card("st-vercel-mai"), view, [items.mai]), id: `${view}-mai` });
const agent = (view: Story["view"]) => ({ ...fromBase(card("st-vercel-agent"), view, [items.agent]), id: `${view}-agent` });
const mistral = (view: Story["view"]) => ({ ...fromBase(card("st-mistral-munich"), view, [items.mistral]), id: `${view}-mistral` });

const sol: Story = { ...fromBase(card("st-gpt61-sol"), "clustered", [items.latent, items.simon]), id: "clustered-sol" };
const latent: Story = { ...fromBase(card("st-latent-sol"), "direct", [items.latent]), id: "direct-latent" };
const simon: Story = { ...fromBase(card("st-simon-sol"), "direct", [items.simon]), id: "direct-simon" };
const nextPost: Story = { ...fromBase(card("st-next-post"), "direct", [items.nextPost]), id: "direct-nextjs-post" };

/** The release on its own: what changed, in plain words, from the two stored release lines and the tag. */
const release: Story = {
  id: "direct-nextjs-release",
  view: "direct",
  headline: "Next.js v15.0.0 adds React 19 support and stops caching fetch requests by default",
  image: null,
  items: [items.release],
  facts: [
    f("Version 15.0.0 of Next.js, the React framework, is out as a full release.", ev(items.release, "v15.0.0")),
    f("It supports React 19 in both the App Router and the Pages Router.", ev(items.release, "Support React 19 in App and Pages router: #65058")),
    f("Breaking change: fetch requests are no longer cached automatically.", ev(items.release, "[Breaking] Disable automatic fetch caching: #66004")),
  ],
};

/** The @nextjs post and the vercel/next.js release about the same event, joined into one story. */
const next15: Story = {
  id: "clustered-next15",
  view: "clustered",
  headline: "Next.js 15 is released as stable",
  image: null,
  items: [items.nextPost, items.release],
  facts: [
    f(
      "Next.js 15 is now stable, published as release v15.0.0.",
      ev(items.nextPost, "Next.js 15 and Turbopack Dev are now stable."),
      ev(items.release, "v15.0.0"),
    ),
    f("Turbopack for local development is stable too.", ev(items.nextPost, "Turbopack Dev are now stable")),
    f("It supports React 19 in both the App Router and the Pages Router.", ev(items.release, "Support React 19 in App and Pages router: #65058")),
    f("Breaking change: fetch requests are no longer cached automatically.", ev(items.release, "[Breaking] Disable automatic fetch caching: #66004")),
    f("A new CLI and codemods upgrade projects automatically.", ev(items.nextPost, "Upgrade automatically with our new CLI and codemods.")),
  ],
};

export type View = "clustered" | "direct";

const byNewest = (a: Story, b: Story) => (newest(a).published_at < newest(b).published_at ? 1 : -1);

export const stories: Record<View, Story[]> = {
  clustered: [olmo("clustered"), mai("clustered"), agent("clustered"), sol, mistral("clustered"), next15].sort(byNewest),
  direct: [olmo("direct"), mai("direct"), agent("direct"), latent, simon, mistral("direct"), nextPost, release].sort(byNewest),
};

export const counts = { clustered: stories.clustered.length, direct: stories.direct.length };

export function newest(story: Story) {
  return story.items.reduce((a, b) => (a.published_at > b.published_at ? a : b));
}

export function storiesFrom(view: View, sourceId: string | null) {
  const list = stories[view];
  return sourceId ? list.filter((s) => s.items.some((i) => i.sourceId === sourceId)) : list;
}

/** Stories citing each source in a view; sources with none are simply absent (never a zero). */
export function storyCounts(view: View) {
  const m = new Map<string, number>();
  for (const s of stories[view]) for (const id of new Set(s.items.map((i) => i.sourceId))) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** Each article, post and release once (the Direct view holds each one once). */
export const allItems: Item[] = stories.direct.map((s) => s.items[0]);

export const kindWord: Record<Kind, [string, string]> = {
  post: ["Post", "Posts"],
  article: ["Article", "Articles"],
  github: ["Release", "Releases"],
};

/** Preview status values, the fixture states earlier renders used: 2 checking (1 after the replayed arrival),
 * 1 failed, alerts not yet connected, the free week just started. */
export const status = { pending: 2, failed: 1, daysLeft: 7, trialDays: 7, poolUsed: 0, poolLimit: 300 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed UTC formatting so server and client agree; the year shows only outside 2026. */
export function when(iso: string, withTime = true) {
  const d = new Date(iso);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const year = d.getUTCFullYear() === 2026 ? "" : `, ${d.getUTCFullYear()}`;
  if (!withTime) return `${day}${year}`;
  return `${day}${year}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Feed items per UTC day for the seven days ending on the newest stored item, by publication date, by kind. */
export function perDay(days = 7) {
  const last = allItems.reduce((a, r) => (r.published_at > a ? r.published_at : a), "").slice(0, 10);
  const end = new Date(`${last}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    const on = allItems.filter((r) => r.published_at.slice(0, 10) === key);
    return {
      day: key,
      label: when(`${key}T00:00:00Z`, false),
      article: on.filter((r) => r.kind === "article").length,
      post: on.filter((r) => r.kind === "post").length,
      github: on.filter((r) => r.kind === "github").length,
    };
  });
}

export const week = perDay();
export const weekKinds = {
  article: week.reduce((n, d) => n + d.article, 0),
  post: week.reduce((n, d) => n + d.post, 0),
  github: week.reduce((n, d) => n + d.github, 0),
};

export const ARRIVAL_DELAY_MS = 2600;

export function hrefWith(base: string, params: { view?: View; theme?: string; source?: string | null }) {
  const q = new URLSearchParams();
  if (params.view && params.view !== "clustered") q.set("view", params.view);
  if (params.source) q.set("source", params.source);
  if (params.theme === "light" || params.theme === "dark") q.set("theme", params.theme);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/** Plain-text DM as lib/alerts/pack.ts builds it (next/data/feed.ts packDm). */
export function dmText(list: Story[]) {
  return list.slice(0, 10).map((s) => ({
    headline: s.headline,
    lead: s.facts[0].text,
    link: `oparax.ai/${HANDLE}/${s.id.replace(/^(clustered|direct)-/, "st-")}`,
  }));
}
