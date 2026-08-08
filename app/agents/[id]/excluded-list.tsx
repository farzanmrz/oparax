"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExcludedPage, ExcludedPost } from "@/lib/agent/excluded-query";
import type { ExcludedCursor } from "@/lib/agent/excluded-shared";
import { fetchOwnedExcludedPage } from "./excluded-actions";
import { ExcludedItemCard } from "./excluded-item";

export function ExcludedList({
  agentId,
  initialItems,
  initialCursor,
}: {
  agentId: string;
  initialItems: ExcludedPost[];
  initialCursor: ExcludedCursor | null;
}) {
  const [state, setState] = useState<ExcludedPage>({
    items: initialItems,
    nextCursor: initialCursor,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = async () => {
    if (loading || !state.nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOwnedExcludedPage(agentId, state.nextCursor);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((previous) => ({
        items: [
          ...previous.items,
          ...result.page.items.filter(
            (item) => !new Set(previous.items.map((existing) => existing.id)).has(item.id),
          ),
        ],
        nextCursor: result.page.nextCursor,
      }));
    } catch {
      setError("Couldn't load more");
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

  return (
    <div className="flex flex-col gap-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)]">
      {state.items.map((item) => (
        <ExcludedItemCard item={item} key={item.id} />
      ))}
      <div ref={sentinel} />
      {loading ? <div className="h-24 animate-pulse rounded-lg bg-white/6" /> : null}
      {error ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">{error}</span>
          <Button className="min-h-11" onClick={() => void loadMore()} variant="ghost">
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
