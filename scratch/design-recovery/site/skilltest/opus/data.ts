// Everything the landing shows, read from the preview app's recorded data (next/data) and the product roadmap
// (docs/roadmap.md). Nothing is invented here: counts are computed from the stored rows, plans are the ruled
// tiers, and the DM text is produced by the product's own packDm format.
import { chosenAccounts, chosenSites, beat, profile } from "@/next/data/onboarding";
import { digests, packDm, PREVIEW_NOTE } from "@/next/data/feed";
import { githubRelease, heroStory } from "@/next/data/landing";
import { setup, building, plans } from "@/next/copy";
import { hostOf, storiesFor } from "@/next/council/data";

export { beat, profile, heroStory, githubRelease, setup, building, plans, PREVIEW_NOTE };

export const HANDLE = profile.handle.replace("@", "");

/** Sources from the recorded build, named by kind the way the owner asked: websites and RSS feeds apart. */
export const websites = chosenSites.filter((s) => s.kind === "website").map((s) => ({ ...s, host: hostOf(s.target) }));
export const feeds = chosenSites.filter((s) => s.kind === "rss").map((s) => ({ ...s, host: hostOf(s.target) }));
export const accounts = chosenAccounts.map((a) => ({ ...a }));
/** The GitHub repository whose release the accepted feed shows (digests in next/data/feed.ts). */
export const repos = digests.filter((d) => d.kind === "github").map((d) => ({ name: d.name.split(" ")[0], release: d.name.split(" ")[1], url: d.url }));

export const sourceTotal = websites.length + feeds.length + accounts.length + repos.length;

/** The feed in its clustered arrangement, newest first (the accepted Window direction's list). */
export const clustered = storiesFor("clustered");

/** The DM the bot sends: the product's packDm format over the three newest stories. */
export const dmStories = clustered.slice(0, 3);
export const dmText = packDm(HANDLE, dmStories);

/** Product build-log lines, verbatim strings the product writes today (next/data/onboarding.ts buildLog). */
export const buildSteps = [
  { text: `Looking up ${profile.handle} on X`, state: "done" as const },
  { text: "Read 10 posts; Jev is scoring 153 candidate sources", state: "done" as const },
  { text: "Choosing recommendations and writing the brief", state: "running" as const },
];

/** Where Oparax reads and where it reaches you (the roadmap's lists; today's are in color). */
export type ReachNode = { name: string; logo?: string; logoDark?: string; glyph?: "web" | "rss"; live: boolean };

export const reads: ReachNode[] = [
  { name: "X accounts", logo: "/roadmap-brands/x.png", live: true },
  { name: "Websites", glyph: "web", live: true },
  { name: "RSS feeds", glyph: "rss", live: true },
  { name: "GitHub", logo: "/roadmap-brands/github.svg", logoDark: "/roadmap-brands/github-white.svg", live: true },
  { name: "Product Hunt", logo: "/roadmap-brands/producthunt.png", live: true },
  { name: "Reddit", logo: "/roadmap-brands/reddit.png", live: false },
  { name: "YouTube", logo: "/roadmap-brands/youtube.png", live: false },
  { name: "Instagram", logo: "/roadmap-brands/instagram.webp", live: false },
  { name: "Facebook", logo: "/roadmap-brands/facebook.png", live: false },
  { name: "Threads", logo: "/roadmap-brands/threads.webp", live: false },
  { name: "LinkedIn", logo: "/roadmap-brands/linkedin.png", live: false },
  { name: "TikTok", logo: "/roadmap-brands/tiktok-app.png", live: false },
  { name: "Snapchat", logo: "/roadmap-brands/snapchat.png", live: false },
  { name: "Yahoo Finance", logo: "/roadmap-brands/yahoofinance.png", live: false },
  { name: "Google News", logo: "/roadmap-brands/googlenews.png", live: false },
];

export const reaches: ReachNode[] = [
  { name: "X DMs", logo: "/roadmap-brands/x.png", live: true },
  { name: "Email", live: false },
  { name: "SMS", live: false },
  { name: "WhatsApp", logo: "/roadmap-brands/whatsapp-app.png", live: false },
  { name: "Messenger", logo: "/roadmap-brands/messenger.png", live: false },
  { name: "Instagram", logo: "/roadmap-brands/instagram.webp", live: false },
  { name: "Threads", logo: "/roadmap-brands/threads.webp", live: false },
  { name: "LinkedIn", logo: "/roadmap-brands/linkedin.png", live: false },
  { name: "Snapchat", logo: "/roadmap-brands/snapchat.png", live: false },
];

/** The ruled tiers (roadmap, September 28). Pools in watched X posts a month; alerts per the ruling. */
export const tiers = [
  { name: "Hobby", price: 5, pool: 100, cadence: "daily" as const, alert: "One DM a day" },
  { name: "Creator", price: 30, pool: 3000, cadence: "daily" as const, alert: "One DM a day" },
  { name: "Wire", price: 99, pool: 4000, cadence: "quarter" as const, alert: "Every 15 minutes when there is news" },
];
export const freeWeek = { days: 7, pool: 300 };
