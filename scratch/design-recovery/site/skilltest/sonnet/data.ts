// Everything on the landing page comes from the preview app's recorded, verified data (next/data).
// Nothing here is invented: stories, facts, quotes, sources and plans are the same rows the feed renders.
import { councilStories, packDm, PREVIEW_NOTE, type FeedStory, type ItemView } from "@/next/data/feed";
import { heroStory, githubRelease } from "@/next/data/landing";
import { beat, chosenAccounts, chosenSites } from "@/next/data/onboarding";

export { PREVIEW_NOTE, beat };

export type Kind = "post" | "article" | "github";

/** The kind of a report: an X post, an article (site or feed), or a GitHub release. */
export function kindOf(item: ItemView): Kind {
  if (item.kind === "post") return "post";
  return item.publisher === "GitHub" ? "github" : "article";
}

export const kindWord: Record<Kind, string> = { post: "Post", article: "Article", github: "Release" };

export function hostOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

const UTC = "UTC";
export function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
export function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: UTC });
}
export function dayYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: UTC });
}

/* Hero: the Next.js 15 story joined from three kinds of report (landing.ts, verified against the public pages). */
export const hero = {
  story: heroStory,
  reports: heroStory.items.slice().sort((a, b) => a.published_at.localeCompare(b.published_at)),
  dm: packDm("farzanmrz", [heroStory]),
  handle: "farzanmrz",
  github: githubRelease,
};

/** A story's facts with the kinds of report that carry each one. */
export function factKinds(story: FeedStory) {
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return story.card.facts.map((f) => ({
    text: f.text,
    kinds: Array.from(new Set(f.evidence.map((e) => byId.get(e.item)).filter(Boolean).map((i) => kindOf(i as ItemView)))) as Kind[],
  }));
}

/* Evidence ledger: the GPT-6.1 Sol story, joined from Latent Space and Simon Willison. */
const sol = councilStories.find((s) => s.id === "st-gpt61-sol")!;
const latent = sol.items.find((i) => i.publisher === "Latent Space")!;
const simon = sol.items.find((i) => i.publisher === "Simon Willison")!;
export const ledger = {
  story: sol,
  left: latent,
  right: simon,
  rows: sol.card.facts.map((f) => ({
    text: f.text,
    left: f.evidence.find((e) => e.item === latent.id)?.span ?? null,
    right: f.evidence.find((e) => e.item === simon.id)?.span ?? null,
  })),
  dm: packDm("farzanmrz", [sol]),
};

/* The page a DM links to: the GPT-6.1 Sol story, beside other real stories from the same feed. */
const pickStory = (id: string) => councilStories.find((s) => s.id === id)!;
export const board = {
  before: pickStory("st-c-olmo"),
  current: sol,
  after: pickStory("st-c-mistral"),
};

/* Sources: the recorded onboarding run for @farzanmrz (names, kinds and focus lines are rows of the source table). */
export const sources = {
  beat,
  accounts: chosenAccounts.map((a) => ({ id: a.id, name: a.name, handle: a.handle })),
  feeds: chosenSites.filter((s) => s.kind === "rss").map((s) => ({ id: s.id, name: s.name, host: hostOf(s.target), focus: s.focus })),
  websites: chosenSites
    .filter((s) => s.kind === "website")
    .map((s) => ({ id: s.id, name: s.name, host: hostOf(s.target), focus: s.focus, where: hostOf(s.target) + new URL(s.target).pathname.replace(/\/$/, "") })),
};

/* Plans: docs/roadmap.md, "Plans and payment" (owner, September 28). */
export const plans = [
  { id: "hobby", name: "Hobby", price: 5, posts: 100, cadence: "daily" as const, cadenceWord: "One alert a day" },
  { id: "creator", name: "Creator", price: 30, posts: 3000, cadence: "daily" as const, cadenceWord: "One alert a day" },
  { id: "wire", name: "Wire", price: 99, posts: 4000, cadence: "fifteen" as const, cadenceWord: "Every 15 minutes, when there is news" },
];
export const freeWeek = { days: 7, posts: 300 };
export const POOL_MAX = 4000;
