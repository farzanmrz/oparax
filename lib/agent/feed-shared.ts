// lib/agent/feed-shared.ts
//
// Client-safe half of the feed types/constants/helpers: no react-tweet/api, no Supabase
// queries, nothing that shouldn't ship to the browser. Client components (`feed-list.tsx`, ...)
// import from here directly.
import type { Platform } from "@/lib/agent/desk-config";

export const FEED_PAGE_SIZE = 25;
export const FEED_REFRESH_CHUNK = 100;
export const FEED_REFRESH_MAX_CHUNKS = 5;

export type FeedCursor = { createdAt: string; id: string };
export type FeedDraft = {
  draftId: string;
  draftText: string;
  postedAt: string | null;
  postingClaimedAt: string | null;
  postedUrl: string | null;
  newsSynthesis: string | null;
  versionCount: number;
};
export type FeedSourceView = {
  kind: "x" | "article" | "headline";
  authorHandle: string | null;
  siteName: string | null;
  url: string | null;
  postedAt: string | null;
  gone: boolean;
  fresh: boolean;
};
export type FeedItem = {
  storyId: string;
  createdAt: string;
  newsTitle: string;
  source: FeedSourceView;
  winners: Partial<Record<Platform, FeedDraft>>;
};
export type FeedPage = { items: FeedItem[]; nextCursor: FeedCursor | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canonicalFeedCursor(value: FeedCursor): FeedCursor | null {
  const date = new Date(value.createdAt);
  if (Number.isNaN(date.getTime()) || !UUID.test(value.id)) return null;
  return { createdAt: date.toISOString(), id: value.id };
}

export function isFeedCursor(value: FeedCursor | null | undefined): value is FeedCursor {
  const canonical = value && canonicalFeedCursor(value);
  return Boolean(canonical && canonical.createdAt === value.createdAt);
}
