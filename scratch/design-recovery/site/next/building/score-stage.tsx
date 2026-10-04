"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { batches, candidateCount, droppedSample, KEEP_LINE, kept, tableRows, type Candidate } from "../data/onboarding";
import { handleOf, KindIcon } from "../source-kind";

// Adapted from React Bits Pro tool-calls-4 (ranked rows with a relevance number), recolored to semantic
// tokens, with a score bar that carries the keep line so kept and not kept read at a glance (blue family only).

const TOP = 6;
const EDGE = 3;
const NEAR_DROPPED = 3;

function ScoreBar({ score, keep }: { score: number; keep: boolean }) {
  return (
    <span className="relative h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full", keep ? "bg-primary" : "bg-muted-foreground/35")}
        style={{ width: `${score * 100}%` }}
      />
      <span className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${KEEP_LINE * 100}%` }} />
    </span>
  );
}

function Row({ c, rank, keep }: { c: Candidate; rank: number; keep: boolean }) {
  return (
    <li
      className={cn(
        "flex h-11 items-center gap-3 rounded-md border border-border bg-card px-3",
        !keep && "bg-transparent opacity-75",
      )}
    >
      <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{rank}</span>
      <KindIcon kind={c.kind} />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className={cn("font-medium", !keep && "text-muted-foreground")}>{c.name}</span>
        {c.kind === "x_account" ? <span className="ml-1.5 text-muted-foreground">{handleOf(c.target)}</span> : null}
        {c.quoted ? (
          <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            Quoted in your posts
          </span>
        ) : c.focus ? (
          <span className="ml-2 text-muted-foreground">{c.focus}</span>
        ) : null}
      </span>
      <ScoreBar score={c.score} keep={keep} />
      <span
        className={cn("w-9 shrink-0 text-right text-sm tabular-nums", keep ? "font-medium" : "text-muted-foreground")}
      >
        {c.score.toFixed(2)}
      </span>
    </li>
  );
}

// Round 1 change 13: no counter derived from animation time. The three real batches (60, 60, 33) each flip
// to done as a unit; nothing claims how many sources inside a batch have been scored.
export function ScoreRunning({ progress }: { progress: number }) {
  const total = batches.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3">
      <ol className="grid gap-2" style={{ gridTemplateColumns: batches.map((b) => `${b}fr`).join(" ") }}>
        {batches.map((size, i) => {
          const end = batches.slice(0, i + 1).reduce((a, b) => a + b, 0) / total;
          const done = progress >= end;
          return (
            <li key={i} className="space-y-1.5">
              <span
                className={cn("block h-1.5 rounded-full", done ? "bg-muted-foreground/70" : "animate-pulse bg-muted")}
                aria-hidden="true"
              />
              <span className="block text-xs text-muted-foreground tabular-nums">
                {size} sources, {done ? "done" : "checking"}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full bg-muted/70" />
        ))}
      </div>
    </div>
  );
}

export function ScoreResult() {
  const [all, setAll] = useState(false);
  const middle = kept.slice(TOP, kept.length - EDGE);
  const shown = all ? kept : [...kept.slice(0, TOP), ...kept.slice(kept.length - EDGE)];
  const dropped = droppedSample.slice(0, NEAR_DROPPED);
  const rest = candidateCount - kept.length - dropped.length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {tableRows} sources from the Oparax list and {candidateCount - tableRows} accounts you quote, each scored
          against your sentence.
        </p>
        <p className="shrink-0 text-sm">
          <span className="font-semibold tabular-nums">{kept.length} shortlisted</span>
          <span className="text-muted-foreground"> from {candidateCount}</span>
        </p>
      </div>
      <ol className="mt-3 space-y-1.5" aria-label="Shortlisted sources, highest score first">
        {shown.map((c, i) => {
          const rank = all || i < TOP ? i + 1 : kept.length - EDGE + (i - TOP) + 1;
          return (
            <Fragment key={c.id}>
              {!all && i === TOP ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setAll(true)}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                    Show {middle.length} more shortlisted
                  </button>
                </li>
              ) : null}
              <Row c={c} rank={rank} keep />
            </Fragment>
          );
        })}
      </ol>
      <div className="my-3 flex items-center gap-3" role="separator" aria-label="Shortlist line at 0.35">
        <span className="h-px flex-1 border-t border-dashed border-primary" />
        <span className="text-xs font-medium text-primary">Shortlisted at {KEEP_LINE.toFixed(2)} and above</span>
        <span className="h-px flex-1 border-t border-dashed border-primary" />
      </div>
      <ol className="space-y-1.5" aria-label="Not shortlisted">
        {dropped.map((c, i) => (
          <Row key={c.id} c={c} rank={kept.length + i + 1} keep={false} />
        ))}
      </ol>
      <p className="mt-2 pl-9 text-xs text-muted-foreground">
        {rest} more scored under {KEEP_LINE.toFixed(2)}
      </p>
    </div>
  );
}
