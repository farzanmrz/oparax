"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  FEED_PAGE_SIZE,
  FEED_REFRESH_CHUNK,
  FEED_REFRESH_MAX_CHUNKS,
  type FeedCursor,
  type FeedFilterState,
  type FeedItem,
  hasActiveFilters,
} from "@/lib/agent/feed-shared";
import { fetchOwnedFeedPage } from "./feed-actions";
import { FeedItemCard } from "./feed-item";

type State = { items: FeedItem[]; nextCursor: FeedCursor | null };
const paramsFor = (filters: FeedFilterState) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([key, value]) => value !== null && !(key === "status" && value === "all"),
    ),
  ) as Record<string, string>;
const older = (item: FeedItem, cursor: FeedCursor) =>
  item.createdAt < cursor.createdAt ||
  (item.createdAt === cursor.createdAt && item.storyId < cursor.id);

export function FeedList({
  agentId,
  filters,
  initialItems,
  initialCursor,
  fetchedAt,
  charLimit,
  xLinked,
}: {
  agentId: string;
  filters: FeedFilterState;
  initialItems: FeedItem[];
  initialCursor: FeedCursor | null;
  fetchedAt: number;
  charLimit: number;
  xLinked: boolean;
}) {
  const [state, setState] = useState<State>({ items: initialItems, nextCursor: initialCursor });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const loadMore = async () => {
    if (loading || !state.nextCursor) return;
    const mine = epoch.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOwnedFeedPage(
        agentId,
        paramsFor(filters),
        state.nextCursor,
        FEED_PAGE_SIZE,
      );
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
      { rootMargin: "600px 0px" },
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
    const mine = epoch.current;
    const reconcile = async () => {
      const target = state.items.length;
      if (target <= initialItems.length) {
        epoch.current++;
        setState({ items: initialItems, nextCursor: initialCursor });
        return;
      }
      let cursor: FeedCursor | null = null;
      const fetched: FeedItem[] = [];
      for (let i = 0; i < FEED_REFRESH_MAX_CHUNKS && fetched.length < target; i++) {
        const result = await fetchOwnedFeedPage(
          agentId,
          paramsFor(filters),
          cursor,
          FEED_REFRESH_CHUNK,
        );
        if (mine !== epoch.current || !result.ok) return;
        fetched.push(...result.page.items);
        cursor = result.page.nextCursor;
        if (!cursor) break;
      }
      if (mine !== epoch.current) return;
      epoch.current++;
      const fetchedIds = new Set(fetched.map((item) => item.storyId));
      setState((previous) => ({
        items: [
          ...fetched,
          ...previous.items.filter(
            (item) => cursor && older(item, cursor) && !fetchedIds.has(item.storyId),
          ),
        ],
        nextCursor:
          cursor && previous.items.some((item) => older(item, cursor))
            ? previous.nextCursor
            : cursor,
      }));
    };
    void reconcile();
  }, [fetchedAt]);
  if (!state.items.length && !state.nextCursor)
    return (
      <div className="flex flex-col items-start gap-2 py-10 text-sm text-muted-foreground">
        {hasActiveFilters(filters) ? (
          <>
            <p>Nothing matches these filters.</p>
            <Button
              className="min-h-11"
              onClick={() => router.replace(pathname, { scroll: false })}
              variant="ghost"
            >
              Clear filters
            </Button>
          </>
        ) : (
          <p>No stories to show.</p>
        )}
      </div>
    );
  return (
    <div className="flex flex-col gap-4 [700px]:gap-6">
      {state.items.map((item) => (
        <FeedItemCard charLimit={charLimit} item={item} key={item.storyId} xLinked={xLinked} />
      ))}
      <div ref={sentinel} />
      {loading ? (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
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
