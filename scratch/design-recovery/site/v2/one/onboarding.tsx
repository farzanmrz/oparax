"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { announce, isDone, stepIds, stepLabel, stepLine, stepTitle, useRun, type StepId, type StepState } from "@/next/building/steps";
import { StepMark } from "@/next/building/step-mark";
import type { RunMode } from "@/next/building/mode";
import { brief, postsRead, profile } from "@/next/data/onboarding";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle } from "@/components/ai-elements/plan";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink } from "@/v2/deck/chrome";
import { groups, HANDLE, sources, status, type Group, type Source } from "@/v2/deck/data";
import { Checking, EASE } from "@/v2/deck/live";
import { GroupGlyph, kindColor, SourceMark } from "@/v2/deck/marks";
import { Label } from "@/v2/window/chrome";
import { BASE } from "./card";
import { Expand, Shell } from "./rail";

// One onboarding: building and ready on one page, with the One sidebar, in the Window building page's three
// columns (264px, the work, 340px). On the left, sticky, the Deck building page's step stack (each step's mark,
// title and closing line, the running one highlighted). Under the status line one compact strip: the X account the
// agent is built around and, once read, how many newest posts. In the middle only the chosen sources, one section
// per kind of compact lifted cards; a card opens its reason in place. On the right, sticky, "Your brief" as the
// Window building page draws it (v2/window/building.tsx, BriefPane). When the run ends everything stays where it is
// and the status line becomes "Your agent is ready" with the days left and Open your feed. The run's timing comes
// from next/building/steps.ts.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const kinds = groups.filter((g) => g.id !== "github" && sources.some((s) => s.group === g.id));

