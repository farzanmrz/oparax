"use client";

import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  Clock3Icon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PenLineIcon,
  RadioIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PageFrame } from "../chrome";

type DirectionId = "signal-grid" | "editorial-ledger" | "agent-console";
type BoardId = "components" | "ai-states" | "feed";
type FeedLayout = "split" | "sequence" | "console";

type Direction = {
  id: DirectionId;
  name: string;
  thesis: string;
  density: string;
  surfaceModel: string;
  sourceDraftModel: string;
  typography: string;
  bodyFont: string;
  headingFont: string;
  feedLayout: FeedLayout;
  panelClass: string;
  tokens: Record<string, string>;
};

const DIRECTIONS: readonly Direction[] = [
  {
    id: "signal-grid",
    name: "Signal grid",
    thesis:
      "A compact, divider-led newsroom instrument that keeps the work louder than the chrome.",
    density: "Compact",
    surfaceModel: "Flat planes and precise rules",
    sourceDraftModel: "Tight source-and-draft split",
    typography: "Neutral grotesk with tabular operational data",
    bodyFont: 'Inter, Arial, "Helvetica Neue", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Inter, Arial, "Helvetica Neue", ui-sans-serif, system-ui, sans-serif',
    feedLayout: "split",
    panelClass: "rounded-[var(--radius)] border border-border bg-card/55",
    tokens: {
      "--background": "oklch(0.115 0.006 258)",
      "--foreground": "oklch(0.955 0.004 255)",
      "--card": "oklch(0.145 0.007 258)",
      "--card-foreground": "oklch(0.955 0.004 255)",
      "--popover": "oklch(0.165 0.008 258)",
      "--popover-foreground": "oklch(0.955 0.004 255)",
      "--primary": "oklch(0.66 0.18 251)",
      "--primary-foreground": "oklch(0.985 0.004 250)",
      "--secondary": "oklch(0.205 0.008 258)",
      "--secondary-foreground": "oklch(0.94 0.004 255)",
      "--muted": "oklch(0.19 0.007 258)",
      "--muted-foreground": "oklch(0.66 0.008 255)",
      "--accent": "oklch(0.22 0.04 251)",
      "--accent-foreground": "oklch(0.94 0.025 250)",
      "--border": "oklch(1 0 0 / 11%)",
      "--input": "oklch(1 0 0 / 15%)",
      "--ring": "oklch(0.66 0.18 251)",
      "--destructive": "oklch(0.68 0.19 25)",
      "--success": "oklch(0.75 0.15 155)",
      "--warning": "oklch(0.78 0.13 78)",
      "--live": "oklch(0.68 0.19 25)",
      "--radius": "0.375rem",
    },
  },
  {
    id: "editorial-ledger",
    name: "Editorial ledger",
    thesis:
      "A measured editorial canvas where the reported fact visibly flows into the proposed post.",
    density: "Measured",
    surfaceModel: "Open canvas, generous rules",
    sourceDraftModel: "Sequential source-to-draft reading",
    typography: "Editorial serif headings with a quiet humanist sans",
    bodyFont: '"Avenir Next", Avenir, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    feedLayout: "sequence",
    panelClass: "rounded-[var(--radius)] border-y border-border bg-card/25",
    tokens: {
      "--background": "oklch(0.145 0.009 258)",
      "--foreground": "oklch(0.94 0.012 88)",
      "--card": "oklch(0.18 0.01 258)",
      "--card-foreground": "oklch(0.94 0.012 88)",
      "--popover": "oklch(0.19 0.012 258)",
      "--popover-foreground": "oklch(0.94 0.012 88)",
      "--primary": "oklch(0.68 0.14 244)",
      "--primary-foreground": "oklch(0.985 0.004 244)",
      "--secondary": "oklch(0.235 0.012 258)",
      "--secondary-foreground": "oklch(0.93 0.01 88)",
      "--muted": "oklch(0.22 0.011 258)",
      "--muted-foreground": "oklch(0.68 0.012 88)",
      "--accent": "oklch(0.255 0.035 244)",
      "--accent-foreground": "oklch(0.94 0.025 244)",
      "--border": "oklch(0.93 0.012 88 / 13%)",
      "--input": "oklch(0.93 0.012 88 / 17%)",
      "--ring": "oklch(0.68 0.14 244)",
      "--destructive": "oklch(0.7 0.17 28)",
      "--success": "oklch(0.76 0.13 154)",
      "--warning": "oklch(0.8 0.12 82)",
      "--live": "oklch(0.7 0.17 28)",
      "--radius": "0.75rem",
    },
  },
  {
    id: "agent-console",
    name: "Agent console",
    thesis:
      "An inspectable operations surface that makes AI activity and publishing state explicit.",
    density: "Dense",
    surfaceModel: "Inset operational panels",
    sourceDraftModel: "Evidence rail beside the publish surface",
    typography: "Technical humanist sans with mono metadata",
    bodyFont: '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif',
    feedLayout: "console",
    panelClass:
      "rounded-[var(--radius)] border border-border bg-card shadow-[0_14px_40px_oklch(0_0_0/22%)]",
    tokens: {
      "--background": "oklch(0.1 0.011 265)",
      "--foreground": "oklch(0.95 0.006 255)",
      "--card": "oklch(0.155 0.015 263)",
      "--card-foreground": "oklch(0.95 0.006 255)",
      "--popover": "oklch(0.18 0.018 263)",
      "--popover-foreground": "oklch(0.95 0.006 255)",
      "--primary": "oklch(0.7 0.19 252)",
      "--primary-foreground": "oklch(0.985 0.003 252)",
      "--secondary": "oklch(0.22 0.016 263)",
      "--secondary-foreground": "oklch(0.94 0.006 255)",
      "--muted": "oklch(0.205 0.014 263)",
      "--muted-foreground": "oklch(0.67 0.012 255)",
      "--accent": "oklch(0.255 0.06 252)",
      "--accent-foreground": "oklch(0.95 0.02 252)",
      "--border": "oklch(0.72 0.03 255 / 16%)",
      "--input": "oklch(0.72 0.03 255 / 20%)",
      "--ring": "oklch(0.7 0.19 252)",
      "--destructive": "oklch(0.69 0.2 25)",
      "--success": "oklch(0.78 0.16 156)",
      "--warning": "oklch(0.82 0.14 78)",
      "--live": "oklch(0.69 0.2 25)",
      "--radius": "0.5rem",
    },
  },
] as const;

