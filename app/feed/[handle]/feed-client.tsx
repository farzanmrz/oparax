"use client";

// The public feed's client shell: search over the loaded stories, the source rail that IS the
// filter, the All/Alerts toggle, day dividers with counts, story cards, and infinite scroll.
// This is a monitoring-first list, not the app's feed card, same tokens, new structure.

import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicFeedData, PublicFeedStory } from "@/lib/feed/public-query";
import { initPostHog } from "@/lib/observability/posthog-client";
import { cn } from "@/lib/utils";
import { fetchMoreStories } from "./actions";
import { RelativeTime } from "./relative-time";

const CARD_CLASS =
  "rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] shadow-[var(--card-shadow)]";

type DayGroup = { key: string; label: string; stories: PublicFeedStory[] };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Mon 25 Aug", en-GB puts the day before the month with no comma clutter. */
function dayName(date: Date, timeZone?: string): string {
  return date.toLocaleDateString("en-GB", {
    ...(timeZone ? { timeZone } : {}),
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Group the visible stories by calendar day. Pre-mount the grouping is UTC-pinned so server
 *  HTML and the first client paint agree; after mount it regroups in the viewer's local time
 *  with Today/Yesterday labels, the same dance RelativeTime does. */
function dayGroups(stories: PublicFeedStory[], mode: "utc" | "local"): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  const now = new Date();
  const todayKey = localDayKey(now);
  const yesterdayKey = localDayKey(new Date(now.getTime() - 86_400_000));

  for (const story of stories) {
    const date = new Date(story.landedAt);
    let key: string;
    let label: string;
    if (mode === "utc") {
      key = story.landedAt.slice(0, 10);
      label = dayName(date, "UTC");
    } else {
      key = localDayKey(date);
      label = key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : dayName(date);
    }
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, stories: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.stories.push(story);
  }
  return groups;
}

export function FeedClient({ initial }: { initial: PublicFeedData }) {
  const handle = initial.agent.publicHandle;

  const [stories, setStories] = useState<PublicFeedStory[]>(initial.stories);
  const [nextBefore, setNextBefore] = useState<string | null>(initial.nextBefore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);

  const [query, setQuery] = useState("");
  const [soloSource, setSoloSource] = useState<string | null>(null);
  const [alertsOnly, setAlertsOnly] = useState(false);

  // This public page has no app shell, so PostHog initializes here (anonymous, never identify).
  useEffect(() => {
    initPostHog();
  }, []);

  const [dayMode, setDayMode] = useState<"utc" | "local">("utc");
  useEffect(() => {
    setDayMode("local");
  }, []);

  const searchTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    },
    [],
  );

  function onSearchChange(value: string) {
    setQuery(value);
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      // Only the LENGTH ever leaves the page, never the query text.
      posthog.capture("feed_searched", { query_length: value.trim().length });
    }, 400);
  }

  function onSourcePress(label: string) {
    posthog.capture("feed_filtered", { kind: "source", value: label });
    setSoloSource((prev) => (prev === label ? null : label));
  }

  function onAlertsToggle(next: boolean) {
    if (next === alertsOnly) return;
    posthog.capture("feed_filtered", { kind: "alerts", value: next ? "alerts" : "all" });
    setAlertsOnly(next);
  }

  const visibleStories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => {
      if (alertsOnly && !story.alerted) return false;
      if (soloSource && !story.sources.some((source) => source.label === soloSource)) return false;
      if (q && !`${story.title} ${story.points.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stories, query, soloSource, alertsOnly]);

  const groups = useMemo(() => dayGroups(visibleStories, dayMode), [visibleStories, dayMode]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !nextBefore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchMoreStories(handle, nextBefore);
      if ("error" in result) {
        setLoadError(true);
        return;
      }
      setStories((prev) => {
        const seen = new Set(prev.map((story) => story.storyId));
        return [...prev, ...result.stories.filter((story) => !seen.has(story.storyId))];
      });
      setNextBefore(result.nextBefore);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [handle, nextBefore]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextBefore || loadError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextBefore, loadError, loadMore]);

  return (
    <div className="flex flex-col gap-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search stories"
            aria-label="Search stories"
            className="min-h-11 max-w-[360px] flex-1 desk:min-h-8"
          />
          <fieldset
            aria-label="Show all stories or alerts only"
            className="inline-flex rounded-md border border-[var(--band-border)] bg-[var(--band-bg)] p-0.5"
          >
            <button
              type="button"
              aria-pressed={!alertsOnly}
              onClick={() => onAlertsToggle(false)}
              className={cn(
                "min-h-11 rounded-[5px] px-3 text-[13.5px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 desk:min-h-7",
                !alertsOnly
                  ? "bg-[var(--accent)]/15 text-text-title"
                  : "text-text-muted hover:text-text-body",
              )}
            >
              All
            </button>
            <button
              type="button"
              aria-pressed={alertsOnly}
              onClick={() => onAlertsToggle(true)}
              className={cn(
                "min-h-11 rounded-[5px] px-3 text-[13.5px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 desk:min-h-7",
                alertsOnly
                  ? "bg-[var(--accent)]/15 text-text-title"
                  : "text-text-muted hover:text-text-body",
              )}
            >
              Alerts
            </button>
          </fieldset>
        </div>

        {initial.sourceCounts.length > 0 && (
          <fieldset className="flex flex-wrap gap-2" aria-label="Filter by source">
            {initial.sourceCounts.map(({ label, count }) => {
              const active = soloSource === label;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSourcePress(label)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 text-[13.5px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 desk:min-h-7",
                    active
                      ? "border-[var(--accent)]/60 bg-[var(--accent)]/12 text-text-title"
                      : "border-[var(--band-border)] bg-[var(--band-bg)] text-text-body hover:text-text-title",
                  )}
                >
                  <span>{label}</span>
                  <span className="font-mono text-[11.5px] text-text-count">{count}</span>
                </button>
              );
            })}
          </fieldset>
        )}
      </div>

      {visibleStories.length === 0 && !loadingMore && (
        <p className="py-6 text-[14.5px] text-text-muted">
          {stories.length === 0
            ? "Nothing has landed on this desk in the last two days."
            : "No stories match the current filters."}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 pt-1">
            <h2 className="shrink-0 text-[13px] font-medium text-text-label">
              {group.label} · {group.stories.length}{" "}
              {group.stories.length === 1 ? "story" : "stories"}
            </h2>
            <div className="h-px flex-1 bg-[var(--band-border)]" aria-hidden />
          </div>
          {group.stories.map((story) => (
            <StoryCard key={story.storyId} story={story} />
          ))}
        </section>
      ))}

      {loadingMore && (
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-3 py-2">
          <p className="text-[13.5px] text-text-muted">Couldn&apos;t load older stories.</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              void loadMore();
            }}
            className="min-h-11 rounded-md px-2 text-[13.5px] text-[var(--accent)] underline-offset-4 hover:underline desk:min-h-0"
          >
            Try again
          </button>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}

function StoryCard({ story }: { story: PublicFeedStory }) {
  return (
    <article className={CARD_CLASS}>
      <div className="flex flex-col gap-2 px-4 py-4 desk:px-6 desk:py-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17.5px] leading-[1.3] font-semibold tracking-[-0.017em] text-text-title desk:text-[20px]">
            {story.title}
          </h3>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {story.alerted && (
              <span className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                alerted
              </span>
            )}
            <span className="font-mono text-[13px] whitespace-nowrap text-text-muted">
              <RelativeTime iso={story.landedAt} />
            </span>
          </div>
        </div>
        {story.points.length > 0 && (
          <ul className="flex flex-col gap-1">
            {story.points.map((point) => (
              <li
                key={point}
                className="flex gap-2 text-[13.5px] leading-[1.6] text-text-body desk:text-[14.5px]"
              >
                <span
                  className="mt-[9px] size-1 shrink-0 rounded-full bg-[var(--text-muted)]"
                  aria-hidden
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {story.sources.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--band-border)] bg-[var(--band-bg)] px-4 py-2.5 desk:px-6">
          {story.sources.map((source) => (
            <span
              key={`${source.label}|${source.postedAt ?? ""}|${source.url ?? ""}`}
              className="inline-flex min-h-6 items-center gap-1.5 text-[14.5px] desk:text-[13.5px]"
            >
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "underline-offset-4 hover:text-[var(--accent)] hover:underline",
                    source.kind === "x" ? "text-text-handle-x" : "text-text-handle-news",
                  )}
                >
                  {source.label}
                </a>
              ) : (
                <span
                  className={source.kind === "x" ? "text-text-handle-x" : "text-text-handle-news"}
                >
                  {source.label}
                </span>
              )}
              {source.postedAt && (
                <span className="font-mono text-[14px] text-text-muted desk:text-[13px]">
                  <RelativeTime iso={source.postedAt} />
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
