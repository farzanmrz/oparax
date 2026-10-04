"use client";

import { useState } from "react";
import { ArrowRight, Pin } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { announce, currentStep, isDone, stepIds, stepLabel, stepLine, stepTitle, useRun, type StepId, type StepState } from "@/next/building/steps";
import { StepMark } from "@/next/building/step-mark";
import type { RunMode } from "@/next/building/mode";
import { brief, candidateCount, kept, posts, profile, quotedCandidates, setAsideCount, tableRows } from "@/next/data/onboarding";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { XLogo } from "@/pro/shared/brand";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle } from "@/components/ai-elements/plan";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink } from "@/v2/deck/chrome";
import { groups, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, kindColor, SourceMark, XAvatar } from "@/v2/deck/marks";
import { Label } from "@/v2/window/chrome";
import { BASE } from "./card";
import { Expand, Shell } from "./rail";

// One onboarding: building and ready on one page, with the One sidebar collapsed, in the Window building page's
// three columns (264px, the work, 340px). The top row holds only Expand and the running step's name. On the left,
// sticky, the Deck building page's step stack (each step's mark and title, its closing line once done or skipped,
// the running one highlighted). In the middle the objects arrive and stay, in order: the profile and the pinned post
// and the three stored posts (both copied from v2/window/building.tsx), one candidates line, then the chosen sources
// in one section per kind of compact lifted cards; a card opens its reason in place. On the right, sticky, "Your
// brief" as the Window building page draws it (BriefPane), an empty card until the brief step. When the run ends
// everything stays where it is and the top row becomes "Your agent is ready" with Open your feed. The run's timing
// comes from next/building/steps.ts.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
const kinds = groups.filter((g) => g.id !== "github" && sources.some((s) => s.group === g.id));

/** The top row's quiet line while a step runs. The search step is decided, never run. */
const runningLine: Record<StepId, string> = {
  profile: "Finding your X profile",
  posts: "Reading your newest posts",
  gather: "Gathering candidates",
  jev: "Jev is checking relevance",
  choose: "Choosing your sources",
  search: "No X search. Enough accounts already fit.",
  brief: "Writing your brief",
  save: "Saving your agent",
};

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
  const cur = currentStep(run);
  const curId = cur >= 0 ? stepIds[cur] : null;
  const seen = (id: StepId) => st(id) !== "waiting";
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
              <PrimaryLink href={`${BASE}/feed`}>
                Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
              </PrimaryLink>
            </motion.div>
          ) : curId && run.states[cur] === "failed" ? (
            <p className="text-[13.5px] text-[var(--error)]">{stepTitle[curId]} stopped.</p>
          ) : curId ? (
            <p className="text-[13.5px] text-t2">{runningLine[curId]}</p>
          ) : null}
        </div>

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
                    {state === "done" || state === "skipped" ? (
                      <p className="mt-0.5 text-[12.5px] text-t3">{stepLine[id]}</p>
                    ) : state === "failed" ? (
                      <p className="mt-0.5 text-[12.5px] text-[var(--error)]">{stepLabel[state]}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
            <p className="sr-only" aria-live="polite">
              {announce(run)}
            </p>
          </ol>

          <div className="grid min-w-0 gap-5 @container">
            {/* The profile card from the first step on (the faint loading placeholder read as a dead page). */}
            {seen("profile") ? <ProfileCard /> : null}
            {seen("posts") && st("posts") !== "failed" ? <PostsRow /> : null}
            {/* One line: what was gathered while Jev checks; what was kept once Jev is done; gone once the sources arrive. */}
            {seen("gather") && chooseF === 0 ? <CandidatesLine kept={st("jev") === "done"} /> : null}
            {chooseF > 0 ? (
              <>
                {kinds.map((k) => {
                  const list = chosen(k.id);
                  if (!list.length) return null;
                  return (
                    <section key={k.id} aria-label={k.label}>
                      <p className="mb-2.5 flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold text-t1">{k.label}</span>
                        <span className="text-[12.5px] tabular-nums text-t3">{sources.filter((s) => s.group === k.id).length}</span>
                      </p>
                      <ul className="grid grid-cols-3 items-start gap-2.5 @2xl:grid-cols-4">
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

/** "Your brief" as the Window building page's right block (v2/window/building.tsx, BriefPane), sticky. */
function BriefPane({ state, progress }: { state: StepState; progress: number }) {
  const running = state === "running";
  const words = brief.summary.split(" ");
  const text = running ? words.slice(0, Math.max(1, Math.ceil(progress * words.length))).join(" ") : brief.summary;
  return (
    <aside aria-label="Your brief" className="lg:sticky lg:top-4">
      <Label className="px-1 pt-1">Your brief</Label>
      {state === "waiting" || state === "failed" ? null : (
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

/** Window building's ProfileCard (v2/window/building.tsx): the profile and the pinned post side by side, lifted. */
function ProfileCard() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"
    >
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

/** The three stored posts from Window building's PostsGrid, in one row, lifted, all three from the posts step on. */
function PostsRow() {
  const reduce = useReducedMotion();
  return (
    <ul className="grid grid-cols-3 items-start gap-3">
      {posts.map((p) => (
        <motion.li
          key={p.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className={cn(lift, "p-3")}
          style={liftStyle}
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
  );
}

/** One compact line under the posts: what was gathered, then, once Jev has checked, what was kept. */
function CandidatesLine({ kept: checked }: { kept: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[13px] text-t2">
      {checked ? (
        `${kept.length} kept as strong or possible, ${setAsideCount} set aside`
      ) : (
        <>
          <span>
            {candidateCount} candidates: {tableRows} from the source list, {quotedCandidates.length} accounts you quoted
          </span>
          {quotedCandidates.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-t1">
              <XAvatar handle={c.target.replace("https://x.com/", "")} size={18} />
              {c.name}
            </span>
          ))}
        </>
      )}
    </p>
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
      <span className="flex h-12 items-center gap-2.5">
        <SourceMark source={source} size={22} className={isX ? "" : "rounded-[6px]"} />
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