const BOARDS: readonly { id: BoardId; label: string }[] = [
  { id: "components", label: "Component board" },
  { id: "ai-states", label: "AI-state board" },
  { id: "feed", label: "Oparax Feed" },
] as const;

function directionStyle(direction: Direction): CSSProperties {
  return {
    ...direction.tokens,
    fontFamily: direction.bodyFont,
  } as CSSProperties;
}

function BoardTitle({
  direction,
  title,
  children,
}: {
  readonly direction: Direction;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-border border-b py-5">
      <div className="min-w-0">
        <h1
          className="text-balance font-semibold text-[clamp(1.55rem,3vw,2.25rem)] leading-tight tracking-[-0.025em]"
          style={{ fontFamily: direction.headingFont }}
        >
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{children}</p>
      </div>
      <Badge className="hidden shrink-0 sm:inline-flex" variant="secondary">
        {direction.name}
      </Badge>
    </div>
  );
}

function Swatch({ label, variable }: { readonly label: string; readonly variable: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-[calc(var(--radius)*0.75)] border border-border"
        style={{ background: `var(${variable})` }}
      />
      <div className="min-w-0">
        <p className="truncate font-medium text-xs">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{variable}</p>
      </div>
    </div>
  );
}

function systemCardClass(direction: Direction) {
  if (direction.id === "editorial-ledger") {
    return "rounded-none border-y border-border bg-transparent py-6 ring-0";
  }
  if (direction.id === "agent-console") {
    return "rounded-[var(--radius)] border border-border bg-card py-3 ring-0 shadow-[0_14px_40px_oklch(0_0_0/18%)]";
  }
  return "rounded-[var(--radius)] border border-border bg-card/35 py-4 ring-0";
}

