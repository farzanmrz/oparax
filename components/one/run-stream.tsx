"use client";

import { CircleDashed } from "lucide-react";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { hue } from "@/components/one/app-shell";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { lift, titleCase } from "@/components/one/stage";
import { shimmerClass } from "@/components/one/timeline";
import { monitorContent } from "@/lib/monitor/content";
import type { RunView } from "@/lib/onboarding/phases";
import type {
  Band,
  Onboarding,
  OnboardingCandidate,
  OnboardingSource,
} from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

// The run, in place of the setup card (lab v2/one/onboarding.tsx Stream, Direction A): ONE lifted card in sections
// divided by hairlines. While the run is on, the first section is the running step's name (shimmering) with the
// engine's newest line under it. Then the step's work, sources first: the chosen sources as pills under their kind's
// band across the card, then Jev's verdicts: Strong Match as a row of tiles (logo, name), Possible Match as rows,
// Set Aside as one line of names. At Ready the step section is gone: the chosen sources, then the completed groups.
// Nothing moves on a timer; the page refreshes and shows what is saved.

const copy = monitorContent.onboarding;
const kinds = ["x", "rss", "website"] as const;
/** Set-aside names shown before "and N more". */
const ASIDE_SHOWN = 12;
const bandTone: Record<Band, string> = {
  strong: "text-[var(--ok)]",
  possible: "text-t2",
  aside: "text-t3",
};

/** A kind's heading inside the run card, Direction A: a band on the raised ground across the card. */
function KindHead({ kind }: { kind: (typeof kinds)[number] }) {
  return (
    <p className="-mx-5 flex h-10 items-center gap-2 bg-[var(--raised)] px-5 text-[15px] leading-5 font-semibold text-t1">
      <GroupGlyph kind={kind} className={cn("size-4 shrink-0", hue[kind])} />
      {titleCase(copy.groups[kind])}
    </p>
  );
}

export function Stream({
  view,
  run,
  ready,
  stopped,
}: {
  view: RunView;
  run: Onboarding;
  ready: boolean;
  /** The stopped line and its retry, when the run failed. */
  stopped?: React.ReactNode;
}) {
  const current = view.phases.find((p) => p.state === "running" || p.state === "failed");
  const running = current?.state === "running";
  // The engine's newest line is the running step's own only once it says more than a finished step's result.
  const activity =
    view.activity && !view.phases.some((p) => p.result === view.activity) ? view.activity : null;
  return (
    <div className={cn(lift, "divide-y divide-line")}>
      {current && !ready ? (
        <section aria-label={copy.phases[current.id].title} className="p-5">
          <h2 className="text-[15px] font-semibold text-t1">
            {running ? (
              <Shimmer as="span" duration={1.8} className={cn(shimmerClass, "font-semibold")}>
                {copy.phases[current.id].title}
              </Shimmer>
            ) : (
              copy.phases[current.id].title
            )}
          </h2>
          {running && activity ? (
            <p className="mt-2 text-[13px] leading-[1.55] text-t2">
              {activity}
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle"
              />
            </p>
          ) : null}
          {stopped}
        </section>
      ) : null}

      {run.chosen?.length ? <Chosen list={run.chosen} /> : null}

      {run.candidates ? <Verdicts list={run.candidates} /> : null}
    </div>
  );
}

