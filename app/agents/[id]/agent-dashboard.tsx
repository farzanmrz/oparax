"use client";

import {
  ArrowLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  NewspaperIcon,
  PauseIcon,
  PenLineIcon,
  SendIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types — shaped so a later slice can render these straight from the  */
/* database. All data on this page is static placeholder UI for now.   */
/* ------------------------------------------------------------------ */

export type WireItem = {
  readonly id: string;
  readonly headline: string;
  readonly summary: string;
  readonly source: string;
  readonly minutesAgo: number;
  readonly breaking?: boolean;
};

export type Draft = {
  readonly id: string;
  readonly text: string;
  readonly status: "draft" | "posted";
  readonly minutesAgo: number;
};

export type RunTrace = {
  readonly id: string;
  readonly label: string;
  readonly minutesAgo: number;
  readonly steps: readonly string[];
};

export type AgentDetail = {
  readonly id: string;
  readonly name: string;
  readonly beat: string;
  readonly status: "live" | "paused";
  readonly itemsToday: number;
  readonly draftsPending: number;
  readonly postsPublished: number;
  readonly wire: readonly WireItem[];
  readonly drafts: readonly Draft[];
  readonly runs: readonly RunTrace[];
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/**
 * Per-desk dashboard: identity header with status + actions, a stat strip,
 * and three tabs — Wire (aggregated atomic news items), Drafts (compose in
 * the reporter's voice + draft/post history), Activity (past run traces).
 * Static placeholder UI throughout; buttons that would hit the backend are
 * disabled with "coming soon" affordances.
 */
export function AgentDashboard({ agent }: { readonly agent: AgentDetail }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border py-5">
        <Link
          className="mb-3 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="/agents"
        >
          <ArrowLeftIcon className="size-4" />
          Agents
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-xl font-semibold tracking-tight">{agent.name}</h1>
              <Badge
                className={cn(
                  "font-mono text-[10px] tracking-wider uppercase",
                  agent.status === "live" ? "border-live/40 text-live" : "text-muted-foreground",
                )}
                variant="outline"
              >
                {agent.status === "live" ? (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-live" />
                    </span>
                    On the wire
                  </span>
                ) : (
                  "Paused"
                )}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{agent.beat}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ComingSoonButton icon={<PauseIcon />} label="Pause" />
            <ComingSoonButton icon={<SettingsIcon />} label="Configure" />
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <Stat icon={<NewspaperIcon />} label="Items today" value={agent.itemsToday} />
          <Stat icon={<PenLineIcon />} label="Drafts pending" value={agent.draftsPending} />
          <Stat icon={<SendIcon />} label="Posted to X" value={agent.postsPublished} />
        </dl>
      </header>

      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="wire">
        <TabsList className="mt-4 w-full justify-start sm:w-fit">
          <TabsTrigger value="wire">Wire</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent className="min-h-0 flex-1 overflow-y-auto py-4" value="wire">
          <WireFeed items={agent.wire} />
        </TabsContent>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto py-4" value="drafts">
          <DraftsPanel drafts={agent.drafts} />
        </TabsContent>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto py-4" value="activity">
          <ActivityPanel runs={agent.runs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-3.5">
        {icon}
      </span>
      {/* dt precedes dd per the dl spec; order-last keeps the value-then-label visual */}
      <dt className="order-last text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Disabled action with a native tooltip explaining it isn't wired yet. */
function ComingSoonButton({
  icon,
  label,
  variant = "outline",
  tooltip = "Coming soon",
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly variant?: React.ComponentProps<typeof Button>["variant"];
  readonly tooltip?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: focusable wrapper so a disabled trigger's tooltip still reaches keyboard users (Radix pattern) */}
        <span tabIndex={0}>
          <Button
            aria-disabled="true"
            className="pointer-events-none"
            disabled
            size="sm"
            type="button"
            variant={variant}
          >
            {icon}
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Wire tab — aggregated atomic news items                             */
/* ------------------------------------------------------------------ */

function WireFeed({ items }: { readonly items: readonly WireItem[] }) {
  if (items.length === 0) {
    return (
      <TabEmpty
        description="As your agent aggregates atomic news items on this beat, they'll stream in here newest-first."
        title="Nothing on the wire yet"
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li className="flex flex-col gap-1.5 px-4 py-4 sm:px-5" key={item.id}>
          <div className="flex items-center gap-2">
            {item.breaking ? (
              <Badge
                className="border-live/40 font-mono text-[10px] tracking-wider text-live uppercase"
                variant="outline"
              >
                Breaking
              </Badge>
            ) : null}
            <span className="font-mono text-xs text-muted-foreground">{item.source}</span>
            <span aria-hidden="true" className="text-muted-foreground/50">
              ·
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon aria-hidden="true" className="size-3" />
              {item.minutesAgo}m ago
            </span>
          </div>
          <h3 className="font-medium leading-snug text-pretty">{item.headline}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {item.summary}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Drafts tab — compose in the reporter's voice + history              */
/* ------------------------------------------------------------------ */

function DraftsPanel({ drafts }: { readonly drafts: readonly Draft[] }) {
  const [text, setText] = useState("");
  const remaining = 280 - text.length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 px-4">
          <label className="text-sm font-medium" htmlFor="draft-composer">
            Draft in your voice
          </label>
          <Textarea
            className="min-h-24 resize-none"
            id="draft-composer"
            maxLength={280}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ask your agent to draft from the wire, or write it yourself…"
            value={text}
          />
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "font-mono text-xs",
                remaining < 20 ? "text-live" : "text-muted-foreground",
              )}
            >
              {remaining}
            </span>
            <div className="flex items-center gap-2">
              <ComingSoonButton icon={<PenLineIcon />} label="Draft with agent" />
              <ComingSoonButton
                icon={<SendIcon />}
                label="Post to X"
                tooltip="Posting connects once X is linked"
                variant="default"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {drafts.length === 0 ? (
        <TabEmpty
          description="Drafts your agent writes — and posts you publish — will collect here."
          title="No drafts yet"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {drafts.map((draft) => (
            <li className="flex flex-col gap-2 px-4 py-4 sm:px-5" key={draft.id}>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "font-mono text-[10px] tracking-wider uppercase",
                    draft.status === "posted"
                      ? "border-primary/40 text-primary"
                      : "text-muted-foreground",
                  )}
                  variant="outline"
                >
                  {draft.status === "posted" ? "Posted" : "Draft"}
                </Badge>
                <span className="text-xs text-muted-foreground">{draft.minutesAgo}m ago</span>
                {draft.status === "posted" ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    View on X
                    <ExternalLinkIcon aria-hidden="true" className="size-3" />
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed text-pretty">{draft.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity tab — past run traces                                      */
/* ------------------------------------------------------------------ */

function ActivityPanel({ runs }: { readonly runs: readonly RunTrace[] }) {
  if (runs.length === 0) {
    return (
      <TabEmpty
        description="Every aggregation run your agent performs is traced here, step by step."
        title="No runs yet"
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => (
        <Task className="rounded-xl border border-border bg-card px-4 py-3" key={run.id}>
          <TaskTrigger title={`${run.label} — ${run.minutesAgo}m ago`} />
          <TaskContent>
            {run.steps.map((step) => (
              <TaskItem key={step}>{step}</TaskItem>
            ))}
          </TaskContent>
        </Task>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

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
