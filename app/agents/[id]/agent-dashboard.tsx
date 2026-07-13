"use client";

import { AppSidebarBackRow } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Schedule } from "@/eve/agent/lib/cadence";
import { formatCadence, formatHandles, TIER_LABELS } from "@/lib/agents";

/* ------------------------------------------------------------------ */
/* Types — the persisted desk this page renders. Shaped by the owned-  */
/* row query in page.tsx (snake_case columns mapped to these fields).  */
/* ------------------------------------------------------------------ */

export type AgentDetail = {
  readonly name: string;
  readonly beat: string;
  readonly handles: readonly string[];
  readonly draftingInstructions: string;
  readonly accountTier: "standard" | "premium";
  /** null when the stored cadence failed to parse — renders as fallback text. */
  readonly cadence: Schedule | null;
  /** ISO timestamp of when the desk was created. */
  readonly createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/**
 * Per-desk dashboard: an identity header, a Configuration card that states the
 * saved desk in plain words, and three tabs — Wire, Drafts, Activity — each an
 * empty placeholder until those data shapes are persisted and wired.
 */
export function AgentDashboard({ agent }: { readonly agent: AgentDetail }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border py-5">
        <AppSidebarBackRow title={agent.name} />
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
              <ConfigRow label="Cadence">
                {agent.cadence ? formatCadence(agent.cadence) : "Custom schedule"}
              </ConfigRow>
              <ConfigRow label="Account tier">{TIER_LABELS[agent.accountTier]}</ConfigRow>
              <ConfigRow label="Drafting instructions">
                <span className="whitespace-pre-wrap">{agent.draftingInstructions}</span>
              </ConfigRow>
              <ConfigRow label="Created">{formatCreated(agent.createdAt)}</ConfigRow>
            </dl>
          </CardContent>
        </Card>

        <Tabs className="mt-6 gap-0" defaultValue="wire">
          <TabsList className="w-full justify-start sm:w-fit">
            <TabsTrigger value="wire">Wire</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent className="py-4" value="wire">
            <TabEmpty
              description="As your agent aggregates atomic news items on this beat, they'll stream in here newest-first."
              title="Nothing on the wire yet"
            />
          </TabsContent>
          <TabsContent className="py-4" value="drafts">
            <TabEmpty
              description="Drafts your agent writes — and posts you publish — will collect here."
              title="No drafts yet"
            />
          </TabsContent>
          <TabsContent className="py-4" value="activity">
            <TabEmpty
              description="Every aggregation run your agent performs is traced here, step by step."
              title="No runs yet"
            />
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

/** created_at ISO → "July 11, 2026", pinned to UTC so server and client agree. */
function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