/** The chosen sources under their kinds; a pill opens its reason in a quiet line under the group. */
function Chosen({ list }: { list: OnboardingSource[] }) {
  const [why, setWhy] = useState<string | null>(null);
  const groups = kinds
    .map((kind) => ({ kind, rows: list.filter((s) => s.kind === kind) }))
    .filter((group) => group.rows.length);
  return (
    <section aria-label={copy.yourSources} className="grid gap-4 p-5">
      {groups.map(({ kind, rows }) => {
        const open = rows.find((s) => s.key === why);
        return (
          <section key={kind} aria-label={copy.groups[kind]}>
            <KindHead kind={kind} />
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {rows.map((source) => (
                <Pill
                  key={source.key}
                  source={source}
                  on={why === source.key}
                  onWhy={() => setWhy((cur) => (cur === source.key ? null : source.key))}
                />
              ))}
            </ul>
            {open?.why ? (
              <p className="mt-2 text-[13px] leading-[1.5] text-t2">
                <span className="font-medium text-t1">{open.name}</span> {open.why}
              </p>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}

/** A chosen source as a pill: the logo, the name and the handle or address on one line. */
function Pill({ source, on, onWhy }: { source: OnboardingSource; on: boolean; onWhy: () => void }) {
  const x = source.kind === "x";
  return (
    <li>
      <button
        type="button"
        onClick={onWhy}
        aria-expanded={on}
        className={cn(
          "flex h-8 items-center gap-2 rounded-full border pr-3 pl-1.5 text-[12.5px] shadow-[var(--top-light)] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          on
            ? "border-[var(--brand-line)] bg-[var(--raised)]"
            : "border-line-strong bg-[var(--window)] hover:bg-raised",
        )}
      >
        <SourceMark
          kind={x ? "x" : "site"}
          mark={source.address}
          size={20}
          className={x ? "" : "rounded-[5px]"}
        />
        <span className="font-medium whitespace-nowrap text-t1">{source.name}</span>
        {source.name !== source.address ? (
          <span className="whitespace-nowrap text-t3">{source.address}</span>
        ) : null}
      </button>
    </li>
  );
}

function CandidateMark({ c, size, dim }: { c: OnboardingCandidate; size: number; dim?: boolean }) {
  return (
    <SourceMark
      kind={c.kind === "x" ? "x" : c.kind === "github" ? "github" : "site"}
      mark={c.mark}
      size={size}
      className={cn(c.kind !== "x" && "rounded-[5px]", dim && "opacity-60 grayscale")}
    />
  );
}

/** Jev's verdicts, Direction A: Strong Match as a row of tiles, Possible Match as rows, Set Aside as one line. */
function Verdicts({ list }: { list: OnboardingCandidate[] }) {
  const strong = list.filter((c) => c.band === "strong");
  const possible = list.filter((c) => c.band === "possible");
  const aside = list.filter((c) => c.band === "aside");
  const shownAside = aside.slice(0, ASIDE_SHOWN);
  const hidden = aside.length - shownAside.length;
  return (
    <>
      {strong.length ? (
        <section aria-label={copy.bands.strong} className="p-5">
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[15px] font-semibold", bandTone.strong)}>
              {copy.bands.strong}
            </span>
            <span className="text-[12.5px] text-t3 tabular-nums">{strong.length}</span>
          </p>
          <ul className="mt-3 grid gap-2.5 desk:grid-cols-2 xl:grid-cols-3">
            {strong.map((c) => (
              <li key={c.key} className={cn(lift, "flex items-center gap-2.5 p-3")}>
                <CandidateMark c={c} size={24} />
                <span className="min-w-0 truncate text-[13px] font-semibold text-t1">{c.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {possible.length ? (
        <section aria-label={copy.bands.possible} className="p-5">
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[15px] font-semibold", bandTone.possible)}>
              {copy.bands.possible}
            </span>
            <span className="text-[12.5px] text-t3 tabular-nums">{possible.length}</span>
          </p>
          <ul className="mt-2 flex flex-col">
            {possible.map((c) => (
              <li
                key={c.key}
                className="flex min-h-8 items-center gap-2.5 border-b border-line py-1 last:border-b-0"
              >
                <span className="grid size-5 shrink-0 place-items-center">
                  <CircleDashed
                    className="size-3.5 text-[var(--caution)]"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
                <CandidateMark c={c} size={20} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-t1">
                  {c.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {aside.length ? (
        <section aria-label={copy.bands.aside} className="p-5">
          <p className="text-[13px] leading-[1.6] text-t3">
            <span className="font-semibold">{copy.bands.aside}</span>
            <span className="ml-2 tabular-nums">{aside.length}</span>
            <span className="ml-3">{shownAside.map((c) => c.name).join(", ")}</span>
            {hidden > 0 ? <span>{copy.andMore(hidden)}</span> : null}
          </p>
        </section>
      ) : null}
    </>
  );
}
