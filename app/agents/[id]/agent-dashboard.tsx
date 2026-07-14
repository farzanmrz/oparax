"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Agent, AgentContent, AgentHeader } from "@/components/ai-elements/agent";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { AppSidebarBackRow } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScanFrequency } from "@/lib/agent/scan-frequency";
import type { NewsItem, ScanResult } from "@/lib/agent/scan-result";
import { formatHandles, formatScanFrequency, TIER_LABELS } from "@/lib/agents";
import { cn } from "@/lib/utils";
import { draftSelected, pauseAgent, resumeAgent, scanNow } from "./actions";

/* ------------------------------------------------------------------ */
/* Types — the persisted desk this page renders. Shaped by the owned-  */
/* row query in page.tsx (snake_case columns mapped to these fields).  */
/* ------------------------------------------------------------------ */

export type AgentDetail = {
  readonly id: string;
  readonly name: string;
  readonly beat: string;
  readonly handles: readonly string[];
  readonly draftingInstructions: string;
  readonly accountTier: "standard" | "premium";
  /** null when the stored scan frequency failed to parse — renders as fallback text. */
  readonly scanFrequency: ScanFrequency | null;
  /** ISO timestamp of when the desk was created. */
  readonly createdAt: string;
  readonly status: "active" | "paused";
  /** ISO timestamp of the next scheduled fire, or null (paused, or never scheduled). */
  readonly nextRunAt: string | null;
};

export type DeskRun = {
  readonly id: string;
  /** "running" | "done" | "failed" per the DB check constraint — read as a bare
   *  string and defaulted in display so an unrecognized value never throws. */
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly costUsd: number | null;
  /** null when `result` was absent or failed `scanResultSchema` parsing. */
  readonly result: ScanResult | null;
  /** Opaque persisted trace JSON — shape is `{ reasoning, draftedCalls, subtoolCalls,
   *  timings }` but unvalidated, so every read here is defensive. */
  readonly trace: unknown;
};

export type DeskDraft = {
  readonly id: string;
  readonly text: string;
  /** null when the stored item failed `newsItemSchema` parsing. */
  readonly item: NewsItem | null;
  readonly createdAt: string;
};

export type UsageWindow = { readonly runs: number; readonly costUsd: number };
export type UsageRollup = {
  readonly allTime: UsageWindow;
  readonly last30d: UsageWindow;
  readonly last7d: UsageWindow;
};

/* ------------------------------------------------------------------ */
/* Formatting — every timestamp is pinned to an explicit IANA zone (the */
/* desk's own scan-frequency timezone, falling back to UTC) rather than  */
/* the runtime's implicit default, so server render and client hydration */
/* always agree.                                                        */
/* ------------------------------------------------------------------ */

function formatInTz(iso: string, timezone: string | undefined): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone ?? "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(2)}`;
}

/** created_at ISO → "July 11, 2026", pinned to UTC so server and client agree. */
function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ */
/* Trace parsing — `runs.trace` is unvalidated JSON (no shared zod       */
/* schema exists for it), so every field is narrowed defensively rather  */
/* than trusted or cast through `any`.                                  */
/* ------------------------------------------------------------------ */

type DraftedCall = { readonly tool: string; readonly args: Record<string, unknown> };
type SubtoolCall = { readonly name: string | undefined; readonly input: string | undefined };
type Timings = {
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly durationMs: number;
};
type ParsedTrace = {
  readonly reasoningText: string | null;
  readonly draftedCalls: readonly (readonly DraftedCall[])[];
  readonly subtoolCalls: readonly (readonly SubtoolCall[])[];
  readonly timings: Timings | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function traceReasoningText(reasoning: unknown): string | null {
  if (typeof reasoning === "string") return reasoning.trim() || null;
  if (Array.isArray(reasoning)) {
    const text = reasoning
      .map((part) => asRecord(part)?.text)
      .filter((t): t is string => typeof t === "string")
      .join("\n\n");
    return text.trim() || null;
  }
  return null;
}

function asDraftedCalls(value: unknown): DraftedCall[][] {
  if (!Array.isArray(value)) return [];
  return value.map((invocation) => {
    if (!Array.isArray(invocation)) return [];
    return invocation.flatMap((call): DraftedCall[] => {
      const rec = asRecord(call);
      if (!rec || typeof rec.tool !== "string") return [];
      return [{ tool: rec.tool, args: asRecord(rec.args) ?? {} }];
    });
  });
}

function asSubtoolCalls(value: unknown): SubtoolCall[][] {
  if (!Array.isArray(value)) return [];
  return value.map((invocation) => {
    if (!Array.isArray(invocation)) return [];
    return invocation.map((call) => {
      const rec = asRecord(call);
      return {
        name: typeof rec?.name === "string" ? rec.name : undefined,
        input: typeof rec?.input === "string" ? rec.input : undefined,
      };
    });
  });
}

function asTimings(value: unknown): Timings | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const { startedAt, finishedAt, durationMs } = rec;
  if (
    typeof startedAt === "number" &&
    typeof finishedAt === "number" &&
    typeof durationMs === "number"
  ) {
    return { startedAt, finishedAt, durationMs };
  }
  return null;
}

