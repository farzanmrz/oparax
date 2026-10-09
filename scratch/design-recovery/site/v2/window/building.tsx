"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Pin, RotateCcw, TriangleAlert } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle } from "@/components/ai-elements/plan";
import { Skeleton } from "@/components/ui/skeleton";
import { StepMark } from "@/next/building/step-mark";
import {
  announce,
  isDone,
  stepDoes,
  stepIds,
  stepLabel,
  stepLine,
  stepTitle,
  useFollow,
  useRun,
  type Run,
  type RunMode,
  type StepId,
  type StepState,
} from "@/next/building/steps";
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
import { cn } from "@/lib/utils";
import { XLogo } from "@/pro/shared/brand";
import { AppFrame, BASE, Label, PrimaryButton, TopBar } from "./chrome";
import { beat, brief, droppedSample, HANDLE, kept, posts, postsRead, profile } from "./data";
import { EASE } from "./live";
import { SiteIcon, XAvatar } from "./marks";

// Window building, v2. The page is the window: the product's seven steps of the onboarding run in a rail on the left, the
// work itself in the middle, every step in order and staying on the page once it has finished (the profile, the
// posts, the candidates, Jev's bands, the chosen sources with the reason each was picked), and the brief open on
// the right. Jev returns only a probability, so candidates show as Strong match, Possible match or Set aside, and
// the sentence under a chosen source is labelled as the reason it was picked, never as Jev's reasoning. A replay of
// the recorded sample run, said once in the app bar.

export type { RunMode };

const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));

const kindOf = (c: Candidate) => (c.kind === "x_account" ? "Twitter" : c.kind === "rss" ? "RSS" : "Web");
const kindWordOf = (c: Candidate) => (c.kind === "x_account" ? "Twitter account" : c.kind === "rss" ? "RSS feed" : "Website");

function CandMark({ c, size = 18 }: { c: Candidate; size?: number }) {
  if (c.kind === "x_account") return <XAvatar handle={c.target.replace("https://x.com/", "")} size={size} />;
  return <SiteIcon host={new URL(c.target).hostname.replace(/^www\./, "")} size={size} />;
}

function KindTag({ c }: { c: Candidate }) {
  const x = c.kind === "x_account";
  return (
    <span
      className={cn(
        "inline-flex h-[20px] items-center gap-1 rounded-full px-2 text-[11px] font-medium",
        x ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
      )}
    >
      {x ? <XLogo className="size-2.5" /> : null}
      {kindWordOf(c)}
    </span>
  );
}

export function Building({ mode }: { mode: RunMode }) {
  const [replay, setReplay] = useState(0);
  const run = useRun(mode, replay);
  const complete = isDone(run);
  useFollow(run, mode.kind !== "failed");
  const failed = mode.kind === "failed";
  const settled = run.states.filter((s) => s === "done" || s === "skipped").length;
  return (
    <div className="palette-council flex min-h-svh flex-col">
      <AppFrame
        bar={<TopBar badge={false} note="Replay of a sample run." />}
        grid
        className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_340px]"
        heading={
          <>
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Building Your Agent</h1>
            <p className="mt-3 max-w-[760px] text-[15px] leading-[1.5] text-t2">
              <span className="text-t3">For @{HANDLE}, following </span>“{beat}”
            </p>
          </>
        }
        side={
          <>
            {complete ? (
              <>
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--ok)]">
                  <StepMark state="done" size={16} /> Your agent is saved
                </span>
                <PrimaryButton href={`${BASE}/ready`}>See what it chose</PrimaryButton>
              </>
            ) : (
              <>
                <span className="flex gap-1" aria-hidden="true">
                  {run.states.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 w-6 rounded-full",
                        s === "done" ? "bg-[var(--ok)]" : s === "skipped" ? "bg-t3/60" : s === "running" ? "bg-[var(--caution)]" : s === "failed" ? "bg-[var(--error)]" : "bg-line-strong",
                      )}
                    />
                  ))}
                </span>
                <span className="text-[13px] tabular-nums text-t2">
                  {settled} of {run.states.length} done
                </span>
              </>
            )}
            {mode.kind === "replay" && complete ? (
              <button type="button" onClick={() => setReplay((n) => n + 1)} className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] text-t2 hover:text-t1">
                <RotateCcw className="size-3.5" /> Replay
              </button>
            ) : null}
          </>
        }
      >
        <Steps run={run} />
        <section aria-label="The agent's work" className="min-w-0 border-r border-line">
          <p className="sr-only" aria-live="polite">
            {announce(run)}
          </p>
          {failed ? <Failure /> : null}
          {stepIds.map((id, i) => {
            const state = run.states[i];
            if (state === "waiting") return null;
            return (
              <Section key={id} id={id} index={i} state={state}>
                <Evidence id={id} run={run} state={state} progress={run.progress[i]} />
              </Section>
            );
          })}
        </section>
        <BriefPane run={run} />
      </AppFrame>
    </div>
  );
}

