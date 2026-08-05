// lib/agent/feed-shared.ts
//
// Client-safe half of the feed types/constants/helpers: no react-tweet/api, no Supabase
// queries, nothing that shouldn't ship to the browser. `feed-query.ts` (the server-only query
// module) imports and re-exports these so existing server callers keep working unchanged;
// client components (`feed-list.tsx`, `feed-filters.tsx`, ...) should import from here directly.
import type { Platform } from "@/lib/agent/desk-config";

export const FEED_PAGE_SIZE = 25;
export const FEED_REFRESH_CHUNK = 100;
export const FEED_REFRESH_MAX_CHUNKS = 5;

export type FeedStatusFilter = "all" | "pending" | "posted";
export type FeedFilterState = {
  status: FeedStatusFilter;
  account: string | null;
  from: string | null;
  to: string | null;
  q: string | null;
};
export type FeedCursor = { createdAt: string; id: string };
export type FeedDraft = {
  draftId: string;
  text: string;
  model: string;
  createdAt: string;
  postedAt: string | null;
  postedUrl: string | null;
  synthesis: string | null;
  translation: string | null;
  judgeNotes: string | null;
  correctedFields: string[];
};
export type FeedSourceView = {
  kind: "x" | "article" | "headline";
  id: string;
  authorHandle: string | null;
  authorName: string | null;
  siteName: string | null;
  title: string | null;
  url: string | null;
  postedAt: string | null;
  text: string;
  lang: string | null;
  gone: boolean;
  avatarUrl: string | null;
  mediaUrls: string[];
  mediaThumbs: { thumbUrl: string; kind: "photo" | "video" }[];
  urlEntities: { url: string; expanded_url: string; display_url: string }[];
};
export type FeedItem = {
  storyId: string;
  createdAt: string;
  headline: string;
  summary: string;
  source: FeedSourceView;
  extraSourceCount: number;
  winners: Partial<Record<Platform, FeedDraft>>;
};
export type FeedPage = { items: FeedItem[]; nextCursor: FeedCursor | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const canonicalIso = (value: string | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value ? value : null;
};
const isParsableIso = (value: string) => !Number.isNaN(new Date(value).getTime());

export function parseFeedFilters(
  sp: Record<string, string | string[] | undefined>,
): FeedFilterState {
  const status = first(sp.status);
  const account = first(sp.account)?.trim() || null;
  const q = first(sp.q)?.trim() || null;
  return {
    status: status === "pending" || status === "posted" ? status : "all",
    account,
    from: canonicalIso(first(sp.from)),
    to: canonicalIso(first(sp.to)),
    q: q && q.length >= 2 ? q : null,
  };
}
export function feedFilterKey(filters: FeedFilterState) {
  return JSON.stringify(filters);
}
export function hasActiveFilters(filters: FeedFilterState) {
  return (
    filters.status !== "all" || Boolean(filters.account || filters.from || filters.to || filters.q)
  );
}
export function isFeedCursor(value: FeedCursor | null | undefined): value is FeedCursor {
  return Boolean(value && isParsableIso(value.createdAt) && UUID.test(value.id));
}
