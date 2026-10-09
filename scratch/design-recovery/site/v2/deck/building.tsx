"use client";

import { useState } from "react";
import { Check, Pin, Quote as QuoteMark, RotateCcw } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
  type StepId,
  type StepState,
} from "@/next/building/steps";
import type { RunMode } from "@/next/building/mode";
import {
  bandLabel,
  bandOf,
  brief,
  candidateCount,
  chosenAccounts,
  chosenIdSet,
  chosenSites,
  droppedSample,
  kept,
  keptAccounts,
  possibleCandidates,
  posts,
  postsRead,
  profile,
  quotedCandidates,
  setAsideCount,
  strongCandidates,
  tableRows,
  type Band,
  type Candidate,
} from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink, BASE, Header, Stage } from "./chrome";
import { beat, HANDLE, hostOf } from "./data";
import { SiteIcon, XAvatar } from "./marks";

// Deck v2 building. The recorded run replays once (labelled once as a replay): summary tiles on top, the product's seven
// steps as a stack on the left, and on the right every step's evidence in order, open, staying once its step is
// done. Chosen sources are the front cards with the reason each was picked on the card; the matches that fit but
// were not chosen peek behind them (everything on a backing plate is also listed in full in the Jev step); the
// recorded set-aside names are a dimmer stack; the brief is open text; the skipped search is a small tile.
// Jev returns only a probability, so the bands are Strong match, Possible match and Set aside, never a number.
// ?at=1..7 freezes a step, ?at=done the end.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const chosenOrder = [...chosenSites, ...chosenAccounts];

export function DeckBuilding({ mode }: { mode: RunMode }) {
  const [replay, setReplay] = useState(0);
  const run = useRun(mode, replay);
  const complete = isDone(run);
  useFollow(run, mode.kind !== "failed");
  const idx = (id: StepId) => stepIds.indexOf(id);
  const st = (id: StepId) => run.states[idx(id)];
  const settled = run.states.filter((s) => s === "done" || s === "skipped").length;
  const chooseDone = st("choose") === "done";
  const chooseProgress = chooseDone ? 1 : st("choose") === "running" ? run.progress[idx("choose")] : 0;

  return (
    <Stage light={620}>
      <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 pb-20 lg:px-8">
        <Header
          title="Building Your Agent"
          freeWeek={false}
          actions={
            complete ? (
              <div className="flex items-center gap-3">
                {mode.kind === "replay" ? (
                  <button type="button" onClick={() => setReplay((n) => n + 1)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1">
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Replay
                  </button>
                ) : null}
                <PrimaryLink href={`${BASE}/ready`} size="lg">
                  See what was chosen
                </PrimaryLink>
              </div>
            ) : (
              <p className="flex items-center gap-2.5 text-[13px] text-t2 tabular-nums">
                <span className="flex gap-1" aria-hidden="true">
                  {run.states.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 w-5 rounded-full",
                        s === "done" ? "bg-[var(--ok)]" : s === "skipped" ? "bg-t3/60" : s === "running" ? "bg-[var(--caution)]" : s === "failed" ? "bg-[var(--error)]" : "bg-line-strong",
                      )}
                    />
                  ))}
                </span>
                {settled} of {run.states.length} steps done
              </p>
            )
          }
          sub={
            <p className="flex max-w-[760px] items-start gap-2 text-[15px] leading-snug text-t1">
              <QuoteMark className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
              {beat}
            </p>
          }
          note="Replay of a sample run."
        />

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Count label="Posts read" value={st("posts") === "done" ? postsRead : null} running={st("posts") === "running"} sub={`newest posts, ${posts.length} stored in full`} />
          <Count label="Candidates gathered" value={st("gather") === "done" ? candidateCount : null} running={st("gather") === "running"} sub={`${tableRows} from the source list, ${quotedCandidates.length} you quoted`} />
          <Count
            label="Jev kept"
            value={st("jev") === "done" ? kept.length : null}
            running={st("jev") === "running"}
            sub={`${strongCandidates.length} strong, ${possibleCandidates.length} possible, ${setAsideCount} set aside`}
            split={st("jev") === "done" ? [strongCandidates.length / candidateCount, possibleCandidates.length / candidateCount] : undefined}
          />
          <Count
            label="Chosen"
            value={chooseDone ? chosenIdSet.size : null}
            running={st("choose") === "running"}
            sub={chooseDone ? `${chosenSites.length} sites and feeds, ${chosenAccounts.length} Twitter accounts` : "sites, feeds and Twitter accounts"}
            meter={chooseDone ? chosenIdSet.size / candidateCount : undefined}
          />
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ol className={cn(lift, "p-2 lg:sticky lg:top-4")} style={liftStyle} aria-label="Steps">
            {stepIds.map((id, i) => {
              const state = run.states[i];
              return (
                <li key={id} className={cn("flex gap-3 rounded-lg px-3 py-2.5", state === "running" && "bg-[var(--caution-soft)]")}>
                  <StepMark state={state} size={20} className="mt-px shrink-0" />
                  <div className="min-w-0">
                    <p className={cn("text-[13.5px] leading-snug", state === "waiting" ? "text-t3" : "font-medium text-t1")}>
                      {state === "running" ? (
                        <Shimmer as="span" duration={1.8} className="[--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                          {stepTitle[id]}
                        </Shimmer>
                      ) : (
                        stepTitle[id]
                      )}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-t3">{stepDoes[id]}</p>
                    {state === "waiting" ? null : (
                      <p className={cn("mt-1 text-[12.5px]", state === "failed" ? "text-[var(--error)]" : state === "running" ? "text-[var(--caution)]" : "text-t2")}>{state === "done" || state === "skipped" ? stepLine[id] : stepLabel[state]}</p>
                    )}
                  </div>
                </li>
              );
            })}
            <p className="sr-only" aria-live="polite">
              {announce(run)}
            </p>
          </ol>

          <div className="grid min-w-0 gap-9">
            {stepIds.map((id, i) => {
              const state = run.states[i];
              if (state === "waiting") return null;
              return (
                <Step key={id} id={id} index={i} state={state}>
                  <Evidence id={id} state={state} progress={run.progress[i]} chooseProgress={chooseProgress} chooseDone={chooseDone} failed={mode.kind === "failed"} />
                </Step>
              );
            })}
          </div>
        </div>
      </main>
    </Stage>
  );
}

