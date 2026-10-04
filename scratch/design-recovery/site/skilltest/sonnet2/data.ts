import { councilStories, recentItems, digests } from "@/next/data/feed";
import { droppedSample, brief, posts, candidateCount, kept, chosenSites, chosenAccounts } from "@/next/data/onboarding";
import { sites, accounts, week, weekTotal, reports, when, clock, hostOf, newest, beat, HANDLE, status } from "@/next/council/data";

// Everything on the page comes from the recorded preview data the accepted feeds already use: verified
// stories and reports, the recorded onboarding run's sources and accounts, the verified GitHub release.
export { sites, accounts, week, weekTotal, reports, when, clock, hostOf, newest, beat, HANDLE, status, brief, posts, droppedSample, digests, recentItems, candidateCount, kept, chosenSites, chosenAccounts };

export const clustered = councilStories.filter((s) => s.arrangement === "clustered");
export const sol = councilStories.find((s) => s.id === "st-gpt61-sol")!;
export const olmo = councilStories.find((s) => s.id === "st-c-olmo")!;
export const mai = councilStories.find((s) => s.id === "st-c-mai")!;
export const agent = councilStories.find((s) => s.id === "st-c-agent")!;
export const mistral = councilStories.find((s) => s.id === "st-c-mistral")!;
export const nextjs = councilStories.find((s) => s.arrangement === "clustered" && s.items.some((i) => i.id === "item-nextjs-blog"))!;

export type SrcKind = "x_account" | "website" | "rss" | "github" | "product_hunt";
export const kindMeta: Record<SrcKind, { label: string; hue: string }> = {
  x_account: { label: "X account", hue: "blue" },
  website: { label: "Website", hue: "cyan" },
  rss: { label: "RSS feed", hue: "amber" },
  github: { label: "GitHub", hue: "violet" },
  product_hunt: { label: "Product Hunt", hue: "orange" },
};

export const host = (target: string) => new URL(target).hostname.replace(/^www\./, "");

/** Table rows: the recorded run's chosen sources, plus the GitHub release source and Product Hunt. */
const siteRows = chosenSites.map((c) => kept.find((k) => k.id === c.id)!);
const pickRows = [...siteRows.slice(0, 5), siteRows.find((r) => r.kind === "website")!];
export const sourceRows: { name: string; sub: string; kind: SrcKind; focus: string; host?: string; handle?: string }[] = [
  ...pickRows.map((c) => ({ name: c.name, sub: host(c.target), kind: c.kind as SrcKind, focus: c.focus, host: host(c.target) })),
  { name: "vercel/next.js", sub: "github.com", kind: "github", focus: "Releases", host: "github.com" },
  { name: "Product Hunt", sub: "producthunt.com", kind: "product_hunt", focus: "Launches", host: "producthunt.com" },
  ...kept
    .filter((c) => chosenAccounts.some((a) => a.id === c.id))
    .slice(0, 3)
    .map((c) => ({ name: c.name, sub: c.target.replace("https://x.com/", "@").toLowerCase(), kind: "x_account" as SrcKind, focus: c.focus || "Quoted in your posts", handle: c.target.replace("https://x.com/", "@").toLowerCase() })),
];
export const totals = {
  rss: siteRows.filter((r) => r.kind === "rss").length,
  website: siteRows.filter((r) => r.kind === "website").length,
  x: chosenAccounts.length,
  all: siteRows.length + chosenAccounts.length + 2,
};

export const dayLabel = (iso: string) => when(iso, false);