export function OneOnboarding({ mode, why }: { mode: RunMode; why: string | null }) {
  const run = useRun(mode);
  const done = isDone(run);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Set<string>>(() => new Set(why ? [why] : []));
  const idx = (id: StepId) => stepIds.indexOf(id);
  const st = (id: StepId) => run.states[idx(id)];
  const chooseF = st("choose") === "done" ? 1 : st("choose") === "running" ? run.progress[idx("choose")] : 0;
  const chosen = (g: Group) => take(sources.filter((s) => s.group === g), chooseF);
  const shown = chooseF > 0 ? kinds.flatMap((k) => chosen(k.id)) : [];
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Shell sources={shown} light={720} ownExpand>
      <main className="relative pt-3 pb-16">
        <div aria-live="polite" className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2 px-1">
          <Expand className="-mr-2" />
          {done ? (
            <motion.div
              className="flex items-center gap-4"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <h1 className="text-[20px] leading-none font-semibold tracking-[-0.02em] text-t1">Your agent is ready</h1>
              <p className="text-[13.5px] text-t2">{status.daysLeft} days left in your free week.</p>
              <PrimaryLink href={`${BASE}/feed`}>
                Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
              </PrimaryLink>
            </motion.div>
          ) : (
            <Checking pending={1} label="Checking sources" />
          )}
          <span className="text-[12px] text-t3">Replay of a sample run.</span>
        </div>

        {st("profile") !== "waiting" ? <Account running={st("profile") === "running"} postsDone={st("posts") === "done"} /> : null}

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[264px_minmax(0,1fr)_340px]">
          {/* The Deck building page's step stack (v2/deck/building.tsx). */}
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
                    <p className={cn("mt-0.5 text-[12.5px]", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{state === "done" || state === "skipped" ? stepLine[id] : stepLabel[state]}</p>
                  </div>
                </li>
              );
            })}
            <p className="sr-only" aria-live="polite">
              {announce(run)}
            </p>
          </ol>

          <div className="grid min-w-0 gap-6 @container">
            {chooseF > 0 ? (
              <>
                <p className="text-[13px] text-t2">Click on any source to see the reason.</p>
                {kinds.map((k) => {
                  const list = chosen(k.id);
                  if (!list.length) return null;
                  return (
                    <section key={k.id} aria-label={k.label}>
                      <p className="mb-2.5 flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold text-t1">{k.label}</span>
                        <span className="text-[12.5px] tabular-nums text-t3">{sources.filter((s) => s.group === k.id).length}</span>
                      </p>
                      <ul className="grid grid-cols-2 items-start gap-3 @2xl:grid-cols-3">
                        <AnimatePresence initial={false}>
                          {list.map((s) => (
                            <motion.li
                              key={s.id}
                              initial={reduce ? false : { opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, ease: EASE }}
                            >
                              <SourceCard source={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  );
                })}
              </>
            ) : null}
          </div>

          <BriefPane state={st("brief")} progress={run.progress[idx("brief")]} />
        </div>
      </main>
    </Shell>
  );
}

/** The compact strip under the status line: the X account the agent is built around, then the posts read. */
function Account({ running, postsDone }: { running: boolean; postsDone: boolean }) {
  return (
    <p className="flex min-h-8 flex-wrap items-center gap-x-2.5 gap-y-1 px-1 text-[13px]">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">{profile.name[0]}</span>
      <span className="font-medium text-t1">{running ? "Looking up your account" : profile.name}</span>
      <span className="text-t3">{running ? `@${HANDLE}` : profile.handle}</span>
      {postsDone ? (
        <>
          <span aria-hidden="true" className="text-t4">
            ·
          </span>
          <span className="text-t2">Read {postsRead} newest posts</span>
        </>
      ) : null}
    </p>
  );
}

/** "Your brief" as the Window building page's right block (v2/window/building.tsx, BriefPane), sticky. */
function BriefPane({ state, progress }: { state: StepState; progress: number }) {
  const running = state === "running";
  const words = brief.summary.split(" ");
  const text = running ? words.slice(0, Math.max(1, Math.ceil(progress * words.length))).join(" ") : brief.summary;
  return (
    <aside aria-label="Your brief" className="lg:sticky lg:top-4">
      <Label className="px-1 pt-1">Your brief</Label>
      {state === "waiting" || state === "failed" ? (
        <p className="mt-3 px-1 text-[13px] text-t3">Written after the sources are chosen.</p>
      ) : (
        <Plan isStreaming={running} defaultOpen className="mt-3 gap-3 rounded-xl border border-line-strong bg-[var(--window)] py-4 shadow-[var(--card-shadow)] ring-0">
          <PlanHeader className="px-4">
            <div className="space-y-1.5">
              <PlanTitle className="text-[13.5px] font-semibold text-t1">{`About ${profile.name.split(" ")[0]}`}</PlanTitle>
              <PlanDescription className="text-[13px] leading-[1.55] text-t2">{text}</PlanDescription>
            </div>
          </PlanHeader>
          {state === "done" ? (
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
    </aside>
  );
}

/** A chosen source as a compact lifted card in the Deck's ChosenCard look; a click opens its reason in place. */
function SourceCard({ source, open, onToggle }: { source: Source; open: boolean; onToggle: () => void }) {
  const isX = source.group === "x";
  return (
    <button
      type="button"
      onClick={source.why ? onToggle : undefined}
      aria-expanded={source.why ? open : undefined}
      className={cn(lift, "relative block w-full overflow-hidden px-3.5 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring")}
      style={liftStyle}
    >
      <span aria-hidden="true" className={cn("absolute inset-x-4 top-0 h-[2px] rounded-b-full", isX ? "bg-[var(--kind-post)]" : "bg-[var(--kind-article)]")} />
      <span className="flex h-16 items-center gap-2.5">
        <SourceMark source={source} size={24} className={isX ? "" : "rounded-[6px]"} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-t1">{source.name}</span>
          <span className="block truncate text-[11.5px] text-t3">{isX ? source.handle : source.mark}</span>
        </span>
        <span className="flex shrink-0" style={{ color: isX ? kindColor.post : kindColor.article }}>
          <GroupGlyph group={source.group} />
        </span>
      </span>
      {open && source.why ? <span className="block pb-3.5 text-[13px] leading-[1.45] text-t2">{source.why}</span> : null}
    </button>
  );
}