function Count({ label, value, running, sub, meter, split }: { label: string; value: number | null; running: boolean; sub: string; meter?: number; split?: [number, number] }) {
  return (
    <section className={cn(lift, "px-4 py-3.5")} style={liftStyle}>
      <p className="text-[12px] font-medium text-t3">{label}</p>
      <p className="mt-1 h-[30px] text-[28px] leading-none font-semibold tabular-nums text-t1">
        {value !== null ? value : running ? <StatusMark status="running" size={20} color="var(--caution)" strokeWidth={2} /> : <span className="text-t4">–</span>}
      </p>
      {meter !== undefined ? (
        <span className="mt-2 block h-1.5 rounded-full bg-line-strong">
          <span className="block h-full rounded-full bg-[var(--brand)] transition-[width] duration-500" style={{ width: `${meter * 100}%` }} />
        </span>
      ) : split ? (
        <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line-strong">
          <span className="h-full bg-[var(--ok)]" style={{ width: `${split[0] * 100}%` }} />
          <span className="h-full bg-t3" style={{ width: `${split[1] * 100}%` }} />
        </span>
      ) : (
        <span className="mt-2 block h-1.5" aria-hidden="true" />
      )}
      <p className="mt-2 text-[11.5px] text-t3">{sub}</p>
    </section>
  );
}

/** One step on the right: its number, title and closing line, then its evidence. It stays once the step is done. */
function Step({ id, index, state, children }: { id: StepId; index: number; state: StepState; children: React.ReactNode }) {
  return (
    <section id={`step-${id}`} aria-label={stepTitle[id]} className="scroll-mt-4">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
        {state === "done" || state === "skipped" ? <p className="text-[13px] text-t2">{stepLine[id]}</p> : null}
        {state === "failed" ? <span className="text-[13px] text-[var(--error)]">Stopped</span> : null}
      </header>
      {children}
    </section>
  );
}

