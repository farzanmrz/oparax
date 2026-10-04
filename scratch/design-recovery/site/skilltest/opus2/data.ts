import { councilStories, packDm, recentItems, type FeedStory, type ItemView } from "@/next/data/feed";
import { beat, brief, buildLog, candidateCount, chosenSites, chosenAccounts, kept, droppedSample, KEEP_LINE, postsRead, profile } from "@/next/data/onboarding";
import { counts, digests, reports, status, week, when, clock, hostOf, HANDLE } from "@/next/council/data";

// Landing data. Everything comes from the recorded preview data in next/data (verified reports and stories,
// the recorded onboarding run, the verified GitHub release) and the product rules in docs/roadmap.md.
// Counts and charts are computed here from stored values only.

export { beat, brief, buildLog, candidateCount, KEEP_LINE, postsRead, profile, counts, digests, status, week, when, clock, hostOf, HANDLE };
export type { FeedStory, ItemView };

export type SourceKind = "x" | "rss" | "website" | "github" | "producthunt";

const clustered = councilStories.filter((s) => s.arrangement === "clustered");
const byId = (id: string) => councilStories.find((s) => s.id === id)!;

export const solStory = byId("st-gpt61-sol");
export const olmoStory = byId("st-c-olmo");
export const maiStory = byId("st-c-mai");
export const agentStory = byId("st-c-agent");
export const mistralStory = byId("st-c-mistral");

/** The six recent reports, newest first, each with the story it landed in. */
export const wire = Object.values(recentItems)
  .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
  .map((item) => ({ item, story: clustered.find((s) => s.items.some((i) => i.id === item.id))! }));

/** Every stored report, newest first (the older Next.js and Bank of England reports included). */
export const wireAll = [...reports]
  .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
  .map((item) => ({ item, story: clustered.find((s) => s.items.some((i) => i.id === item.id))! }));

/** The DM exactly as lib/alerts/pack.ts builds it, for the two newest stories plus the joined one. */
export const dmStories = [olmoStory, solStory];
export const dmText = packDm(HANDLE, dmStories);

/** Sources for the recorded run: chosen sites and feeds, chosen X accounts, and one GitHub repository. */
export type SourceRow = {
  id: string;
  kind: SourceKind;
  name: string;
  address: string;
  host?: string;
  handle?: string;
  note: string;
  latest?: ItemView;
};

const latestFor = (sourceId: string) =>
  reports.filter((r) => r.source_id === sourceId).sort((a, b) => (a.published_at < b.published_at ? 1 : -1))[0];

export const sourceRows: SourceRow[] = [
  ...chosenSites.map((s) => ({
    id: s.id,
    kind: (s.kind === "website" ? "website" : "rss") as SourceKind,
    name: s.name,
    address: s.target.replace(/^https?:\/\/(www\.)?/, ""),
    host: hostOf(s.target),
    note: s.focus,
    latest: latestFor(s.id),
  })),
  ...chosenAccounts.map((a) => ({
    id: a.id,
    kind: "x" as SourceKind,
    name: a.name,
    address: a.handle,
    handle: a.handle,
    note: a.focus || a.why,
  })),
  {
    id: "gh-vercel-next",
    kind: "github",
    name: "vercel/next.js",
    address: "github.com/vercel/next.js",
    host: "github.com",
    note: digests[0].description,
  },
];

export const githubRelease = digests[0];

/** Onboarding funnel from the recorded run. */
export const funnel = {
  candidates: candidateCount,
  passed: kept.length,
  chosen: chosenSites.length + chosenAccounts.length,
  sites: chosenSites.length,
  accounts: chosenAccounts.length,
};
const chosenIds = new Set([...chosenSites.map((s) => s.id), ...chosenAccounts.map((a) => a.id)]);
export const scoreDots = [
  ...kept.map((c) => ({ id: c.id, name: c.name, score: c.score, kind: c.kind, state: chosenIds.has(c.id) ? "chosen" : "passed" })),
  ...droppedSample.map((c) => ({ id: c.id, name: c.name, score: c.score, kind: c.kind, state: "dropped" })),
] as { id: string; name: string; score: number; kind: string; state: "chosen" | "passed" | "dropped" }[];

/** Report arrival timeline for the 48 hours of Sep 30 and Oct 1 (UTC), from stored published_at. */
export const DAY0 = Date.parse("2026-09-30T00:00:00Z");
export const SPAN = 2 * 86_400_000;
export const timeline = wire
  .map(({ item, story }) => ({ item, story, t: Date.parse(item.published_at) }))
  .filter((r) => r.t >= DAY0 && r.t < DAY0 + SPAN)
  .sort((a, b) => a.t - b.t);

/** Wire: a mini digest at the next 15-minute mark after news, nothing when there is none. */
export const wireDms = (() => {
  const slots = new Map<number, typeof timeline>();
  for (const r of timeline) {
    const slot = Math.ceil((r.t + 1) / 900_000) * 900_000;
    slots.set(slot, [...(slots.get(slot) ?? []), r]);
  }
  return [...slots.entries()].map(([t, rs]) => ({ t, reports: rs })).sort((a, b) => a.t - b.t);
})();

export const reportCount = counts.direct;
export const storyCount = counts.clustered;
