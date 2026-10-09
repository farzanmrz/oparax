"use client";

// What the run card carries, top to bottom, as the log and the checkpoints allow (council, October 8): the gathered
// count, Jev's one request as an amber line until its scores exist, then the three bands as logo pills with a kind
// chip each, then the chosen sources under their kinds, then the search. At ready the chosen sources lead and the
// bands fold under "Scored N candidates". Nothing moves on a timer; the page refreshes and shows what is saved.

import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { GroupGlyph, KindChip, SourceMark } from "@/components/one/marks";
import { monitorContent } from "@/lib/monitor/content";
import type { RunView } from "@/lib/onboarding/phases";
import type {
  Band,
  Onboarding,
  OnboardingCandidate,
  OnboardingSource,
} from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

const copy = monitorContent.onboarding;
const bands: Band[] = ["strong", "possible", "aside"];
const bandTone: Record<Band, string> = {
  strong: "text-[var(--ok)]",
  possible: "text-t1",
  aside: "text-t3",
};
/** Set-aside candidates shown before "N more". */
const ASIDE_SHOWN = 12;

/** A block's label: 13px semibold, shimmering while its phase runs. */
function Label({ running, children }: { running?: boolean; children: string }) {
  return (
    <h2 className="text-[13px] font-semibold text-t1">
      {running ? (
        <Shimmer as="span" duration={1.8} className="font-semibold">
          {children}
        </Shimmer>
      ) : (
        children
      )}
    </h2>
  );
}

export function Stream({ view, run, ready }: { view: RunView; run: Onboarding; ready: boolean }) {
  const state = (id: string) => view.phases.find((p) => p.id === id)?.state ?? "waiting";
  const gather = state("gather");
  const jev = state("jev");
  const choose = state("choose");
  const search = state("search");

  if (gather === "waiting")
    return view.activity ? (
      <p className="text-[13px] text-t2">
        <Shimmer as="span" duration={1.8}>
          {view.activity}
        </Shimmer>
      </p>
    ) : null;

  const gathered = (
    <section aria-label={copy.gathering} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <Label running={gather === "running"}>{copy.gathering}</Label>
      {view.gathered !== null ? (
        <span className="text-[22px] leading-none font-semibold text-t1 tabular-nums">
          {view.gathered}
        </span>
      ) : null}
      <span className="text-[12.5px] text-t3">{copy.gatheredFrom}</span>
    </section>
  );
  const scored = run.candidates ? (
    <div className="grid gap-4">
      {bands.map((band) => (
        <BandBlock
          key={band}
          band={band}
          list={run.candidates?.filter((c) => c.band === band) ?? []}
        />
      ))}
    </div>
  ) : null;
  const chosen =
    choose !== "waiting" ? (
      <section aria-label={copy.phases.choose.title}>
        <Label running={choose === "running"}>{copy.phases.choose.title}</Label>
        {run.chosen ? <Chosen list={run.chosen} /> : null}
      </section>
    ) : null;
  const searched =
    view.searchTerms && search !== "waiting" ? (
      <section aria-label={copy.phases.search.title}>
        <Label running={search === "running"}>{copy.phases.search.title}</Label>
        <p className="mt-1 text-[13px] text-t2">
          {view.phases.find((p) => p.id === "search")?.result ?? copy.searched(view.searchTerms)}
        </p>
      </section>
    ) : null;

  if (ready)
    return (
      <>
        {chosen}
        {searched}
        {scored && run.candidates ? (
          <details className="group border-t border-line pt-4">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-[13px] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-3.5 text-t3 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
              {copy.scored(run.candidates.length)}
            </summary>
            <div className="mt-4">{scored}</div>
          </details>
        ) : null}
      </>
    );

  return (
    <>
      {gathered}
      {jev !== "waiting" ? (
        <section aria-label={copy.phases.jev.title}>
          <div className="flex items-center gap-4">
            <Label running={jev === "running"}>{copy.phases.jev.title}</Label>
            {jev === "running" ? <Activity /> : null}
          </div>
          {scored ? <div className="mt-3">{scored}</div> : null}
        </section>
      ) : null}
      {chosen}
      {searched}
    </>
  );
}