function Evidence({ id, state, progress, chooseProgress, chooseDone, failed }: { id: StepId; state: StepState; progress: number; chooseProgress: number; chooseDone: boolean; failed: boolean }) {
  const running = state === "running";
  switch (id) {
    case "profile":
      return <Profile running={running} />;
    case "posts":
      return state === "failed" ? <FailedPosts /> : <Posts running={running} progress={progress} />;
    case "gather":
      return <Gather />;
    case "jev":
      return <Bands running={running} progress={progress} chooseProgress={chooseProgress} chooseDone={chooseDone} />;
    case "choose":
      return (
        <div className="grid gap-6">
          <Chosen running={running} progress={progress} />
          <Brief running={running} progress={progress} />
        </div>
      );
    case "search":
      return (
        <div className={cn(lift, "flex items-center gap-3 border-dashed px-4 py-3")} style={liftStyle}>
          <StepMark state="skipped" size={20} />
          <p className="text-[13px] text-t2">
            <span className="font-medium text-t1">Skipped.</span> {keptAccounts} Twitter accounts already passed the check, so there was nothing to look for.
          </p>
        </div>
      );
    default:
      return failed ? null : null;
  }
}

function FailedPosts() {
  return (
    <div className={cn(lift, "border-[var(--error)]/40 px-4 py-3")} style={liftStyle} role="alert">
      <p className="text-[13.5px] text-t1">Building stopped at: {stepTitle.posts}. Preparation could not finish. Your free week has not started.</p>
      <button type="button" className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] text-t1">
        <RotateCcw className="size-3.5" /> Try again
      </button>
    </div>
  );
}

function Profile({ running }: { running: boolean }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={cn(lift, "relative overflow-hidden p-4")} style={liftStyle}>
        <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-[var(--kind-post)]" />
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">{profile.name[0]}</span>
          <p className="min-w-0 leading-tight">
            <span className="block text-[14.5px] font-semibold text-t1">{running ? "Looking up your account" : profile.name}</span>
            <span className="block text-[12.5px] text-[var(--kind-post)]">{running ? `@${HANDLE}` : profile.handle}</span>
          </p>
        </div>
        {running ? null : <p className="mt-3 text-[13.5px] leading-[1.5] text-t2">{profile.bio}</p>}
      </div>
      {running ? null : (
        <div className={cn(lift, "relative overflow-hidden p-4")} style={liftStyle}>
          <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-[var(--kind-post)]" />
          <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
            <Pin className="size-3" aria-hidden="true" /> Pinned post
            <span className="ml-auto tabular-nums">{day(profile.pinned.date)}</span>
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.5] text-t2">{profile.pinned.text}</p>
        </div>
      )}
    </div>
  );
}

function Posts({ running, progress }: { running: boolean; progress: number }) {
  const shown = running ? take(posts, progress) : posts;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {shown.map((p) => (
        <article key={p.id} className={cn(lift, "relative overflow-hidden p-3.5")} style={liftStyle}>
          <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-[var(--kind-post)]" />
          <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
            {p.kind === "quote" ? "Quote" : p.kind === "thread" ? `Thread, ${p.parts} parts` : "Post"}
            <span className="ml-auto tabular-nums">{day(p.date)}</span>
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.45] whitespace-pre-line text-t2">{p.text}</p>
          {p.quoted ? (
            <p className="mt-2 rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] text-t3">
              <span className="font-medium text-t2">{p.quoted.author}</span> {p.quoted.text}
            </p>
          ) : null}
        </article>
      ))}
      {running ? null : (
        <div className="flex flex-col justify-center rounded-xl border border-dashed border-line-strong p-3.5">
          <p className="text-[22px] leading-none font-semibold tabular-nums text-t2">{postsRead - posts.length}</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-t3">more of the {postsRead} newest posts, with no stored text in this sample</p>
        </div>
      )}
    </div>
  );
}

