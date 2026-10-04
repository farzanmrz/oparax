import type { FeedStory, ItemView } from "@/next/data/feed";
import { accounts, digests, hostOf, PREVIEW_NOTE, sites, storiesFor, type View } from "@/next/council/data";

// Data side of the opus-feed3 directions, safe to import on the server: the configured sources in the owner's
// four named groups (X accounts, RSS feeds, websites, GitHub), the URL state (view, source filter, empty
// preview, theme) and the stories that state shows. Everything comes from next/data.

export const NOTE = `${PREVIEW_NOTE} The newest story replays its arrival once.`;

export type SourceKind = "rss" | "website" | "x" | "github";
export type Source = { id: string; kind: SourceKind; name: string; sub: string; focus: string; why: string | null; host?: string; handle?: string };

export const gh = digests[0];

/** The configured sources, grouped as the owner names them: X accounts, RSS feeds, websites, GitHub. */
export const groups: { kind: SourceKind; label: string; items: Source[] }[] = [
  {
    kind: "rss",
    label: "RSS feeds",
    items: sites.filter((s) => s.kind === "rss").map((s) => ({ id: s.id, kind: "rss", name: s.name, sub: s.host, focus: s.focus, why: s.why, host: s.host })),
  },
  {
    kind: "website",
    label: "Websites",
    items: sites.filter((s) => s.kind === "website").map((s) => ({ id: s.id, kind: "website", name: s.name, sub: s.host, focus: s.focus, why: s.why, host: s.host })),
  },
  {
    kind: "x",
    label: "X accounts",
    items: accounts.map((a) => ({ id: a.id, kind: "x", name: a.name, sub: a.handle, focus: "", why: a.why, handle: a.handle })),
  },
  {
    kind: "github",
    label: "GitHub",
    items: [{ id: "gh-vercel-next", kind: "github", name: "vercel/next.js", sub: "github.com", focus: gh.description, why: null }],
  },
];

export const allSources = groups.flatMap((g) => g.items);
export const sourceCount = allSources.length;
export const kindLabel: Record<SourceKind, string> = { rss: "RSS feed", website: "Website", x: "X account", github: "GitHub" };

/** Which configured source an item came from, if any (X posts match by handle, articles by source id). */
export function sourceOf(item: ItemView): Source | undefined {
  if (item.kind === "post") return allSources.find((s) => s.handle && s.handle === item.author?.toLowerCase());
  return allSources.find((s) => s.id === item.source_id);
}

/** How an item is named under the picture: "RSS feed, huggingface.co", "X post, @nextjs". */
export function itemKind(item: ItemView) {
  if (item.kind === "post") return `X post, ${item.author}`;
  const src = sourceOf(item);
  return `${src ? kindLabel[src.kind] : "Article"}, ${hostOf(item.url)}`;
}

export type FeedState = { view: View; source: string | null; empty: boolean; theme?: string };

export function readState(sp: Record<string, string | string[] | undefined>): FeedState {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? null;
  const source = one("source");
  return {
    view: one("view") === "direct" ? "direct" : "clustered",
    source: source && allSources.some((s) => s.id === source) ? source : null,
    empty: one("empty") === "1",
    theme: one("theme") ?? undefined,
  };
}

export function href(base: string, s: FeedState, change: Partial<FeedState>) {
  const n = { ...s, ...change };
  const q = new URLSearchParams();
  if (n.view === "direct") q.set("view", "direct");
  if (n.source) q.set("source", n.source);
  if (n.empty) q.set("empty", "1");
  if (n.theme === "light" || n.theme === "dark") q.set("theme", n.theme);
  const str = q.toString();
  return str ? `${base}?${str}` : base;
}

export function storiesForState(s: FeedState): FeedStory[] {
  if (s.empty) return [];
  const list = storiesFor(s.view);
  if (!s.source) return list;
  return list.filter((st) => st.items.some((i) => sourceOf(i)?.id === s.source));
}

