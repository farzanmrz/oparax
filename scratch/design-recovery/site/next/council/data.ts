import { councilStories, digests, PREVIEW_NOTE, type FeedStory, type ItemView } from "../data/feed";
import { chosenAccounts, chosenSites, beat } from "../data/onboarding";

// Shared content for the three council feed directions (council-design/agreed.md). Everything on screen comes
// from next/data: verified stories and reports, the recorded onboarding run's chosen sources and accounts, and
// the verified GitHub release digest. Counts and charts are computed here from stored published_at values only.

export type View = "clustered" | "direct";
export type Kind = ItemView["kind"];

export { digests, PREVIEW_NOTE, beat };

export const HANDLE = "farzanmrz";

export function storiesFor(view: View): FeedStory[] {
  return councilStories.filter((s) => s.arrangement === view);
}

/** Every distinct report across the feed (the Direct view holds each one once). */
export const reports: ItemView[] = storiesFor("direct").map((s) => s.items[0]);

export const counts = {
  clustered: storiesFor("clustered").length,
  direct: storiesFor("direct").length,
  posts: reports.filter((r) => r.kind === "post").length,
  articles: reports.filter((r) => r.kind === "article").length,
  digests: digests.length,
};

/** Preview status values: the same fixture states earlier renders used (2 checking, 1 failed, alerts not yet
 * connected, free week just started). Labelled once on every page with PREVIEW_NOTE. */
export const status = { pending: 2, failed: 1, daysLeft: 7, trialDays: 7, poolUsed: 0, poolLimit: 300 };

export const sites = chosenSites.map((s) => ({ id: s.id, name: s.name, focus: s.focus, why: s.why, kind: s.kind, host: hostOf(s.target) }));
export const accounts = chosenAccounts.map((a) => ({ id: a.id, name: a.name, handle: a.handle, why: a.why }));

export function hostOf(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** The newest report of a story; a story's place in the feed follows its newest report. */
export function newest(story: FeedStory) {
  return story.items.reduce((a, b) => (a.published_at > b.published_at ? a : b));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed UTC formatting so server and client agree; the year shows only outside 2026. */
export function when(iso: string, withTime = true) {
  const d = new Date(iso);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const year = d.getUTCFullYear() === 2026 ? "" : `, ${d.getUTCFullYear()}`;
  if (!withTime || year) return `${day}${year}`;
  return `${day}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Reports per UTC day for the seven days ending on the newest stored report, by publication date. */
export function reportsPerDay(days = 7) {
  const last = reports.reduce((a, r) => (r.published_at > a ? r.published_at : a), "").slice(0, 10);
  const end = new Date(`${last}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => {
    const start = end - (days - 1 - i) * 86_400_000;
    const key = new Date(start).toISOString().slice(0, 10);
    return {
      day: key,
      label: when(`${key}T00:00:00Z`, false),
      count: reports.filter((r) => r.published_at.slice(0, 10) === key).length,
    };
  });
}

export const week = reportsPerDay();
export const weekTotal = week.reduce((n, d) => n + d.count, 0);
export const storiesThisWeek = storiesFor("clustered").filter((s) => newest(s).published_at.slice(0, 10) >= week[0].day).length;

/** The newest story replays its arrival once on load (preview), so the checking row has something to resolve. */
export const ARRIVAL_DELAY_MS = 2600;

export function hrefWith(base: string, params: { view?: View; theme?: string; story?: string | null }) {
  const q = new URLSearchParams();
  if (params.view) q.set("view", params.view);
  if (params.story) q.set("story", params.story);
  if (params.theme === "light" || params.theme === "dark") q.set("theme", params.theme);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