function CandidateChip({ c, chosen, dim }: { c: Candidate; chosen?: boolean; dim?: boolean }) {
  const isX = c.kind === "x_account";
  return (
    <li
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-[12.5px] transition-colors duration-300",
        chosen ? "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1" : "border-line bg-[var(--window)] text-t2",
        dim && "border-dashed bg-transparent text-t3",
      )}
    >
      {isX ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={20} className={cn(dim && "opacity-60 grayscale")} /> : <SiteIcon host={hostOf(c.target)} size={20} className={cn("rounded-[5px]", dim && "opacity-60 grayscale")} />}
      <span>{c.name}</span>
      <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3 uppercase">{isX ? "Twitter" : c.kind === "rss" ? "RSS" : "Web"}</span>
      {chosen ? <Check className="size-3.5 text-[var(--brand)]" aria-label="chosen" /> : null}
    </li>
  );
}

/** A card with offset backing plates under it. The plates carry no content of their own. */
function Pile({ children, plates = 2, className, tone }: { children: React.ReactNode; plates?: number; className?: string; tone?: "dim" }) {
  return (
    <div className={cn("relative", className)} style={{ marginBottom: plates * 9 }}>
      {Array.from({ length: plates }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("absolute rounded-xl border border-line-strong", tone === "dim" ? "bg-[var(--well)]" : "bg-[var(--raised)]")}
          style={{ insetInline: (i + 1) * 12, top: 8, bottom: -(i + 1) * 9, zIndex: 2 - i - 1 + 0, boxShadow: "var(--card-shadow)" }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Gather() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className={cn(lift, "px-4 py-3.5")} style={liftStyle}>
        <p className="text-[26px] leading-none font-semibold tabular-nums text-t1">{tableRows}</p>
        <p className="mt-1.5 text-[12.5px] text-t2">from the source list</p>
      </div>
      <div className={cn(lift, "px-4 py-3.5")} style={liftStyle}>
        <p className="flex items-baseline gap-2.5">
          <span className="text-[26px] leading-none font-semibold tabular-nums text-t1">{quotedCandidates.length}</span>
          <span className="text-[12.5px] text-t2">accounts you quoted</span>
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {quotedCandidates.map((c) => (
            <CandidateChip key={c.id} c={c} />
          ))}
        </ul>
      </div>
      <p className="text-[12px] text-t3 lg:col-span-2">Being quoted does not qualify an account on its own. Jev checks each one next.</p>
    </div>
  );
}

const bandTone: Record<Band, string> = { strong: "text-[var(--ok)]", possible: "text-t2", "set-aside": "text-t3" };

function Bands({ running, progress, chooseProgress, chooseDone }: { running: boolean; progress: number; chooseProgress: number; chooseDone: boolean }) {
  const f = running ? progress : 1;
  const reveal = chooseProgress > 0 ? Math.ceil(chooseProgress * chosenOrder.length) : 0;
  const lit = new Set(chosenOrder.slice(0, reveal).map((c) => c.id));
  const block = (band: Band, list: Candidate[], total: number, note?: string) =>
    list.length === 0 ? null : (
      <Pile key={band} tone={band === "set-aside" ? "dim" : undefined}>
        <section className={cn(lift, "p-4", band === "set-aside" && "border-dashed bg-[var(--well)]")} style={liftStyle}>
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[13.5px] font-semibold", bandTone[band])}>{bandLabel[band]}</span>
            <span className="text-[12.5px] tabular-nums text-t3">{total}</span>
            {note ? <span className="text-[12px] text-t3">{note}</span> : null}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {list.map((c) => (
              <CandidateChip key={c.id} c={c} chosen={band !== "set-aside" && chooseDone ? chosenIdSet.has(c.id) : lit.has(c.id)} dim={band === "set-aside"} />
            ))}
          </ul>
        </section>
      </Pile>
    );
  const strong = take(strongCandidates, f);
  const possible = take(possibleCandidates, f);
  const aside = take(droppedSample, f);
  return (
    <div className="grid gap-5">
      {running ? (
        <p className="flex items-center gap-2 text-[12.5px] tabular-nums text-t2">
          Checked {Math.round(progress * candidateCount)} of {candidateCount}
          <span className="block h-1.5 w-40 rounded-full bg-line-strong" aria-hidden="true">
            <span className="block h-full rounded-full bg-[var(--caution)] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </span>
        </p>
      ) : null}
      {block("strong", strong, running ? strong.length : strongCandidates.length)}
      {block("possible", possible, running ? possible.length : possibleCandidates.length)}
      {block("set-aside", aside, running ? aside.length : setAsideCount, running ? undefined : `${droppedSample.length} recorded by name, ${setAsideCount - droppedSample.length} more not shown`)}
    </div>
  );
}

function ChosenCard({ c, why, isX }: { c: Candidate & { why: string }; why: string; isX: boolean }) {
  const band = bandOf(c.score);
  return (
    <article className={cn(lift, "relative flex flex-col overflow-hidden p-3.5")} style={liftStyle}>
      <span aria-hidden="true" className={cn("absolute inset-x-4 top-0 h-[2px] rounded-b-full", isX ? "bg-[var(--kind-post)]" : "bg-[var(--kind-article)]")} />
      <div className="flex items-center gap-2.5">
        {isX ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={24} /> : <SiteIcon host={hostOf(c.target)} size={24} className="rounded-[6px]" />}
        <p className="min-w-0 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-t1">{c.name}</span>
          <span className="block truncate text-[11.5px] text-t3">{isX ? c.target.replace("https://x.com/", "@").toLowerCase() : hostOf(c.target)}</span>
        </p>
        <Check className="ml-auto size-4 shrink-0 text-[var(--brand)]" aria-label="Chosen" />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-px text-[11px] font-medium", isX ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]")}>
          {isX ? "Twitter account" : c.kind === "rss" ? "RSS feed" : "Website"}
        </span>
        <span className={cn("text-[11.5px]", bandTone[band])}>{bandLabel[band]}</span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.45] text-t2">{why}</p>
    </article>
  );
}

