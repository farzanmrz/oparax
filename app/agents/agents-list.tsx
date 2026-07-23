"use client";

import {
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OparaxMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A news desk (agent) as shown on the listing. Shaped to render straight from
 *  the persisted row — the page passes an array of these. */
export type Agent = {
  readonly id: string;
  readonly name: string;
  readonly beat: string;
  /** ISO timestamp of when the desk was created. */
  readonly createdAt: string;
};

type SortKey = "newest" | "name";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
];

export function AgentsList({
  agents,
  isLoading = false,
  error = null,
  onRetry,
}: {
  readonly agents: readonly Agent[];
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? agents.filter(
          (agent) =>
            agent.name.toLowerCase().includes(needle) || agent.beat.toLowerCase().includes(needle),
        )
      : agents.slice();
    // `filtered` is always a fresh array (filter/slice), so sorting in place
    // never mutates the `agents` prop.
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [agents, query, sort]);

  const hasAgents = agents.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
            {hasAgents && !error ? (
              <span className="font-mono text-xs text-muted-foreground">
                {agents.length} {agents.length === 1 ? "desk" : "desks"}
              </span>
            ) : null}
          </div>
        </div>
        <Button asChild>
          <Link href="/agents/new">
            <PlusIcon />
            New agent
          </Link>
        </Button>
      </header>

      {!error ? (
        <div className="flex shrink-0 flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search agents by name or beat"
              className="pl-8"
              disabled={!hasAgents}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents…"
              type="search"
              value={query}
            />
          </div>
          <Select
            disabled={!hasAgents}
            onValueChange={(value) => setSort(value as SortKey)}
            value={sort}
          >
            <SelectTrigger aria-label="Sort agents" className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : isLoading ? (
          <SkeletonRows />
        ) : !hasAgents ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <NoResults onClear={() => setQuery("")} query={query} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {visible.map((agent) => (
              <AgentRow agent={agent} key={agent.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AgentRow({ agent }: { readonly agent: Agent }) {
  return (
    <li className="flex">
      <Link
        className="group flex w-full items-center gap-4 px-4 py-4 outline-none transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        href={`/agents/${agent.id}`}
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium">{agent.name}</span>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{agent.beat}</p>
        </div>
        <div className="hidden shrink-0 items-center text-xs text-muted-foreground md:flex">
          <span className="flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-3.5" />
            <span suppressHydrationWarning>Created {relativeTime(agent.createdAt)}</span>
          </span>
        </div>
        <ChevronRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <OparaxMark className="size-10 text-primary" />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance">
          Start your first news desk
        </h2>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
          A desk is an agent that watches a beat around the clock — aggregating atomic news items,
          surfacing developing stories, and drafting posts in your voice.
        </p>
      </div>
      <Button asChild className="h-12 px-6 text-base" size="lg">
        <Link href="/agents/new">
          <PlusIcon />
          Create your first agent
        </Link>
      </Button>
    </div>
  );
}

function NoResults({ query, onClear }: { readonly query: string; readonly onClear: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40">
        <SearchXIcon aria-hidden="true" className="size-5 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">No agents match “{query}”</h2>
        <p className="text-sm text-muted-foreground">Try a different name or beat.</p>
      </div>
      <Button onClick={onClear} variant="outline">
        Clear search
      </Button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
        <TriangleAlertIcon aria-hidden="true" className="size-5 text-destructive" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Couldn&apos;t load your agents</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline">
          <RotateCcwIcon />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="flex animate-pulse items-center gap-4 px-5 py-4"
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          key={index}
        >
          <div className="size-2 rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-64 rounded bg-muted" />
          </div>
          <div className="hidden h-3 w-48 rounded bg-muted md:block" />
        </div>
      ))}
    </div>
  );
}

/** Compact relative time ("just now", "5m ago", "3h ago", "2d ago", "1w ago"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}
