"use client";

// kit mapping:
// page frame + chrome -> PageFrame (app/dev/directions/chrome — session-built)
// connect gate -> Button standalone + helper line; connected -> field-look ✓ row (ledger-legal)
// grouped form -> bespoke (proposed pattern: Grouped form container) — ONE bordered container,
//   Separator dividers between groups (the liked grok-r3 pattern)
// beat hero -> Textarea (ui) · name -> Input (ui) · tracked handles -> ChipsField (settled)
// greyed websites -> ChipsField + Badge "Coming soon" (opacity, per components.md)
// submit -> Button; mobile sticky commit dock -> bespoke (proposed pattern: Commit dock)

import { CheckIcon, Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PageFrame } from "../../chrome";

/**
 * Claude board r4 — "Gate first, one grouped container".
 * Owner leanings applied: claude-r3 field/label simplicity, grok-r3 one-combined-container
 * with dividers, Connect X early as a STANDALONE control, title one line with nothing under
 * it, single honest measure on web.
 */

function FieldLabel({
  children,
  badge,
}: {
  readonly children: ReactNode;
  readonly badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-medium text-foreground text-sm">{children}</span>
      {badge}
    </div>
  );
}

function ConnectBlock({ linked }: { readonly linked: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Your X account</FieldLabel>
      {linked ? (
        <div className="flex min-h-9 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30">
          <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span className="truncate font-medium">@reshadrahman</span>
          <span className="text-muted-foreground">connected</span>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            Oparax reads your recent X posts to learn how you write, so drafts land in your voice.
          </p>
          <Button className="w-fit" variant="outline">
            Connect X
          </Button>
        </>
      )}
    </div>
  );
}

function Surface({
  viewport,
  linked,
  filled,
  pending,
  error,
}: {
  readonly viewport: "mobile" | "web";
  readonly linked: boolean;
  readonly filled: boolean;
  readonly pending: boolean;
  readonly error: string | null;
}) {
  const [handles, setHandles] = useState<string[]>(
    filled ? ["FabrizioRomano", "David_Ornstein", "sistoney67"] : [],
  );
  const [handleDraft, setHandleDraft] = useState("");
  const [beat, setBeat] = useState(
    filled ? "Arsenal — transfers, team news, match reaction. Skip fantasy-league content." : "",
  );
  const [name, setName] = useState(filled ? "Arsenal watch" : "");

  function commitDraft() {
    const parts = handleDraft
      .split(/[\s,@]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) setHandles((prev) => [...new Set([...prev, ...parts])]);
    setHandleDraft("");
  }

  const canSubmit = linked && beat.trim().length > 0 && !pending;

  return (
    <div className={cn("flex w-full flex-col py-6", viewport === "web" && "mx-auto max-w-2xl")}>
      <h1 className="pb-6 font-semibold text-2xl tracking-tight">Create agent</h1>

      <fieldset className="flex flex-col gap-5 disabled:opacity-70" disabled={pending}>
        <ConnectBlock linked={linked} />

        {/* One combined container; thin dividers separate the groups (liked pattern). */}
        <div className="flex flex-col gap-5 rounded-xl border border-border p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Beat</FieldLabel>
            <Textarea
              className="min-h-28"
              onChange={(e) => setBeat(e.target.value)}
              placeholder="e.g. US AI regulation — agencies, hearings, enforcement. Skip product launches."
              value={beat}
            />
            <p className="text-muted-foreground text-xs">
              The topic this agent watches. Be specific — it steers what counts as a story.
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Tracked X accounts ({handles.length}/25)</FieldLabel>
            <ChipsField
              chipLabel={(h) => `@${h}`}
              chips={handles}
              className="min-h-20"
              inputDisabled={handles.length >= 25}
              onBlur={commitDraft}
              onChange={setHandleDraft}
              onRemove={(h) => setHandles((prev) => prev.filter((x) => x !== h))}
              onSubmit={commitDraft}
              placeholder="Paste handles — comma-separated, @ optional"
              removeDisabled={false}
              removeLabel={(h) => `Remove @${h}`}
              value={handleDraft}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Agent name</FieldLabel>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional — defaults to a label from your beat"
              value={name}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5 opacity-50">
            <FieldLabel badge={<Badge variant="secondary">Coming soon</Badge>}>
              Websites (0/5)
            </FieldLabel>
            <ChipsField
              chipLabel={(s) => s}
              chips={[]}
              disabled
              inputDisabled
              onChange={() => {}}
              onRemove={() => {}}
              onSubmit={() => {}}
              placeholder="example.com"
              removeDisabled
              removeLabel={(s) => `Remove ${s}`}
              value=""
            />
          </div>
        </div>
      </fieldset>

      <div
        className={cn(
          "mt-5 flex flex-col gap-2",
          viewport === "mobile" && "sticky bottom-0 bg-background pt-2 pb-4",
        )}
      >
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full sm:w-auto sm:min-w-64" disabled={!canSubmit} size="lg">
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? "Creating your agent…" : "Create agent"}
        </Button>
        <p className="text-muted-foreground text-xs">
          {pending
            ? "Taking you to its feed — voice learning starts there."
            : "Next: it learns your voice (~5–6 minutes). You can leave anytime."}
        </p>
      </div>
    </div>
  );
}

export default function CreateAgentBoard({ viewport }: { readonly viewport: "mobile" | "web" }) {
  return (
    <div className="flex flex-col gap-10">
      <PageFrame
        chrome="deskless"
        note="(a) X not linked — the gate leads; submit blocked"
        viewport={viewport}
      >
        <Surface error={null} filled={false} linked={false} pending={false} viewport={viewport} />
      </PageFrame>
      <PageFrame
        chrome="deskless"
        note="(b) linked, form empty — gate collapses to a ✓ row"
        viewport={viewport}
      >
        <Surface error={null} filled={false} linked pending={false} viewport={viewport} />
      </PageFrame>
      <PageFrame chrome="deskless" note="(c) filled, ready — chips interactive" viewport={viewport}>
        <Surface error={null} filled linked pending={false} viewport={viewport} />
      </PageFrame>
      <PageFrame
        chrome="deskless"
        note="(d) submitting — frozen form, dock narrates the feed handoff"
        viewport={viewport}
      >
        <Surface error={null} filled linked pending viewport={viewport} />
      </PageFrame>
      <PageFrame
        chrome="deskless"
        note="(e) server error — inline above the action"
        viewport={viewport}
      >
        <Surface
          error="Could not create your agent. Please try again."
          filled
          linked
          pending={false}
          viewport={viewport}
        />
      </PageFrame>
    </div>
  );
}