function Chosen({ running, progress }: { running: boolean; progress: number }) {
  const accounts = running ? take(chosenAccounts, progress) : chosenAccounts;
  const sites = running ? take(chosenSites, progress) : chosenSites;
  const notChosen = kept.filter((c) => !chosenIdSet.has(c.id));
  const group = (title: string, total: number, list: (Candidate & { why: string })[], isX: boolean) => {
    const peek = notChosen.filter((c) => (c.kind === "x_account") === isX);
    return (
      <div key={title}>
        <p className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[13.5px] font-semibold text-t1">{title}</span>
          <span className="text-[12.5px] tabular-nums text-t3">{total}</span>
          <span className="text-[12px] text-t3">Each card says why it was picked.</span>
        </p>
        <div className="relative" style={{ paddingBottom: running ? 0 : 38 }}>
          {running
            ? null
            : [0, 1].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-xl border border-line-strong bg-[var(--raised)]"
                  style={{ insetInline: (i + 1) * 12, bottom: i === 0 ? 14 : 0, height: 60, zIndex: 2 - i, boxShadow: "var(--card-shadow)" }}
                >
                  {i === 0 ? (
                    <span className="absolute inset-x-4 bottom-[3px] flex h-[20px] items-center gap-1.5 text-[11px] text-t3">
                      <span className="shrink-0">Also fit, not chosen:</span>
                      <span className="truncate">{peek.map((c) => c.name).join(", ")}</span>
                    </span>
                  ) : null}
                </div>
              ))}
          <ul className="relative z-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <li key={c.id} className="contents">
                <ChosenCard c={c} why={c.why} isX={isX} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  return (
    <div className="grid gap-6">
      {group("Twitter accounts", chosenAccounts.length, accounts, true)}
      {group("Sites and feeds", chosenSites.length, sites, false)}
    </div>
  );
}

function Brief({ running, progress }: { running: boolean; progress: number }) {
  const words = brief.summary.split(" ");
  const text = running ? words.slice(0, Math.max(1, Math.ceil(progress * words.length))).join(" ") : brief.summary;
  return (
    <div>
      <p className="max-w-[820px] text-[15px] leading-[1.65] text-t1">
        {text}
        {running ? <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" /> : null}
      </p>
      {running ? null : (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
          <span className="mr-1 text-t3">Interests</span>
          {brief.interests.map((t) => (
            <span key={t} className="rounded-full border border-line bg-[var(--well)] px-2.5 py-0.5 text-t2">
              {t}
            </span>
          ))}
          <span className="mr-1 ml-3 text-t3">Language</span>
          {brief.languages.map((t) => (
            <span key={t} className="rounded-full border border-line bg-[var(--well)] px-2.5 py-0.5 text-t2">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