function parseTrace(trace: unknown): ParsedTrace {
  const rec = asRecord(trace);
  return {
    reasoningText: traceReasoningText(rec?.reasoning),
    draftedCalls: asDraftedCalls(rec?.draftedCalls),
    subtoolCalls: asSubtoolCalls(rec?.subtoolCalls),
    timings: asTimings(rec?.timings),
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/**
 * Per-desk dashboard: an identity + schedule header with Pause/Resume/Scan-now
 * controls, a Configuration card that states the saved desk in plain words, and
 * three tabs — Scans, Drafts, Agent runs — each backed by the owned rows page.tsx
 * fetched. Bounded-polls (`router.refresh()` every ~5s) only while the desk is due
 * or a run is in flight, so a scan-now visibly reaches the tabs without a manual
 * reload and polling stops the moment nothing is happening.
 */
export function AgentDashboard({
  agent,
  runs,
  drafts,
  usage,
}: {
  readonly agent: AgentDetail;
  readonly runs: readonly DeskRun[];
  readonly drafts: readonly DeskDraft[];
  readonly usage: UsageRollup;
}) {
  const router = useRouter();
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const timezone = agent.scanFrequency?.timezone;

  useEffect(() => {
    const isDue =
      agent.status === "active" &&
      agent.nextRunAt !== null &&
      new Date(agent.nextRunAt).getTime() <= Date.now();
    const hasRunningRun = runs.some((run) => run.status === "running");
    if (!(isDue || hasRunningRun)) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [agent.status, agent.nextRunAt, runs, router]);

  function handlePause() {
    setScheduleError(null);
    startScheduleTransition(async () => {
      const result = await pauseAgent(agent.id);
      if (!result.ok) setScheduleError(result.error);
    });
  }

  function handleResume() {
    setScheduleError(null);
    startScheduleTransition(async () => {
      const result = await resumeAgent(agent.id);
      if (!result.ok) setScheduleError(result.error);
    });
  }

  function handleScanNow() {
    setScheduleError(null);
    startScheduleTransition(async () => {
      const result = await scanNow(agent.id);
      if (!result.ok) setScheduleError(result.error);
    });
  }

  const nextRunLabel =
    agent.status === "paused" || !agent.nextRunAt ? "—" : formatInTz(agent.nextRunAt, timezone);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border py-5">
        <AppSidebarBackRow title={agent.name} />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>
            {agent.status === "active" ? "Active" : "Paused"}
          </Badge>
          <span className="text-sm text-muted-foreground">Next scan: {nextRunLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            {agent.status === "active" ? (
              <Button
                disabled={isSchedulePending}
                onClick={handlePause}
                size="sm"
                variant="outline"
              >
                Pause
              </Button>
            ) : (
              <Button
                disabled={isSchedulePending}
                onClick={handleResume}
                size="sm"
                variant="outline"
              >
                Resume
              </Button>
            )}
            <Button
              disabled={isSchedulePending || agent.status === "paused"}
              onClick={handleScanNow}
              size="sm"
            >
              Scan now
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Scan now runs a scan immediately — the run appears under Agent runs and its results on
          Scans when it finishes.
        </p>
        {scheduleError ? (
          <p className="text-sm text-destructive" role="alert">
            {scheduleError}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4">
              <ConfigRow label="Beat">{agent.beat}</ConfigRow>
              <ConfigRow label="Watching">{formatHandles(agent.handles)}</ConfigRow>
              <ConfigRow label="Scan frequency">
                {agent.scanFrequency ? formatScanFrequency(agent.scanFrequency) : "Custom schedule"}
              </ConfigRow>
              <ConfigRow label="Account tier">{TIER_LABELS[agent.accountTier]}</ConfigRow>
              <ConfigRow label="Drafting instructions">
                <span className="whitespace-pre-wrap">{agent.draftingInstructions}</span>
              </ConfigRow>
              <ConfigRow label="Created">{formatCreated(agent.createdAt)}</ConfigRow>
            </dl>
          </CardContent>
        </Card>

        <Tabs className="mt-6 gap-0" defaultValue="scans">
          <TabsList className="w-full justify-start sm:w-fit">
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="runs">Agent runs</TabsTrigger>
          </TabsList>

          <TabsContent className="py-4" value="scans">
            <ScansTab agentId={agent.id} runs={runs} timezone={timezone} />
          </TabsContent>
          <TabsContent className="py-4" value="drafts">
            <DraftsTab drafts={drafts} timezone={timezone} />
          </TabsContent>
          <TabsContent className="py-4" value="runs">
            <RunsTab runs={runs} timezone={timezone} usage={usage} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground sm:w-40">{label}</dt>
      <dd className="text-sm leading-relaxed text-pretty">{children}</dd>
    </div>
  );
}

function TabEmpty({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
    </div>
  );
}

/** A news item's headline + body + one line of bare `@handle` source links — the same
 *  presentation grammar the chat uses when it presents a scan (scan-protocol.md):
 *  bold headline, body, source links joined by `·`, no parenthetical annotations. */
function NewsItemBody({ item }: { readonly item: NewsItem }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold">{item.headline}</p>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.body}</p>
      {item.sources.length > 0 ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.sources.map((source, i) => (
            <span className="flex items-center gap-1.5" key={source.url}>
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <a
                className="hover:text-foreground hover:underline"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                @{source.handle}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scans tab                                                           */
/* ------------------------------------------------------------------ */

type FlatScanItem = {
  readonly key: string;
  readonly item: NewsItem;
  readonly runStartedAt: string;
};

function ScansTab({
  agentId,
  runs,
  timezone,
}: {
  readonly agentId: string;
  readonly runs: readonly DeskRun[];
  readonly timezone: string | undefined;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // `runs` is already newest-first from the query, so flatMap preserves that order.
  const flattened = useMemo<FlatScanItem[]>(
    () =>
      runs
        .filter((run) => run.status === "done" && run.result)
        .flatMap((run) =>
          // Key by run id + item index — headlines are model output with no uniqueness
          // guarantee, so two items in one run sharing a headline would collide (one
          // checkbox toggling both, a duplicate in the draft payload, a React dup-key warning).
          (run.result?.items ?? []).map((item, idx) => ({
            key: `${run.id}:${idx}`,
            item,
            runStartedAt: run.startedAt,
          })),
        ),
    [runs],
  );

  if (flattened.length === 0) {
    return (
      <TabEmpty
        description="As your agent aggregates atomic news items on this beat, they'll stream in here newest-first."
        title="Nothing on the wire yet"
      />
    );
  }

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleDraftSelected() {
    const items = flattened.filter((entry) => selected.has(entry.key)).map((entry) => entry.item);
    setDraftError(null);
    startTransition(async () => {
      const result = await draftSelected(agentId, items);
      if (!result.ok) setDraftError(result.error);
      else setSelected(new Set());
    });
  }

  const selectedCount = selected.size;
  const canDraft = selectedCount > 0 && selectedCount <= 10 && !isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedCount > 0 ? `${selectedCount} selected` : "Select up to 10 items to draft."}
        </p>
        <Button disabled={!canDraft} onClick={handleDraftSelected} size="sm">
          {isPending ? "Drafting…" : "Draft selected"}
        </Button>
      </div>
      {draftError ? (
        <p className="text-sm text-destructive" role="alert">
          {draftError}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {flattened.map(({ key, item, runStartedAt }) => (
          <div className="flex gap-3 rounded-xl border border-border p-4" key={key}>
            <Checkbox
              aria-label={`Select ${item.headline}`}
              checked={selected.has(key)}
              className="mt-1"
              onCheckedChange={(checked) => toggle(key, checked === true)}
            />
            <div className="flex flex-1 flex-col gap-2">
              <NewsItemBody item={item} />
              <p className="text-xs text-muted-foreground">{formatInTz(runStartedAt, timezone)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drafts tab                                                          */
/* ------------------------------------------------------------------ */

function DraftsTab({
  drafts,
  timezone,
}: {
  readonly drafts: readonly DeskDraft[];
  readonly timezone: string | undefined;
}) {
  if (drafts.length === 0) {
    return (
      <TabEmpty
        description="Drafts your agent writes — and posts you publish — will collect here."
        title="No drafts yet"
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4" key={draft.id}>
          <p className="text-sm whitespace-pre-wrap">{draft.text}</p>
          <p className="text-xs text-muted-foreground">
            {draft.item ? draft.item.headline : "Source item unavailable"} ·{" "}
            {formatInTz(draft.createdAt, timezone)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent runs tab                                                      */
/* ------------------------------------------------------------------ */

function UsageStat({ label, window }: { readonly label: string; readonly window: UsageWindow }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {window.runs} {window.runs === 1 ? "run" : "runs"} · {formatCost(window.costUsd)}
      </span>
    </div>
  );
}

function UsageSummary({ usage }: { readonly usage: UsageRollup }) {
  return (
    <div className="flex flex-wrap gap-6 rounded-xl border border-border p-4">
      <UsageStat label="Last 7 days" window={usage.last7d} />
      <UsageStat label="Last 30 days" window={usage.last30d} />
      <UsageStat label="All time" window={usage.allTime} />
    </div>
  );
}

const RUN_STATUS_LABEL: Record<string, string> = {
  done: "Done",
  running: "Running",
  failed: "Failed",
};
const RUN_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  done: "secondary",
  running: "outline",
  failed: "destructive",
};

/** The trace card's body — model reasoning, the drafted × executed searches (zipped by
 *  invocation index, since neither array carries its own id), and the run's clustered
 *  items. Every section is conditionally rendered — a null/partial trace just shows
 *  fewer sections, never a crash. */
function TraceCard({ run }: { readonly run: DeskRun }) {
  const trace = parseTrace(run.trace);
  const items = run.result?.items ?? [];
  const invocationCount = Math.max(trace.draftedCalls.length, trace.subtoolCalls.length);
  const hasContent = trace.reasoningText !== null || invocationCount > 0 || items.length > 0;

  return (
    <Agent className="border-none">
      <AgentHeader name="Scan runner" />
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {/* Brand the run as Oparax's own — never surface the underlying models/vendors to the
            reporter (the whole desk should read as Oparax magic, not a model pipeline). */}
        <Badge className="font-mono text-xs" variant="secondary">
          Oparax
        </Badge>
      </div>
      <AgentContent>
        {hasContent ? (
          <>
            {trace.reasoningText !== null ? (
              <Reasoning defaultOpen={false}>
                <ReasoningTrigger />
                <ReasoningContent>{trace.reasoningText}</ReasoningContent>
              </Reasoning>
            ) : null}

            {invocationCount > 0 ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Searches
                </h4>
                {Array.from({ length: invocationCount }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional trace render — each "Search N" is identified by its index into the parallel draftedCalls/subtoolCalls arrays; the list is a static, read-only replay of a persisted trace and never reorders or mutates.
                  <Tool key={i}>
                    <ToolHeader
                      state="output-available"
                      title={`Search ${i + 1}`}
                      toolName="Oparax Search"
                      type="dynamic-tool"
                    />
                    <ToolContent>
                      <ToolInput input={trace.draftedCalls[i] ?? []} />
                      <ToolOutput errorText={undefined} output={trace.subtoolCalls[i] ?? []} />
                    </ToolContent>
                  </Tool>
                ))}
              </div>
            ) : null}

            {items.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Items
                </h4>
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div className="rounded-md border border-border p-3" key={item.headline}>
                      <NewsItemBody item={item} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {trace.timings ? (
              <p className="text-xs text-muted-foreground">
                Completed in {(trace.timings.durationMs / 1000).toFixed(1)}s
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No trace recorded for this run.</p>
        )}
      </AgentContent>
    </Agent>
  );
}

function RunRow({
  run,
  timezone,
}: {
  readonly run: DeskRun;
  readonly timezone: string | undefined;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className="rounded-xl border border-border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "outline"}>
              {RUN_STATUS_LABEL[run.status] ?? run.status}
            </Badge>
            <span className="text-muted-foreground">
              {formatInTz(run.startedAt, timezone)}
              {run.finishedAt ? ` – ${formatInTz(run.finishedAt, timezone)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{run.costUsd != null ? formatCost(run.costUsd) : "—"}</span>
            <ChevronDownIcon
              className={cn("size-4 transition-transform", open ? "rotate-180" : "")}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border p-4">
          <TraceCard run={run} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RunsTab({
  runs,
  timezone,
  usage,
}: {
  readonly runs: readonly DeskRun[];
  readonly timezone: string | undefined;
  readonly usage: UsageRollup;
}) {
  if (runs.length === 0) {
    return (
      <TabEmpty
        description="Every aggregation run your agent performs is traced here, step by step."
        title="No runs yet"
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <UsageSummary usage={usage} />
      <div className="flex flex-col gap-3">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} timezone={timezone} />
        ))}
      </div>
    </div>
  );
}
