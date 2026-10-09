"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Pin, RotateCcw } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StepMark } from "@/next/building/step-mark";
import { modeFromParams } from "@/next/building/mode";
import { announce, isDone, stepDoes, stepIds, stepLabel, stepLine, stepTitle, useFollow, useRun, type Run, type StepId, type StepState } from "@/next/building/steps";
import {
  bandLabel,
  bandOf,
  candidateCount,
  chosenAccounts,
  chosenIdSet,
  chosenSites,
  keptAccounts,
  possibleCandidates,
  quotedCandidates,
  setAsideCount,
  strongCandidates,
  tableRows,
  type Band,
  type Candidate,
} from "@/next/data/onboarding";
import { XLogo } from "@/pro/shared/brand";
import { building } from "@/next/copy";
import { cn } from "@/lib/utils";
import { beat, brief, droppedSample, HANDLE, hostOf, posts, postsRead, profile } from "./data";
import { Lifted, Masthead, Page, PrimaryLink } from "./chrome";
import { EASE, LiveLine } from "./live";
import { SiteIcon, XAvatar } from "./marks";

// Newsroom building: the agent at work as one full-width lifted table. Every step is a group row in order and
// stays on the page: the profile and posts as full-width rows, then one row per source with the kind, Jev's band,
// whether it was chosen and the reason it was picked, then the skipped search, the brief and the save. Jev
// returns only a probability, so the column reads Strong match, Possible match or Set aside, never a number, and
// the sentence in a row is the reason the source was picked, not Jev's reasoning. A replay of the recorded sample
// run, said once under the masthead.

const COLS = 5;
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const kindName = { x_account: "Twitter account", rss: "RSS feed", website: "Website" } as const;
const chosenOrder = [...chosenSites, ...chosenAccounts];
const whyById = new Map(chosenOrder.map((c) => [c.id, c.why]));

function CandidateMark({ c }: { c: Candidate }) {
  return c.kind === "x_account" ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={20} /> : <SiteIcon host={hostOf(c.target)} size={20} />;
}

