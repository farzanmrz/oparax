"use client";

import { useState } from "react";
import { ArrowRight, Pin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { announce, currentStep, isDone, stepIds, stepLabel, stepLine, stepTitle, useRun, type Run, type StepId, type StepState } from "@/next/building/steps";
import { StepMark } from "@/next/building/step-mark";
import type { RunMode } from "@/next/building/mode";
import { brief, posts, profile } from "@/next/data/onboarding";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle } from "@/components/ai-elements/plan";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink, useThemeGuard } from "@/v2/deck/chrome";
import { groups, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, kindColor, SourceMark } from "@/v2/deck/marks";
import { BASE } from "./card";

// One onboarding: the Window building page's composition (v2/window/building.tsx), copied, with the owner's changes
// only. Three columns: the STEPS rail on the left as Window draws it (each step's mark, the line between marks, and
// the step's closing line once it is done or skipped); in the middle the Window step sections for the profile (its
// line) and the posts (its line and the three post cards), then the chosen sources by kind as compact lifted cards
// that open in place to the reason and, for an account quoted in a post, that post; on the right the profile and
// the pinned post as lifted cards, then "Your brief". The top row: the running step's name, then "Your agent is
// ready" with Open your feed. Everything stays in place at the end.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
const kinds = groups.filter((g) => g.id !== "github" && sources.some((s) => s.group === g.id));
/** Steps drawn as sections in the middle. */
const sectioned: StepId[] = ["profile", "posts"];