/** The one sign of Jev's single request: an amber line that moves without a count, since nothing is counted. */
function Activity() {
  const reduce = useReducedMotion();
  return (
    <span
      role="status"
      className="relative block h-1.5 w-40 overflow-hidden rounded-full bg-line-strong"
    >
      <span className="sr-only">{copy.scoring}</span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--caution)]"
        initial={{ x: "-100%" }}
        animate={reduce ? { x: "100%" } : { x: ["-100%", "300%"] }}
        transition={
          reduce ? { duration: 0 } : { duration: 1.6, ease: "easeInOut", repeat: Infinity }
        }
      />
    </span>
  );
}

/** A candidate's kind as its chip: blue Post for an account, teal Article for a site or feed, GitHub's mark. */
function CandidateKind({ kind }: { kind: OnboardingCandidate["kind"] }) {
  if (kind === "x") return <KindChip kind="post">{monitorContent.kinds.post}</KindChip>;
  if (kind === "github") return <KindChip kind="github" />;
  return <KindChip kind="article">{monitorContent.kinds.article}</KindChip>;
}

function BandBlock({ band, list }: { band: Band; list: OnboardingCandidate[] }) {
  if (!list.length) return null;
  const shown = band === "aside" ? list.slice(0, ASIDE_SHOWN) : list;
  const hidden = list.length - shown.length;
  return (
    <section>
      <p className="flex items-baseline gap-2">
        <span className={cn("text-[13px] font-semibold", bandTone[band])}>{copy.bands[band]}</span>
        <span className="text-[12px] text-t3 tabular-nums">{list.length}</span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <li
            key={c.key}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full border py-1 pr-1.5 pl-1.5 text-[12.5px]",
              band === "aside"
                ? "border-dashed border-line text-t3"
                : "border-line-strong bg-[var(--window)] text-t1 shadow-[var(--top-light)]",
            )}
          >
            <SourceMark
              kind={c.kind === "x" ? "x" : c.kind === "github" ? "github" : "site"}
              mark={c.mark}
              size={20}
              className={band === "aside" ? "opacity-60 grayscale" : undefined}
            />
            <span className="whitespace-nowrap">{c.name}</span>
            <CandidateKind kind={c.kind} />
          </li>
        ))}
        {hidden > 0 ? (
          <li className="flex h-8 items-center rounded-full border border-dashed border-line px-3 text-[12.5px] text-t3 tabular-nums">
            {copy.more(hidden)}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** The chosen sources under Twitter accounts, RSS feeds and websites; a pill opens its reason under its kind. */
function Chosen({ list }: { list: OnboardingSource[] }) {
  const [why, setWhy] = useState<string | null>(null);
  const groups = (["x", "rss", "website"] as const)
    .map((kind) => ({ kind, list: list.filter((s) => s.kind === kind) }))
    .filter((group) => group.list.length);
  return (
    <div className="mt-3 grid gap-4">
      {groups.map(({ kind, list: rows }) => {
        const open = rows.find((s) => s.key === why);
        return (
          <section key={kind} aria-label={copy.groups[kind]}>
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase">
              <GroupGlyph kind={kind} className="size-3" />
              {copy.groups[kind]}
            </p>
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
            {open ? (
              <p className="mt-2 text-[13px] leading-[1.5] text-t2">
                <span className="font-medium text-t1">{open.name}</span> {open.why}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** A chosen source: the logo, the name and the handle or address. */
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
            ? "border-[var(--brand-line)] bg-raised"
            : "border-line-strong bg-[var(--window)] hover:bg-raised",
        )}
      >
        <SourceMark kind={x ? "x" : "site"} mark={source.address} size={20} />
        <span className="font-medium whitespace-nowrap text-t1">{source.name}</span>
        {source.name !== source.address ? (
          <span className="whitespace-nowrap text-t3">{source.address}</span>
        ) : null}
      </button>
    </li>
  );
}