export function Building({ theme, at, failed: failedParam = false }: { theme?: string; at?: string; failed?: boolean }) {
  // Try again restarts the sample replay from the first step.
  const [retried, setRetried] = useState(false);
  const mode = failedParam && !retried ? modeFromParams(at, "failed") : retried ? ({ kind: "replay" } as const) : modeFromParams(at);
  const run = useRun(mode);
  const failed = mode.kind === "failed";
  useFollow(run, mode.kind !== "failed");
  const complete = isDone(run);
  const q = theme ? `?theme=${theme}` : "";
  return (
    <Page>
      <Masthead title={building.title} badge={false} note="Replay of a sample run." />
      <main className="px-4 pt-4 pb-14 lg:px-7">
        <div className="flex items-center justify-between gap-6">
          <p className="min-w-0 text-[13.5px] text-t3">
            For @{HANDLE}, following <span className="text-t1">“{beat}”</span>
          </p>
          {complete ? <PrimaryLink href={`/v2/newsroom/ready${q}`}>See what your agent chose</PrimaryLink> : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {announce(run)}
        </p>
        <Lifted strong className="mt-5 rounded-[14px]">
          <LiveRow run={run} failed={failed} />
          <Table className="table-fixed text-[13px]">
            <colgroup>
              <col className="w-[290px]" />
              <col className="w-[120px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow
                className="h-10 border-b border-line hover:bg-transparent"
                style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
              >
                {["SOURCE", "KIND", "JEV", "CHOSEN", "WHY IT WAS PICKED"].map((h) => (
                  <TableHead key={h} className="h-10 px-4 font-mono text-[10.5px] font-normal tracking-[0.08em] text-t3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stepIds.map((id, i) => {
                const state = run.states[i];
                if (state === "waiting") return null;
                return <StepRows key={id} id={id} index={i} state={state} run={run} progress={run.progress[i]} onRetry={() => setRetried(true)} />;
              })}
            </TableBody>
          </Table>
        </Lifted>
      </main>
    </Page>
  );
}

function LiveRow({ run, failed }: { run: Run; failed: boolean }) {
  const complete = isDone(run);
  const cur = run.states.findIndex((s) => s === "running");
  if (failed)
    return (
      <div className="flex h-11 items-center gap-3 border-b border-line bg-[var(--error-soft)] px-4">
        <span className="font-mono text-[10.5px] tracking-[0.08em] text-[var(--error)]">STOPPED</span>
        <span className="text-[13px] text-t1">Twitter did not return the posts in time.</span>
      </div>
    );
  return (
    <div className={cn("flex h-11 items-center gap-4 border-b border-line px-4", complete ? "bg-[var(--ok-soft)]" : "bg-[var(--caution-soft)]/60")}>
      <span className={cn("w-10 font-mono text-[10.5px] tracking-[0.08em]", complete ? "text-[var(--ok)]" : "text-[var(--caution)]")}>{complete ? "DONE" : "LIVE"}</span>
      {complete ? (
        <span className="flex items-center gap-2.5 text-[13px] font-medium text-t1">
          <StepMark state="done" size={15} />
          {stepLine.save}
        </span>
      ) : (
        <LiveLine label={cur >= 0 ? stepTitle[stepIds[cur]] : ""} />
      )}
    </div>
  );
}

/** A step's group row, then the rows that belong to it. */
function StepRows({ id, index, state, run, progress, onRetry }: { id: StepId; index: number; state: StepState; run: Run; progress: number; onRetry: () => void }) {
  const running = state === "running";
  return (
    <>
      <TableRow id={`step-${id}`} className="scroll-mt-4 border-y border-line bg-[var(--raised)]/70 hover:bg-[var(--raised)]/70">
        <TableCell colSpan={COLS} className="px-4 py-3 whitespace-normal">
          <span className="flex items-center gap-3">
            <StepMark state={state} size={20} />
            <span className="font-mono text-[10.5px] tracking-[0.08em] text-t3">{index + 1}</span>
            {running ? (
              <Shimmer as="span" duration={1.8} className="text-[14px] font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                {stepTitle[id]}
              </Shimmer>
            ) : (
              <span className="text-[14px] font-semibold text-t1">{stepTitle[id]}</span>
            )}
            {state === "done" || state === "skipped" ? <span className="text-[13px] text-t2">{stepLine[id]}</span> : null}
            <span className={cn("ml-auto text-[12px]", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{stepLabel[state]}</span>
          </span>
          <span className="mt-1 block pl-[51px] text-[12.5px] text-t3">{stepDoes[id]}</span>
        </TableCell>
      </TableRow>
      <Body id={id} run={run} state={state} progress={progress} onRetry={onRetry} />
    </>
  );
}

function Full({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableRow className="border-b border-line-soft hover:bg-transparent">
      <TableCell colSpan={COLS} className={cn("px-4 py-4 whitespace-normal", className)}>
        {children}
      </TableCell>
    </TableRow>
  );
}

function Body({ id, run, state, progress, onRetry }: { id: StepId; run: Run; state: StepState; progress: number; onRetry: () => void }) {
  const running = state === "running";
  const chooseIndex = stepIds.indexOf("choose");
  const chooseState = run.states[chooseIndex];
  const chooseProgress = chooseState === "done" ? 1 : chooseState === "running" ? run.progress[chooseIndex] : 0;
  switch (id) {
    case "profile":
      return (
        <Full>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-[var(--well)] p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">{profile.name[0]}</span>
                <p className="leading-tight">
                  <span className="block text-[14px] font-semibold text-t1">{running ? "Looking up your account" : profile.name}</span>
                  <span className="block text-[12.5px] text-[var(--kind-post)]">{running ? `@${HANDLE}` : profile.handle}</span>
                </p>
                <XLogo className="ml-auto size-3.5 text-[var(--kind-post)]" />
              </div>
              {running ? null : <p className="mt-3 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>}
            </div>
            {running ? null : (
              <div className="rounded-lg border border-line bg-[var(--well)] p-3.5">
                <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                  <Pin className="size-3" aria-hidden="true" /> PINNED POST
                  <span className="ml-auto">{day(profile.pinned.date).toUpperCase()}</span>
                </p>
                <p className="mt-2 text-[13px] leading-[1.5] text-t1">{profile.pinned.text}</p>
              </div>
            )}
          </div>
        </Full>
      );
    case "posts": {
      if (state === "failed")
        return (
          <Full>
            <p className="text-[14px] text-t1">{building.failed(stepTitle.posts)}</p>
            <button type="button" onClick={onRetry} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-line-strong px-3.5 text-[13.5px] text-t1 hover:bg-raised">
              <RotateCcw className="size-3.5" /> {building.retry}
            </button>
          </Full>
        );
      const shown = running ? take(posts, progress) : posts;
      return (
        <Full>
          <ul className="grid grid-cols-3 gap-3">
            {shown.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="rounded-lg border border-line bg-[var(--well)] p-3"
              >
                <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                  <XLogo className="size-2.5 text-[var(--kind-post)]" />
                  {p.kind === "quote" ? "QUOTE" : p.kind === "thread" ? `THREAD, ${p.parts} PARTS` : "POST"}
                  <span className="ml-auto">{day(p.date).toUpperCase()}</span>
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5] whitespace-pre-line text-t1">{p.text}</p>
                {p.quoted ? (
                  <p className="mt-2 rounded-md border border-line bg-[var(--window)] px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
                    <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
                  </p>
                ) : null}
              </motion.li>
            ))}
          </ul>
          {running ? null : (
            <p className="mt-2.5 text-[12px] text-t3">
              The other {postsRead - posts.length} of the {postsRead} have no stored text in this sample.
            </p>
          )}
        </Full>
      );
    }
    case "gather":
      return (
        <Full>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="flex items-baseline gap-2.5">
              <span className="text-[26px] leading-none font-semibold tabular-nums text-t1">{tableRows}</span>
              <span className="text-[13px] text-t2">from the source list</span>
            </p>
            <p className="flex items-center gap-3">
              <span className="flex items-baseline gap-2.5">
                <span className="text-[26px] leading-none font-semibold tabular-nums text-t1">{quotedCandidates.length}</span>
                <span className="text-[13px] text-t2">accounts you quoted</span>
              </span>
              <span className="flex gap-1.5">
                {quotedCandidates.map((c) => (
                  <span key={c.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-[var(--well)] pr-2.5 pl-1 text-[12.5px] text-t1">
                    <CandidateMark c={c} />
                    {c.name}
                  </span>
                ))}
              </span>
            </p>
            <p className="text-[12px] text-t3">
              {candidateCount} candidates in all. Being quoted does not qualify an account on its own.
            </p>
          </div>
        </Full>
      );
    case "jev": {
      const f = running ? progress : 1;
      const lists: { band: Band; list: Candidate[]; total: number; note?: string }[] = [
        { band: "strong", list: take(strongCandidates, f), total: running ? take(strongCandidates, f).length : strongCandidates.length },
        { band: "possible", list: take(possibleCandidates, f), total: running ? take(possibleCandidates, f).length : possibleCandidates.length },
        {
          band: "set-aside",
          list: take(droppedSample, f),
          total: running ? take(droppedSample, f).length : setAsideCount,
          note: running ? undefined : `${droppedSample.length} recorded by name, ${setAsideCount - droppedSample.length} more not shown`,
        },
      ];
      const reveal = chooseProgress > 0 ? Math.ceil(chooseProgress * chosenOrder.length) : 0;
      const lit = new Set(chosenOrder.slice(0, reveal).map((c) => c.id));
      return (
        <>
          {running ? (
            <TableRow className="border-b border-line-soft hover:bg-transparent">
              <TableCell colSpan={COLS} className="px-4 py-2.5 text-[12.5px] tabular-nums text-t2">
                Checked {Math.round(progress * candidateCount)} of {candidateCount}
              </TableCell>
            </TableRow>
          ) : null}
          {lists.map(({ band, list, total, note }) =>
            list.length === 0 ? null : (
              <BandRows key={band} band={band} list={list} total={total} note={note} lit={lit} done={chooseState === "done"} started={chooseProgress > 0} />
            ),
          )}
        </>
      );
    }
    case "search":
      return (
        <Full className="py-2.5">
          <p className="text-[12.5px] text-t3">{keptAccounts} Twitter accounts already passed the check, so there was nothing to look for.</p>
        </Full>
      );
    case "choose": {
      const words = brief.summary.split(" ");
      const text = running ? words.slice(0, Math.max(1, Math.ceil(progress * words.length))).join(" ") : brief.summary;
      return (
        <Full>
          <p className="max-w-[900px] text-[14px] leading-[1.6] text-t1">
            {text}
            {running ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" /> : null}
          </p>
          {running ? null : (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] text-t3">Interests</span>
              {brief.interests.map((x) => (
                <span key={x} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-t2">
                  {x}
                </span>
              ))}
              <span className="mr-1 ml-4 text-[12px] text-t3">Language</span>
              <span className="rounded-md border border-line px-2 py-0.5 text-[12px] text-t2">{brief.languages.join(", ")}</span>
            </div>
          )}
        </Full>
      );
    }
    default:
      return null;
  }
}

const bandPill: Record<Band, string> = {
  strong: "bg-[var(--ok-soft)] text-[var(--ok)] font-medium",
  possible: "border border-line-strong text-t2",
  "set-aside": "text-t3",
};

function BandRows({ band, list, total, note, lit, done, started }: { band: Band; list: Candidate[]; total: number; note?: string; lit: Set<string>; done: boolean; started: boolean }) {
  return (
    <>
      <TableRow className="border-b border-line-soft bg-[var(--well)]/60 hover:bg-[var(--well)]/60">
        <TableCell colSpan={COLS} className="px-4 py-1.5 whitespace-normal">
          <span className="flex items-baseline gap-2 font-mono text-[10.5px] tracking-[0.08em] text-t3">
            {bandLabel[band].toUpperCase()}
            <span className="tabular-nums">{total}</span>
            {note ? <span className="tracking-normal">{note}</span> : null}
          </span>
        </TableCell>
      </TableRow>
      {list.map((c) => {
        const picked = chosenIdSet.has(c.id);
        const isLit = picked && lit.has(c.id);
        const dim = band === "set-aside";
        const x = c.kind === "x_account";
        return (
          <TableRow key={c.id} className={cn("border-b border-line-soft align-top", isLit && "bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]")}>
            <TableCell className="px-4 py-2.5">
              <span className="flex items-center gap-2.5">
                <span className={cn(dim && "opacity-60 grayscale")}>
                  <CandidateMark c={c} />
                </span>
                <span className={cn("truncate font-medium", dim ? "text-t3" : "text-t1")}>{c.name}</span>
                {c.quoted ? <span className="shrink-0 text-[11.5px] text-[var(--kind-post)]">quoted by you</span> : null}
              </span>
            </TableCell>
            <TableCell className="px-4 py-2.5">
              <span
                className={cn(
                  "inline-flex h-[20px] items-center gap-1 rounded-full px-2 text-[11px] font-medium",
                  x ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
                  dim && "opacity-60",
                )}
              >
                {x ? <XLogo className="size-2.5" /> : null}
                {kindName[c.kind]}
              </span>
            </TableCell>
            <TableCell className="px-4 py-2.5">
              <span className={cn("inline-flex h-[20px] items-center rounded-full px-2 text-[11.5px]", bandPill[bandOf(c.score)])}>{bandLabel[bandOf(c.score)]}</span>
            </TableCell>
            <TableCell className="px-4 py-2.5">
              {dim || !started ? null : isLit ? (
                <span className="inline-flex h-[20px] items-center rounded-full bg-[var(--brand-soft)] px-2 text-[11.5px] font-medium text-[var(--brand)] shadow-[inset_0_0_0_1px_var(--brand-line)]">Chosen</span>
              ) : done ? (
                <span className="text-[12px] text-t3">Not chosen</span>
              ) : null}
            </TableCell>
            <TableCell className="px-4 py-2.5 text-[12.5px] leading-[1.45] whitespace-normal text-t2">{isLit ? whyById.get(c.id) : null}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

