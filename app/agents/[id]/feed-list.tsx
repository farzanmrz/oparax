"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canonicalFeedCursor,
  FEED_PAGE_SIZE,
  FEED_REFRESH_CHUNK,
  FEED_REFRESH_MAX_CHUNKS,
  type FeedCursor,
  type FeedItem,
} from "@/lib/agent/feed-shared";
import { fetchOwnedFeedPage } from "./feed-actions";
import { FeedCardSkeleton, FeedItemCard } from "./feed-item";

type State = { items: FeedItem[]; nextCursor: FeedCursor | null };
const older = (item: FeedItem, cursor: FeedCursor) =>
  item.createdAt < cursor.createdAt ||
  (item.createdAt === cursor.createdAt && item.storyId < cursor.id);

export function FeedList({
  agentId,
  initialItems,
  initialCursor,
  fetchedAt,
}: {
  agentId: string;
  initialItems: FeedItem[];
  initialCursor: FeedCursor | null;
  fetchedAt: number;
}) {
  const [state, setState] = useState<State>({ items: initialItems, nextCursor: initialCursor });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = async () => {
    if (loading || !state.nextCursor) return;
    const mine = ++epoch.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOwnedFeedPage(agentId, state.nextCursor, FEED_PAGE_SIZE);
      if (mine !== epoch.current) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((previous) => ({
        items: [
          ...previous.items,
          ...result.page.items.filter(
            (item) =>
              !new Set(previous.items.map((existing) => existing.storyId)).has(item.storyId),
          ),
        ],
        nextCursor: result.page.nextCursor,
      }));
    } catch {
      if (mine === epoch.current) setError("Couldn't load more");
    } finally {
      setLoading(false);
    }
  };
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "500px 0px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the reconcile fires exactly once per server refresh (fetchedAt); everything else is read live and must not retrigger it.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const mine = ++epoch.current;
    setError(null);
    const reconcile = async () => {
      try {
        const target = state.items.length;
        if (target <= initialItems.length) {
          setState({ items: initialItems, nextCursor: initialCursor });
          return;
        }
        let cursor: FeedCursor | null = null;
        const fetched: FeedItem[] = [];
        for (let i = 0; i < FEED_REFRESH_MAX_CHUNKS && fetched.length < target; i++) {
          const result = await fetchOwnedFeedPage(agentId, cursor, FEED_REFRESH_CHUNK);
          if (mine !== epoch.current) return;
          if (!result.ok) {
            setError(result.error);
            return;
          }
          fetched.push(...result.page.items);
          cursor = result.page.nextCursor;
          if (!cursor) break;
        }
        if (mine !== epoch.current) return;
        const fetchedIds = new Set(fetched.map((item) => item.storyId));
        setState((previous) => {
          const items = [
            ...fetched,
            ...previous.items.filter(
              (item) => cursor && older(item, cursor) && !fetchedIds.has(item.storyId),
            ),
          ].slice(0, target);
          const last = items.at(-1);
          return {
            items,
            nextCursor:
              cursor && last
                ? canonicalFeedCursor({ createdAt: last.createdAt, id: last.storyId })
                : null,
          };
        });
      } catch {
        if (mine === epoch.current) setError("Couldn't load more");
      }
    };
    void reconcile();
  }, [fetchedAt]);
  if (!state.items.length && !state.nextCursor)
    return (
      <div className="flex flex-col items-start gap-2 py-10 text-sm text-muted-foreground">
        <p>No stories to show.</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)]">
      {state.items.map((item) => (
        <FeedItemCard item={item} key={item.storyId} />
      ))}
      <div ref={sentinel} />
      {loading ? (
        <>
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">{error || "Couldn't load more"}</span>
          <Button className="min-h-11" onClick={() => void loadMore()} variant="ghost">
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
