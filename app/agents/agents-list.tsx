"use client";

import {
  ClockIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OparaxMark } from "@/components/logo";
import { cn } from "@/lib/utils";

export type AgentStatus = "live" | "paused" | "idle";

/** A news desk (agent) as shown on the listing. Shaped to render straight from
 *  persisted data once wiring lands — the page passes an array of these. */
export type Agent = {
  readonly id: string;
  readonly name: string;
  readonly beat: string;
  readonly status: AgentStatus;
  /** ISO timestamp of the desk's last activity. */
  readonly lastActiveAt: string;
};

type SortKey = "recent" | "name-asc" | "name-desc";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Recently active" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

const STATUS_META: Record<AgentStatus, { label: string; dot: string; live?: boolean }> = {
  live: { label: "Live", dot: "bg-live", live: true },
  paused: { label: "Paused", dot: "bg-muted-foreground" },
  idle: { label: "Idle", dot: "bg-muted-foreground/50" },
};

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
  const [sort, setSort] = useState<SortKey>("recent");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? agents.filter(
          (agent) =>
            agent.name.toLowerCase().includes(needle) ||
            agent.beat.toLowerCase().includes(needle),
        )
      : agents.slice();
    return [...filtered].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
  }, [agents, query, sort]);

  const hasAgents = agents.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-4 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Your desks</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Each desk watches a beat. Jump into one or spin up another.
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/agents/new">
            <PlusIcon />
            New agent
          </Link>
        </Button>
      </header>

      {hasAgents && !error ? (
        <div className="flex shrink-0 flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search desks by name or beat"
              className="pl-8"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search desks…"
              type="search"
              value={query}
            />
          </div>
          <Select onValueChange={(value) => setSort(value as SortKey)} value={sort}>
            <SelectTrigger aria-label="Sort desks" className="w-full sm:w-[180px]">
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
          <span className="text-sm text-muted-foreground sm:ml-auto">
            {visible.length} {visible.length === 1 ? "desk" : "desks"}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : isLoading ? (
          <SkeletonGrid />
        ) : !hasAgents ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <NoResults onClear={() => setQuery("")} query={query} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((agent) => (
              <AgentCard agent={agent} key={agent.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { readonly agent: Agent }) {
  return (
    <Link
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      href={`/agents/${agent.id}`}
    >
      <Card className="h-full gap-3 py-5 transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
        <CardHeader>
          <CardAction>
            <StatusBadge status={agent.status} />
          </CardAction>
          <CardTitle className="truncate pr-2 text-base">{agent.name}</CardTitle>
          <CardDescription className="line-clamp-1">{agent.beat}</CardDescription>
        </CardHeader>
        <CardFooter className="mt-1 items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon aria-hidden="true" className="size-3.5" />
          <span suppressHydrationWarning>Active {relativeTime(agent.lastActiveAt)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { readonly status: AgentStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className="gap-1.5 font-medium" variant="outline">
      <span aria-hidden="true" className="relative flex size-1.5">
        {meta.live ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
        ) : null}
        <span className={cn("relative inline-flex size-1.5 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <OparaxMark className="size-8 text-primary" />
      </span>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-balance">
          Start your first news desk
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">
          A desk is an agent that watches a beat around the clock — scanning the wire, surfacing
          developing stories, and drafting posts in your voice. Tell it what to cover and it gets
          to work.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/agents/new">
          <PlusIcon />
          Create your first desk
        </Link>
      </Button>
    </div>
  );
}

function NoResults({
  query,
  onClear,
}: {
  readonly query: string;
  readonly onClear: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40">
        <SearchXIcon aria-hidden="true" className="size-5 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">No desks match “{query}”</h2>
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
        <h2 className="text-base font-semibold tracking-tight">Couldn&apos;t load your desks</h2>
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

function SkeletonGrid() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="h-32 rounded-xl border border-border bg-card p-5"
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          key={index}
        >
          <div className="flex animate-pulse flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-14 rounded-full bg-muted" />
            </div>
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="mt-4 h-3 w-20 rounded bg-muted" />
          </div>
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