function ComponentBoard({ direction }: { readonly direction: Direction }) {
  return (
    <div className="pb-8">
      <BoardTitle direction={direction} title="Component system">
        The same Oparax controls and states, rendered through this direction’s typography, color,
        density, radius, and surface rules.
      </BoardTitle>

      <div className="grid gap-4 py-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card
          className={systemCardClass(direction)}
          size={direction.id === "agent-console" ? "sm" : "default"}
        >
          <CardHeader>
            <CardTitle>Typography and hierarchy</CardTitle>
            <CardDescription>{direction.typography}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p
                className="font-semibold text-3xl leading-none tracking-[-0.035em]"
                style={{ fontFamily: direction.headingFont }}
              >
                Stories worth moving on
              </p>
              <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
                Oparax watches the accounts on your beat and drafts the post while the story is
                still moving.
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-base">Draft ready</p>
                <p className="mt-1 text-muted-foreground text-sm">Primary working label</p>
              </div>
              <div>
                <p className="font-mono text-xs">@arsenalwatch · 11m</p>
                <p className="mt-1 text-muted-foreground text-xs">Operational metadata</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={systemCardClass(direction)}
          size={direction.id === "agent-console" ? "sm" : "default"}
        >
          <CardHeader>
            <CardTitle>Color roles</CardTitle>
            <CardDescription>
              Neutral depth carries hierarchy; blue is reserved for intent.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <Swatch label="Canvas" variable="--background" />
            <Swatch label="Surface" variable="--card" />
            <Swatch label="Muted" variable="--muted" />
            <Swatch label="Action" variable="--primary" />
            <Swatch label="Success" variable="--success" />
            <Swatch label="Warning" variable="--warning" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          className={systemCardClass(direction)}
          size={direction.id === "agent-console" ? "sm" : "default"}
        >
          <CardHeader>
            <CardTitle>Actions and navigation</CardTitle>
            <CardDescription>
              Rounded rectangles, visible focus, and one deliberate action color.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button>Post to X</Button>
              <Button variant="outline">Edit draft</Button>
              <Button variant="ghost">Why this draft</Button>
              <Button variant="destructive">Discard</Button>
              <Button disabled>Posting…</Button>
            </div>
            <Tabs defaultValue="feed">
              <TabsList variant={direction.id === "editorial-ledger" ? "line" : "default"}>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="voice">Voice</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap gap-2">
              <Badge>Needs review</Badge>
              <Badge variant="secondary">Drafting</Badge>
              <Badge variant="outline">Posted to X</Badge>
              <Badge variant="destructive">Failed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          className={systemCardClass(direction)}
          size={direction.id === "agent-console" ? "sm" : "default"}
        >
          <CardHeader>
            <CardTitle>Fields and feedback</CardTitle>
            <CardDescription>
              Every field shares one treatment, including disabled future fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input aria-label="Agent name example" defaultValue="Arsenal watch" />
            <Textarea
              aria-label="Beat example"
              defaultValue="Arsenal transfers, team news, and match reaction. Skip fantasy football."
            />
            <div className="flex items-center gap-2 opacity-50">
              <Input aria-label="Website example" disabled placeholder="example.com" />
              <Badge className="shrink-0" variant="secondary">
                Coming soon
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-xs">
                <CheckIcon className="size-3.5 text-success" /> Saved
              </div>
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-xs">
                <Clock3Icon className="size-3.5 text-warning" /> Waiting
              </div>
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-xs">
                <AlertCircleIcon className="size-3.5 text-destructive" /> Needs attention
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VoiceProgress({ direction }: { readonly direction: Direction }) {
  return (
    <div className={cn("p-4 sm:p-5", direction.panelClass)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Learning your voice</p>
          <p className="mt-1 text-muted-foreground text-xs">
            You can leave and come back. This keeps running.
          </p>
        </div>
        <Badge variant="secondary">In progress</Badge>
      </div>

      <ChainOfThought defaultOpen>
        <ChainOfThoughtHeader className="rounded-[var(--radius)] border border-border px-3 py-2">
          Inspect current work
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent className="px-1">
          <ChainOfThoughtStep
            description="100 original posts collected"
            icon={CheckIcon}
            label="Read recent posts"
            status="complete"
          />
          <ChainOfThoughtStep
            description="Transfers, team news, and match reaction"
            icon={CheckIcon}
            label="Worked out your beat"
            status="complete"
          />
          <ChainOfThoughtStep
            icon={Loader2Icon}
            label={
              <Shimmer as="span" className="font-medium" duration={1.8}>
                Learning how you write
              </Shimmer>
            }
            status="active"
          >
            <div className="rounded-[var(--radius)] border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
              Short declarative openers dominate. Emoji appears only on confirmed transfers.
              Comparing sourcing language before saving the rule.
            </div>
          </ChainOfThoughtStep>
          <ChainOfThoughtStep icon={CircleIcon} label="Save your voice rules" status="pending" />
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}

function AIStateBoard({ direction }: { readonly direction: Direction }) {
  return (
    <div className="pb-8">
      <BoardTitle direction={direction} title="AI states">
        Progress stays understandable at a glance, while concise evidence remains available on
        demand instead of competing with the task.
      </BoardTitle>

      <div className="grid items-start gap-4 py-5 lg:grid-cols-[1.15fr_0.85fr]">
        <VoiceProgress direction={direction} />

        <div className="space-y-3">
          <div className={cn("p-4", direction.panelClass)}>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
                <SparklesIcon className="size-4" />
              </span>
              <div>
                <Shimmer className="font-medium text-sm" duration={1.8}>
                  Drafting in your voice
                </Shimmer>
                <p className="mt-1 text-muted-foreground text-xs">
                  A few models are writing from the same verified story.
                </p>
              </div>
            </div>
          </div>

          <div className={cn("p-4", direction.panelClass)}>
            <div className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 size-4 text-success" />
              <div>
                <p className="font-medium text-sm">Voice rules saved</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Your Feed is ready. New drafts will use the enabled rules.
                </p>
              </div>
            </div>
          </div>

          <div className={cn("p-4", direction.panelClass)}>
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="mt-0.5 size-4 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-sm">Couldn’t finish voice extraction</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Your agent still exists. Retry from Voice when you’re ready.
                </p>
                <Button className="mt-3" size="sm" variant="outline">
                  Retry extraction
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-border border-t pt-5 sm:grid-cols-3">
        {[
          [ShieldCheckIcon, "Inspectable", "Evidence is one click away"],
          [RadioIcon, "Live", "Active work is unmistakable"],
          [MessageSquareTextIcon, "Plain language", "States describe what happens next"],
        ].map(([Icon, label, description]) => {
          const StateIcon = Icon as typeof ShieldCheckIcon;
          return (
            <div className="flex gap-3" key={String(label)}>
              <StateIcon className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-sm">{String(label)}</p>
                <p className="text-muted-foreground text-xs">{String(description)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcePanel({ direction }: { readonly direction: Direction }) {
  return (
    <section
      className={cn("min-w-0 p-4 sm:p-5", direction.feedLayout === "console" && "bg-muted/20")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background text-xs">
            FR
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">Fabrizio Romano</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              @FabrizioRomano · 11m
            </p>
          </div>
        </div>
        <span className="flex size-6 items-center justify-center rounded-[var(--radius)] border border-border font-semibold text-xs">
          X
        </span>
      </div>
      <p className="mt-5 text-[15px] leading-relaxed">
        Arsenal have reached an agreement in principle with Valencia for Cristhian Mosquera. Final
        details are being completed, with the player ready to travel once documents are exchanged.
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 border-border border-t pt-3 text-muted-foreground text-xs">
        <span>Tracked source · On beat</span>
        <Button size="xs" variant="ghost">
          Original post <ExternalLinkIcon />
        </Button>
      </div>
    </section>
  );
}

function DraftPanel({ direction }: { readonly direction: Direction }) {
  return (
    <section className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Draft for @arsenalwatch</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">Drafted 3m ago · X</p>
        </div>
        <Badge>Needs review</Badge>
      </div>
      <Textarea
        aria-label="Draft text"
        className={cn(
          "mt-4 min-h-32 resize-none text-[15px] leading-relaxed",
          direction.id === "editorial-ledger" && "border-x-0 bg-transparent px-0 shadow-none",
        )}
        defaultValue="Arsenal are closing in on Cristhian Mosquera after reaching an agreement in principle with Valencia. Final details are being completed before the defender travels."
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="ghost">
          <ChevronDownIcon /> Why this draft
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">169 / 280</span>
          <Button size="sm">
            <SendIcon /> Post to X
          </Button>
        </div>
      </div>
    </section>
  );
}

function StoryPair({ direction }: { readonly direction: Direction }) {
  if (direction.feedLayout === "sequence") {
    return (
      <article className={direction.panelClass}>
        <SourcePanel direction={direction} />
        <div className="flex items-center gap-3 px-5 text-muted-foreground text-xs">
          <span className="h-px flex-1 bg-border" />
          <PenLineIcon className="size-3.5 text-primary" /> Drafted from this source
          <span className="h-px flex-1 bg-border" />
        </div>
        <DraftPanel direction={direction} />
      </article>
    );
  }

  if (direction.feedLayout === "console") {
    return (
      <article className={cn(direction.panelClass, "overflow-hidden")}>
        <div className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <span>Story 01 · Source verified</span>
          <span>Draft ready</span>
        </div>
        <div className="grid lg:grid-cols-[0.43fr_0.57fr] lg:divide-x lg:divide-border">
          <SourcePanel direction={direction} />
          <DraftPanel direction={direction} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-border border-t bg-muted/25 px-4 py-2 text-muted-foreground text-xs">
          <span className="flex items-center gap-1.5">
            <CheckIcon className="size-3 text-success" /> Beat verified
          </span>
          <span className="flex items-center gap-1.5">
            <CheckIcon className="size-3 text-success" /> Voice matched
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3Icon className="size-3 text-warning" /> Reporter review pending
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        direction.panelClass,
        "grid overflow-hidden lg:grid-cols-[0.44fr_0.56fr] lg:divide-x lg:divide-border",
      )}
    >
      <SourcePanel direction={direction} />
      <DraftPanel direction={direction} />
    </article>
  );
}

function FeedBoard({ direction }: { readonly direction: Direction }) {
  return (
    <div className="pb-8">
      <BoardTitle direction={direction} title="Feed">
        The source, proposed post, provenance, and publishing consequence remain visible as one
        reviewable unit.
      </BoardTitle>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="size-1.5 rounded-full bg-live" />
          <span className="font-medium">Arsenal watch is live</span>
          <span className="text-muted-foreground">· 3 drafts need review</span>
        </div>
        <Button size="sm" variant="outline">
          <PenLineIcon /> Review oldest first
        </Button>
      </div>

      <StoryPair direction={direction} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Source", "What happened and where it came from"],
          ["Draft", "What Oparax proposes in your voice"],
          ["Publish", "The exact action and its consequence"],
        ].map(([label, description], index) => (
          <div className="flex gap-3 border-border border-t pt-3" key={label}>
            <span className="font-mono text-primary text-xs">0{index + 1}</span>
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectionBoard({
  direction,
  board,
}: {
  readonly direction: Direction;
  readonly board: BoardId;
}) {
  const note = `${direction.name} — ${direction.density.toLowerCase()} density · ${direction.surfaceModel.toLowerCase()} · ${direction.sourceDraftModel.toLowerCase()}`;
  return (
    <div className="dark" style={directionStyle(direction)}>
      <PageFrame chrome="desk" note={note} viewport="web">
        {board === "components" ? <ComponentBoard direction={direction} /> : null}
        {board === "ai-states" ? <AIStateBoard direction={direction} /> : null}
        {board === "feed" ? <FeedBoard direction={direction} /> : null}
      </PageFrame>
    </div>
  );
}

export function SystemDirectionsLab() {
  const [directionId, setDirectionId] = useState<DirectionId>("signal-grid");
  const [board, setBoard] = useState<BoardId>("components");
  const direction = DIRECTIONS.find((candidate) => candidate.id === directionId) ?? DIRECTIONS[0];

  return (
    <main className="min-h-dvh bg-[#0b0b0d] text-[#f4f4f5]">
      <div className="sticky top-0 z-50 border-white/10 border-b bg-[#0b0b0d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-semibold text-xl tracking-tight">Oparax visual-system lab</h1>
              <p className="mt-1 max-w-3xl text-[#9b9ba3] text-sm">
                Header structure, product behavior, content, and accessibility stay fixed. Compare
                typography, density, surface hierarchy, component language, and source-to-draft
                composition.
              </p>
            </div>
            <a
              className="text-[#9b9ba3] text-xs underline-offset-4 hover:text-white hover:underline"
              href="/dev/directions"
            >
              Open the preserved Slice 79 boards
            </a>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            {DIRECTIONS.map((candidate) => (
              <button
                aria-pressed={candidate.id === directionId}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  candidate.id === directionId
                    ? "border-blue-500/70 bg-blue-500/10"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]",
                )}
                key={candidate.id}
                onClick={() => setDirectionId(candidate.id)}
                type="button"
              >
                <span className="font-medium text-sm">{candidate.name}</span>
                <span className="mt-0.5 block text-[#9b9ba3] text-xs">{candidate.thesis}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {BOARDS.map((candidate) => (
              <button
                aria-pressed={candidate.id === board}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
                  candidate.id === board
                    ? "bg-white text-black"
                    : "text-[#9b9ba3] hover:bg-white/5 hover:text-white",
                )}
                key={candidate.id}
                onClick={() => setBoard(candidate.id)}
                type="button"
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-6">
        <div className="mb-4 grid gap-2 text-xs text-[#9b9ba3] sm:grid-cols-4">
          <p>
            <span className="text-white">Typography:</span> {direction.typography}
          </p>
          <p>
            <span className="text-white">Density:</span> {direction.density}
          </p>
          <p>
            <span className="text-white">Surfaces:</span> {direction.surfaceModel}
          </p>
          <p>
            <span className="text-white">Feed model:</span> {direction.sourceDraftModel}
          </p>
        </div>
        <DirectionBoard board={board} direction={direction} />
      </div>
    </main>
  );
}