export function OneOnboarding({ mode, why }: { mode: RunMode; why: string | null }) {
  useThemeGuard();
  const run = useRun(mode);
  const done = isDone(run);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Set<string>>(() => new Set(why ? [why] : []));
  const idx = (id: StepId) => stepIds.indexOf(id);
  const st = (id: StepId) => run.states[idx(id)];
  const chooseF = st("choose") === "done" ? 1 : st("choose") === "running" ? run.progress[idx("choose")] : 0;
  const chosen = (g: Group) => take(sources.filter((s) => s.group === g), chooseF);
  const cur = currentStep(run);
  const reached = run.states.reduce((acc, s, i) => (s === "waiting" ? acc : i), 0);
  const headId = stepIds[cur >= 0 ? cur : reached];
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="palette-council flex min-h-svh flex-col">
      <main className="flex min-h-svh flex-1 flex-col bg-[var(--window)]">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8">
          <div className="min-w-0" aria-live="polite">
            {done ? (
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
              >
                Your agent is ready
              </motion.h1>
            ) : (
              <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{stepTitle[headId]}</h1>
            )}
          </div>
          {done ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <PrimaryLink href={`${BASE}/feed`} className="h-9 px-4 text-[13.5px]">
                Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
              </PrimaryLink>
            </div>
          ) : null}
        </div>

        <div className="grid min-h-[720px] flex-1 grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_340px]">
          <Steps run={run} />
          <section aria-label="The agent's work" className="min-w-0 border-r border-line">
            <p className="sr-only" aria-live="polite">
              {announce(run)}
            </p>
            {sectioned.map((id) => {
              const state = st(id);
              if (state === "waiting") return null;
              return (
                <Section key={id} id={id} index={idx(id)} state={state}>
                  {id === "posts" ? <PostsGrid running={state === "running"} progress={run.progress[idx(id)]} failed={state === "failed"} /> : null}
                </Section>
              );
            })}
            {chooseF > 0 ? (
              <section aria-label="Your sources" className="space-y-6 border-b border-line px-7 py-6 last:border-b-0">
                {kinds.map((k) => {
                  const list = chosen(k.id);
                  if (!list.length) return null;
                  return (
                    <div key={k.id}>
                      <p className="mb-2.5 flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold text-t1">{k.label}</span>
                        <span className="text-[12.5px] tabular-nums text-t3">{sources.filter((s) => s.group === k.id).length}</span>
                      </p>
                      <ul className="grid grid-cols-3 items-start gap-2.5">
                        {list.map((s) => (
                          <motion.li key={s.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                            <SourceCard source={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            ) : null}
          </section>
          <RightPane run={run} />
        </div>
      </main>
    </div>
  );
}

/** Window's step rail: the eight steps, their marks and the line between them, each step's line once settled. */
function Steps({ run }: { run: Run }) {
  return (
    <aside aria-label="Steps" className="border-r border-line bg-[var(--rail)]">
      <div className="sticky top-0 px-4 pt-5 pb-6">
        <p className="px-1 font-mono text-[10.5px] font-medium tracking-[0.12em] text-t3 uppercase">Steps</p>
        <ol className="mt-3">
          {stepIds.map((id, i) => {
            const state = run.states[i];
            const last = i === stepIds.length - 1;
            const settled = state === "done" || state === "skipped";
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
                    ) : state !== "waiting" && sectioned.includes(id) ? (
                      <a href={`#step-${id}`} className="hover:underline">
                        {stepTitle[id]}
                      </a>
                    ) : (
                      stepTitle[id]
                    )}
                  </p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{settled ? stepLine[id] : stepLabel[state]}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

/** One step in the middle, as Window draws it: its mark and title, the line it ends with, then its evidence. */
function Section({ id, index, state, children }: { id: StepId; index: number; state: StepState; children?: React.ReactNode }) {
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

/** Window's PostsGrid. */
function PostsGrid({ running, progress, failed }: { running: boolean; progress: number; failed: boolean }) {
  if (failed) return <p className="pl-[52px] text-[12.5px] text-t3">X did not return the posts in time.</p>;
  const shown = running ? take(posts, progress) : posts;
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {shown.map((p) => (
        <motion.li
          key={p.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="rounded-lg border border-line bg-[var(--raised)] p-3 shadow-[var(--top-light)]"
        >
          <PostBody post={p} />
        </motion.li>
      ))}
    </ul>
  );
}

function PostBody({ post: p }: { post: (typeof posts)[number] }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <XLogo className="size-2.5 text-[var(--kind-post)]" />
        {p.kind === "quote" ? "Quote" : p.kind === "thread" ? `Thread, ${p.parts} parts` : "Post"}
        <span className="ml-auto tabular-nums">{day(p.date)}</span>
      </span>
      <span className="mt-1.5 block text-[13px] leading-[1.5] whitespace-pre-line text-t1">{p.text}</span>
      {p.quoted ? (
        <span className="mt-2 block rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
          <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
        </span>
      ) : null}
    </>
  );
}

/** A chosen source as a compact lifted card; a click opens, in place, its reason and the post that quotes it. */
function SourceCard({ source, open, onToggle }: { source: Source; open: boolean; onToggle: () => void }) {
  const isX = source.group === "x";
  const quote = isX ? posts.find((p) => p.quoted?.author.toLowerCase() === source.handle.toLowerCase()) : undefined;
  return (
    <div className={cn(lift, "relative overflow-hidden")} style={liftStyle}>
      <button
        type="button"
        onClick={source.why ? onToggle : undefined}
        aria-expanded={source.why ? open : undefined}
        className="flex h-12 w-full items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SourceMark source={source} size={22} className={isX ? "" : "rounded-[6px]"} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-t1">{source.name}</span>
          <span className="block truncate text-[11.5px] text-t3">{isX ? source.handle : source.mark}</span>
        </span>
        <span className="flex shrink-0" style={{ color: isX ? kindColor.post : kindColor.article }}>
          <GroupGlyph group={source.group} />
        </span>
      </button>
      {open && source.why ? (
        <div className="px-3.5 pb-3.5">
          <p className="text-[13px] leading-[1.45] text-t2">{source.why}</p>
          {quote ? (
            <>
              <p className="mt-3 mb-1.5 text-[11.5px] text-t3">From your posts</p>
              <div className="rounded-lg border border-line bg-[var(--raised)] p-3 shadow-[var(--top-light)]">
                <PostBody post={quote} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The right column: the profile and the pinned post as lifted cards, then "Your brief" as Window draws it. */
function RightPane({ run }: { run: Run }) {
  const pState = run.states[stepIds.indexOf("profile")];
  const i = stepIds.indexOf("brief");
  const state = run.states[i];
  const streaming = state === "running";
  const ready = state === "done";
  const words = brief.summary.split(" ");
  const text = streaming ? words.slice(0, Math.max(1, Math.ceil(run.progress[i] * words.length))).join(" ") : brief.summary;
  return (
    <aside aria-label="Your profile and brief" className="bg-[var(--rail)]">
      <div className="sticky top-0 px-5 pt-5 pb-6">
        {pState === "running" ? <ProfileRunning /> : pState === "done" ? <ProfileCards /> : null}
        <p className={cn("text-[13px] font-semibold text-t1", pState !== "waiting" && "mt-6")}>Your brief</p>
        {state === "waiting" || state === "failed" ? (
          <div className="mt-3 space-y-2 rounded-xl border border-dashed border-line-strong p-4">
            <p className="text-[13px] text-t3">Written after the sources are chosen.</p>
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

/** Window's ProfileRunning. */
function ProfileRunning() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-11 rounded-full bg-[var(--raised)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40 bg-[var(--raised)]" />
        <Skeleton className="h-3 w-56 bg-[var(--raised)]" />
      </div>
    </div>
  );
}

/** Window's ProfileCard, the profile and the pinned post, stacked as lifted cards. */
function ProfileCards() {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="grid gap-2.5">
      <div className={cn(lift, "p-3.5")} style={liftStyle}>
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
      <div className={cn(lift, "p-3.5")} style={liftStyle}>
        <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
          <Pin className="size-3" aria-hidden="true" /> Pinned post
          <span className="ml-auto tabular-nums">{day(profile.pinned.date)}</span>
        </p>
        <p className="mt-2 text-[13px] leading-[1.5] text-t1">{profile.pinned.text}</p>
      </div>
    </motion.div>
  );
}