function Steps({ run }: { run: Run }) {
  return (
    <aside aria-label="Steps" className="border-r border-line bg-[var(--rail)]">
      <div className="sticky top-0 px-4 pt-5 pb-6">
        <Label className="px-1">Steps</Label>
        <ol className="mt-3">
          {stepIds.map((id, i) => {
            const state = run.states[i];
            const last = i === stepIds.length - 1;
            return (
              <li key={id} className="relative grid grid-cols-[24px_1fr] gap-x-3 pb-4">
                {!last ? <span aria-hidden="true" className={cn("absolute top-7 bottom-1 left-[11.5px] w-px", state === "done" ? "bg-[var(--ok)]/50" : "bg-line-strong")} /> : null}
                <span className="relative z-10 grid size-6 place-items-center rounded-full bg-[var(--rail)]">
                  <StepMark state={state} size={20} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-[13px] leading-snug", state === "waiting" ? "text-t3" : "font-medium text-t1")}>
                    {state === "running" ? (
                      <Shimmer as="span" duration={1.8} className="font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                        {stepTitle[id]}
                      </Shimmer>
                    ) : state === "waiting" ? (
                      stepTitle[id]
                    ) : (
                      <a href={`#step-${id}`} className="hover:underline">
                        {stepTitle[id]}
                      </a>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-t3">{stepDoes[id]}</p>
                  {state === "waiting" ? null : (
                    <p className={cn("mt-0.5 text-[12px]", state === "failed" ? "text-[var(--error)]" : state === "running" ? "text-[var(--caution)]" : "text-t3")}>{stepLabel[state]}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

function Failure() {
  return (
    <div role="alert" className="m-6 flex items-start gap-3 rounded-lg border border-[var(--error)]/40 bg-[var(--error-soft)] px-4 py-3">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--error)]" aria-hidden="true" />
      <div>
        <p className="text-[13.5px] text-t1">Building stopped at: {stepTitle.posts}. Preparation could not finish. Your free week has not started.</p>
        <button type="button" className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] text-t1">
          <RotateCcw className="size-3.5" /> Try again
        </button>
      </div>
    </div>
  );
}

/** One step in the middle: its mark and title, the line it ends with, then its evidence. It stays once finished. */
function Section({ id, index, state, children }: { id: StepId; index: number; state: StepState; children: React.ReactNode }) {
  return (
    <motion.section
      id={`step-${id}`}
      aria-label={stepTitle[id]}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="scroll-mt-4 border-b border-line px-7 py-6 last:border-b-0"
    >
      <header className="flex items-center gap-3">
        <StepMark state={state} size={20} />
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-t3">{index + 1}</span>
        <h2 className="text-[15px] font-semibold text-t1">
          {state === "running" ? (
            <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
              {stepTitle[id]}
            </Shimmer>
          ) : (
            stepTitle[id]
          )}
        </h2>
        <span className={cn("ml-auto text-[12px]", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{stepLabel[state]}</span>
      </header>
      {state === "done" || state === "skipped" ? <p className="mt-1.5 pl-[52px] text-[13.5px] text-t2">{stepLine[id]}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </motion.section>
  );
}

function Evidence({ id, run, state, progress }: { id: StepId; run: Run; state: StepState; progress: number }) {
  const running = state === "running";
  const chooseState = run.states[stepIds.indexOf("choose")];
  switch (id) {
    case "profile":
      return running ? <ProfileRunning /> : <ProfileCard />;
    case "posts":
      return <PostsGrid running={running} progress={progress} failed={state === "failed"} />;
    case "gather":
      return <Gather />;
    case "jev":
      return <Bands running={running} progress={progress} chosen={chooseState === "done" || chooseState === "running"} />;
    case "choose":
      return <Chosen running={running} progress={progress} />;
    case "search":
      return <p className="pl-[52px] text-[12.5px] text-t3">{keptAccounts} Twitter accounts already passed the check, so there was nothing to look for.</p>;
    default:
      return null;
  }
}

function ProfileRunning() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-11 rounded-full bg-[var(--raised)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40 bg-[var(--raised)]" />
        <Skeleton className="h-3 w-72 bg-[var(--raised)]" />
      </div>
    </div>
  );
}

function ProfileCard() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
      <div className="rounded-lg border border-line bg-[var(--raised)] p-3.5 shadow-[var(--top-light)]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">{profile.name[0]}</span>
          <div className="min-w-0 leading-tight">
            <p className="text-[14px] font-semibold text-t1">{profile.name}</p>
            <p className="text-[12.5px] text-[var(--kind-post)]">{profile.handle}</p>
          </div>
          <XLogo className="ml-auto size-3.5 text-[var(--kind-post)]" />
        </div>
        <p className="mt-3 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
      </div>
      <div className="rounded-lg border border-line bg-[var(--raised)] p-3.5 shadow-[var(--top-light)]">
        <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
          <Pin className="size-3" aria-hidden="true" /> Pinned post
          <span className="ml-auto tabular-nums">{day(profile.pinned.date)}</span>
        </p>
        <p className="mt-2 text-[13px] leading-[1.5] text-t1">{profile.pinned.text}</p>
      </div>
    </div>
  );
}

function PostsGrid({ running, progress, failed }: { running: boolean; progress: number; failed: boolean }) {
  if (failed) return <p className="pl-[52px] text-[12.5px] text-t3">Twitter did not return the posts in time.</p>;
  const shown = running ? take(posts, progress) : posts;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2.5">
        {shown.map((p) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="rounded-lg border border-line bg-[var(--raised)] p-3 shadow-[var(--top-light)]"
          >
            <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
              <XLogo className="size-2.5 text-[var(--kind-post)]" />
              {p.kind === "quote" ? "Quote" : p.kind === "thread" ? `Thread, ${p.parts} parts` : "Post"}
              <span className="ml-auto tabular-nums">{day(p.date)}</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] whitespace-pre-line text-t1">{p.text}</p>
            {p.quoted ? (
              <p className="mt-2 rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
                <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
              </p>
            ) : null}
          </motion.li>
        ))}
      </ul>
      {!running ? (
        <p className="mt-2.5 text-[12px] text-t3">
          The other {postsRead - posts.length} of the {postsRead} have no stored text in this sample.
        </p>
      ) : null}
    </>
  );
}

function Gather() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2.5">
      <div className="rounded-lg border border-line bg-[var(--raised)] p-3.5 shadow-[var(--top-light)]">
        <p className="text-[26px] leading-none font-semibold tabular-nums text-t1">{tableRows}</p>
        <p className="mt-1.5 text-[12.5px] text-t2">from the source list</p>
      </div>
      <div className="rounded-lg border border-line bg-[var(--raised)] p-3.5 shadow-[var(--top-light)]">
        <p className="text-[26px] leading-none font-semibold tabular-nums text-t1">{quotedCandidates.length}</p>
        <p className="mt-1.5 text-[12.5px] text-t2">accounts you quoted</p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {quotedCandidates.map((c) => (
            <li key={c.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-[var(--well)] pr-2.5 pl-1 text-[12.5px] text-t1">
              <CandMark c={c} />
              {c.name}
            </li>
          ))}
        </ul>
      </div>
      <p className="col-span-2 text-[12px] text-t3">
        {candidateCount} candidates in all. Being quoted does not qualify an account on its own.
      </p>
    </div>
  );
}

const bandStyle: Record<Band, string> = {
  strong: "text-[var(--ok)]",
  possible: "text-t2",
  "set-aside": "text-t3",
};

function BandBlock({ band, list, total, chosen, dim = false, note }: { band: Band; list: Candidate[]; total: number; chosen: boolean; dim?: boolean; note?: string }) {
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-baseline gap-2">
        <span className={cn("text-[13px] font-semibold", bandStyle[band])}>{bandLabel[band]}</span>
        <span className="text-[12.5px] tabular-nums text-t3">{total}</span>
        {note ? <span className="text-[12px] text-t3">{note}</span> : null}
      </p>
      <ul className="grid grid-cols-3 gap-1.5">
        {list.map((c) => {
          const isChosen = chosen && chosenIdSet.has(c.id);
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: EASE }}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md border pr-2 pl-1.5 text-[12.5px]",
                dim ? "border-dashed border-line-strong text-t3" : "border-line bg-[var(--raised)] text-t1 shadow-[var(--top-light)]",
                isChosen && "border-[var(--brand-line)] bg-[var(--brand-soft)]",
              )}
            >
              <span className={cn(dim && "opacity-60 grayscale")}>
                <CandMark c={c} />
              </span>
              <span className="min-w-0 truncate">{c.name}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3">{kindOf(c)}</span>
                {isChosen ? <Check className="size-3.5 text-[var(--brand)]" aria-label="Chosen" /> : null}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/** Jev's three bands, staying on the page after the step ends. A check marks the ones chosen in the next step. */
function Bands({ running, progress, chosen }: { running: boolean; progress: number; chosen: boolean }) {
  const f = running ? progress : 1;
  const strong = take(strongCandidates, f);
  const possible = take(possibleCandidates, f);
  const aside = take(droppedSample, f);
  const checked = running ? Math.round(progress * candidateCount) : candidateCount;
  return (
    <div className="space-y-5">
      {running ? (
        <div>
          <p className="mb-1.5 text-[12.5px] tabular-nums text-t2">
            Checked {checked} of {candidateCount}
          </p>
          <span className="block h-1.5 rounded-full bg-line-strong" aria-hidden="true">
            <span className="block h-full rounded-full bg-[var(--caution)] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </span>
        </div>
      ) : null}
      <BandBlock band="strong" list={strong} total={running ? strong.length : strongCandidates.length} chosen={chosen} />
      <BandBlock band="possible" list={possible} total={running ? possible.length : possibleCandidates.length} chosen={chosen} />
      <BandBlock
        band="set-aside"
        list={aside}
        total={running ? aside.length : setAsideCount}
        chosen={false}
        dim
        note={running ? undefined : `${droppedSample.length} recorded by name, ${setAsideCount - droppedSample.length} more not shown`}
      />
    </div>
  );
}

function ChosenCard({ c, why }: { c: Candidate; why: string }) {
  const band = bandOf(c.score);
  return (
    <motion.li initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, ease: EASE }} className="px-3 py-2.5">
      <span className="flex items-center gap-2">
        <CandMark c={c} size={18} />
        <span className="text-[13px] font-medium text-t1">{c.name}</span>
        <span className="truncate text-[12px] text-t3">{c.kind === "x_account" ? c.target.replace("https://x.com/", "@").toLowerCase() : new URL(c.target).hostname.replace(/^www\./, "")}</span>
        <span className={cn("ml-auto shrink-0 text-[11.5px]", bandStyle[band])}>{bandLabel[band]}</span>
      </span>
      <span className="mt-1 block pl-[26px] text-[12.5px] leading-snug text-t2">{why}</span>
    </motion.li>
  );
}

function Chosen({ running, progress }: { running: boolean; progress: number }) {
  const accounts = running ? take(chosenAccounts, progress) : chosenAccounts;
  const sites = running ? take(chosenSites, progress) : chosenSites;
  const notChosen = kept.length - chosenIdSet.size;
  const notChosenStrong = strongCandidates.filter((c) => !chosenIdSet.has(c.id)).length;
  const col = (title: string, total: number, list: (Candidate & { why: string })[]) => (
    <div className="rounded-lg border border-line bg-[var(--raised)] shadow-[var(--top-light)]">
      <p className="flex items-baseline gap-2 border-b border-line-soft px-3 py-2">
        <span className="text-[13px] font-semibold text-t1">{title}</span>
        <span className="text-[12.5px] tabular-nums text-t3">{total}</span>
        <span className="ml-auto font-mono text-[10px] tracking-[0.1em] text-t3">WHY IT WAS PICKED</span>
      </p>
      <ul className="divide-y divide-[var(--line-soft)]">
        {list.map((c) => (
          <ChosenCard key={c.id} c={c} why={c.why} />
        ))}
      </ul>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 items-start gap-2.5">
        {col("Twitter accounts", chosenAccounts.length, accounts)}
        {col("Sites and feeds", chosenSites.length, sites)}
      </div>
      {!running ? (
        <p className="mt-2.5 text-[12px] text-t3">
          {notChosen} matches were not chosen, {notChosenStrong} of them strong. They show without a check above.
        </p>
      ) : null}
    </>
  );
}

function BriefPane({ run }: { run: Run }) {
  const i = stepIds.indexOf("choose");
  const state = run.states[i];
  const streaming = state === "running";
  const ready = state === "done";
  const words = brief.summary.split(" ");
  const text = streaming ? words.slice(0, Math.max(1, Math.ceil(run.progress[i] * words.length))).join(" ") : brief.summary;
  return (
    <aside aria-label="Your brief" className="bg-[var(--rail)]">
      <div className="sticky top-0 px-5 pt-5 pb-6">
        <Label>Your brief</Label>
        {state === "waiting" || state === "failed" ? (
          <div className="mt-3 space-y-2 rounded-xl border border-dashed border-line-strong p-4">
            <p className="text-[13px] text-t3">Written with the sources in step 5.</p>
            <Skeleton className="h-3 w-full bg-[var(--raised)]" />
            <Skeleton className="h-3 w-5/6 bg-[var(--raised)]" />
            <Skeleton className="h-3 w-2/3 bg-[var(--raised)]" />
          </div>
        ) : (
          <Plan isStreaming={streaming} defaultOpen className="mt-3 gap-3 rounded-xl border border-line-strong bg-[var(--window)] py-4 shadow-[var(--card-shadow)] ring-0">
            <PlanHeader className="px-4">
              <div className="space-y-1.5">
                <PlanTitle className="text-[13.5px] font-semibold text-t1">{`About ${profile.name.split(" ")[0]}`}</PlanTitle>
                <PlanDescription className="text-[13px] leading-[1.55] text-t2">{text}</PlanDescription>
              </div>
            </PlanHeader>
            {ready ? (
              <PlanContent className="space-y-3 px-4 text-[12.5px]">
                <div>
                  <p className="mb-1.5 text-t3">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.interests.map((t) => (
                      <span key={t} className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-t3">
                  Language <span className="ml-1 text-t1">{brief.languages.join(", ")}</span>
                </p>
              </PlanContent>
            ) : null}
          </Plan>
        )}
      </div>
    </aside>
  );
}

