"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Quote as QuoteMark, Sparkles } from "lucide-react";
import { LayoutGroup, motion, MotionConfig, useReducedMotion } from "motion/react";
import { announce, isDone, REPLAY_MS, runAt, runFailed, runFrozen, stepIds, stepLine, stepTitle, type Run, type StepId } from "@/next/building/steps";
import { StepMark } from "@/next/building/step-mark";
import type { RunMode } from "@/next/building/mode";
import {
  bandLabel,
  bandOf,
  brief,
  candidateCount,
  droppedSample,
  kept,
  posts,
  postsRead,
  profile,
  setAsideCount,
  type Band,
  type Candidate,
} from "@/next/data/onboarding";
import { setup } from "@/next/copy";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink } from "@/v2/deck/chrome";
import { beat, groups, HANDLE, hostOf, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, SiteIcon, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { AppShell } from "./shell";

// One onboarding: one page inside the shell, setup is its first state (owner, Oct 4: "The setup I was hoping for
// would have the form on the page"). The page line holds the heading and, before the run, the handle, the one-line
// sentence and Build my agent; during and after, the X account and the button. Three columns under it: the eight
// steps on the left, each a record that stays readable; the candidates in the centre (gathered, then checked into
// Deck's Strong match, Possible match and Set aside bands, then only the chosen sources); the person on the right as
// ONE identity block (avatar, name and handle on one line, bio, About with the sentence, the brief, the interests
// and the language) with their newest posts under it. The replay runs 48 seconds (next/building/steps.ts) and can be
// paused and replayed. ?at=1..8 and ?at=done freeze it for screenshots.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
/** The chosen sources' kinds. The recorded run chose sites, feeds and X accounts; it chose no GitHub repository. */
const kinds = groups.filter((g) => g.id !== "github" && sources.some((s) => s.group === g.id));

/** The named candidates in the order the run gathers and checks them: the kept rows with the recorded set-aside
 * rows spread among them, so every band fills as the check moves. */
const order: Candidate[] = (() => {
  const out: Candidate[] = [];
  const asideEvery = Math.ceil(kept.length / droppedSample.length);
  let d = 0;
  kept.forEach((c, i) => {
    out.push(c);
    if ((i + 1) % asideEvery === 0 && d < droppedSample.length) out.push(droppedSample[d++]);
  });
  while (d < droppedSample.length) out.push(droppedSample[d++]);
  return out;
})();
const bandOrder: Band[] = ["strong", "possible", "set-aside"];

/** Every step waiting: the page before the run. */
const before: Run = { states: stepIds.map(() => "waiting"), progress: stepIds.map(() => 0) };
const idx = (id: StepId) => stepIds.indexOf(id);

const HANDLE_REQUIRED = "Type the X handle your agent is built around.";
const PLACEHOLDER = "One sentence. Name the topics, people or products you care about.";

/** The replay clock: plays from zero, pauses, resumes and replays. Reduced motion keeps every step and only drops
 * the movement (MotionConfig below), so the clock runs the same. */
function useReplay(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(active);
  const [round, setRound] = useState(0);
  const at = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      at.current = Math.min(REPLAY_MS, at.current + (now - last));
      last = now;
      setElapsed(at.current);
      if (at.current >= REPLAY_MS) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, round]);
  return {
    elapsed,
    playing,
    pause: () => setPlaying(false),
    resume: () => setPlaying(true),
    replay: () => {
      at.current = 0;
      setElapsed(0);
      setRound((r) => r + 1);
      setPlaying(true);
    },
  };
}

export function OneOnboarding({
  mode,
  started: startedAtLoad = false,
  why = null,
  typed = false,
  blank = false,
}: {
  mode: RunMode;
  /** The run is on the page at load (?at= or ?state=failed); otherwise the page opens before the run. */
  started?: boolean;
  why?: string | null;
  typed?: boolean;
  blank?: boolean;
}) {
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(startedAtLoad);
  // A frozen state stays frozen until Replay; Build my agent and Replay run the clock.
  const [live, setLive] = useState(mode.kind === "replay" && startedAtLoad);
  const clock = useReplay(mode.kind === "replay" && startedAtLoad);
  const [handle, setHandle] = useState(typed ? "" : HANDLE);
  const [text, setText] = useState(blank ? "" : beat);
  const [error, setError] = useState(blank);
  const [handleError, setHandleError] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(why ? [why] : []));

  const run: Run = !started ? before : live ? runAt(clock.elapsed) : mode.kind === "frozen" ? runFrozen(mode.at) : mode.kind === "failed" ? runFailed() : runAt(clock.elapsed);
  const done = started && isDone(run);
  const st = (id: StepId) => run.states[idx(id)];
  const chooseF = st("choose") === "done" ? 1 : st("choose") === "running" ? run.progress[idx("choose")] : 0;
  const heading = !started ? "Set up your agent" : done ? "Your agent is ready" : st("choose") === "done" ? "Saving your agent" : "Choosing sources";
  const message = [handleError ? HANDLE_REQUIRED : null, error ? setup.beatRequired : null].filter(Boolean).join(" ");
  const sentence = text.trim() || beat;
  const shownHandle = handle.trim() || HANDLE;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const replay = () => {
    setLive(true);
    clock.replay();
  };

  return (
    <AppShell>
      <MotionConfig reducedMotion="user">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (started) return;
            const h = handle.trim();
            const t = text.trim();
            setHandleError(!h);
            setError(!t);
            if (!h || !t) return;
            setStarted(true);
            replay();
          }}
        >
          <div className="flex min-h-9 items-center gap-6">
            <div className="w-[264px] shrink-0" aria-live="polite">
              <motion.h1
                key={heading}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="text-[28px] leading-none font-semibold tracking-[-0.025em] whitespace-nowrap text-t1"
              >
                {heading}
              </motion.h1>
            </div>
            {!started ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <label className={cn(field, "w-[220px] shrink-0", handleError && "border-[var(--error)]")}>
                  <span className="sr-only">{setup.handleLabel}</span>
                  <span className="text-[14px] text-t3" aria-hidden="true">
                    @
                  </span>
                  <input
                    id="handle"
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value.replace(/^@/, ""));
                      if (e.target.value.trim()) setHandleError(false);
                    }}
                    placeholder={setup.handlePlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={handleError}
                    aria-describedby={message ? "setup-error" : undefined}
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
                  />
                  <XLogo className="size-3.5 shrink-0 text-t3" />
                </label>
                <label className={cn(field, "min-w-0 flex-1", error && "border-[var(--error)]")}>
                  <span className="sr-only">{setup.beatLabel}</span>
                  <input
                    id="beat"
                    value={text}
                    maxLength={setup.beatMax}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.trim()) setError(false);
                    }}
                    placeholder={PLACEHOLDER}
                    autoComplete="off"
                    aria-invalid={error}
                    aria-describedby={message ? "setup-error" : undefined}
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
                  />
                  <span className="shrink-0 text-[11.5px] text-t3 tabular-nums" aria-hidden="true">
                    {text.length}/{setup.beatMax}
                  </span>
                </label>
                <button type="submit" className={cn(primary, "shrink-0")}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {setup.submit}
                </button>
              </div>
            ) : (
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1" style={{ boxShadow: "var(--top-light)" }}>
                  <XLogo className="size-3 text-t1" />@{shownHandle}
                  <span className="sr-only">, your X account</span>
                </span>
                {done ? (
                  <PrimaryLink href={`${BASE}/feed`} className="h-9 px-4 text-[13.5px]">
                    Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
                  </PrimaryLink>
                ) : (
                  <button type="button" disabled aria-disabled="true" className={cn(primary, "cursor-not-allowed opacity-55 hover:brightness-100")}>
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {setup.submit}
                  </button>
                )}
              </div>
            )}
          </div>
          {message && !started ? (
            <p id="setup-error" role="alert" className="mt-2 pl-[288px] text-[12.5px] text-[var(--error)]">
              {message}
            </p>
          ) : null}
        </form>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)_340px]">
          <Timeline
            run={run}
            started={started}
            handle={shownHandle}
            controls={
              started ? (
                <div className="flex items-center gap-4 border-t border-line px-4 py-3">
                  <button
                    type="button"
                    disabled={!live || done}
                    onClick={clock.playing ? clock.pause : clock.resume}
                    className={quietButton}
                  >
                    {live && !clock.playing && !done ? "Resume" : "Pause"}
                  </button>
                  <button type="button" onClick={replay} className={quietButton}>
                    Replay
                  </button>
                </div>
              ) : null
            }
          />

          <section aria-label="Candidates and chosen sources" className="min-w-0">
            <p className="sr-only" aria-live="polite">
              {announce(run)}
            </p>
            {!started ? (
              <Quiet>Candidates and chosen sources appear here as the build runs.</Quiet>
            ) : chooseF > 0 ? (
              <Chosen fraction={chooseF} open={open} onToggle={toggle} />
            ) : (
              <Candidates run={run} />
            )}
          </section>

          <aside aria-label="You" className="min-w-0">
            {!started ? <Quiet>Your profile, brief and posts appear here.</Quiet> : <You run={run} sentence={sentence} />}
          </aside>
        </div>
      </MotionConfig>
    </AppShell>
  );
}

const field =
  "flex h-9 items-center gap-2 rounded-md border border-line-strong bg-[var(--well)] px-3 transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]";
const primary =
  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const quietButton =
  "rounded-sm text-[12.5px] text-t3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50";

/** One quiet line on the open ground, where the run will put its objects. */
function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[13px] text-t3">{children}</p>;
}

/** What a step is doing while it runs: the live count from the recorded run, never a timer's invention. */
function runningLine(id: StepId, run: Run, handle: string) {
  const p = run.progress[idx(id)];
  switch (id) {
    case "profile":
      return `Looking up @${handle} on X.`;
    case "posts":
      return `Read ${Math.max(1, Math.ceil(p * postsRead))} of ${postsRead} newest posts.`;
    case "gather":
      return `${Math.round(p * candidateCount)} candidates so far.`;
    case "jev":
      return `Checked ${Math.round(p * candidateCount)} of ${candidateCount}.`;
    case "choose":
      return `Chose ${Math.max(1, Math.ceil(p * sources.filter((s) => s.group !== "github").length))} so far.`;
    case "brief":
      return "Writing from your sentence and your posts.";
    case "save":
      return "Saving your sources and your brief.";
    default:
      return "";
  }
}

/** The eight steps as records on one lifted card: the mark, the name and one result line, the amber mark while a
 * step runs; finished records keep their line. Pause and Replay sit at its foot. */
function Timeline({ run, started, handle, controls }: { run: Run; started: boolean; handle: string; controls: React.ReactNode }) {
  return (
    <aside aria-label="Steps" className={cn(lift, "overflow-hidden lg:sticky lg:top-[84px]")} style={liftStyle}>
      <ol className="px-3 pt-3 pb-1">
        {stepIds.map((id, i) => {
          const state = run.states[i];
          const settled = state === "done" || state === "skipped" || state === "failed";
          const line = !started || state === "waiting" ? null : settled ? (state === "failed" ? "The X timeline did not answer." : stepLine[id]) : runningLine(id, run, handle);
          return (
            <li
              key={id}
              id={`step-${id}`}
              className={cn("grid grid-cols-[20px_1fr] gap-x-3 rounded-lg px-2 py-2.5", state === "running" && "bg-[var(--caution-soft)]")}
            >
              <span className="pt-px">{started ? <StepMark state={state} size={20} /> : <EmptyRing />}</span>
              <div className="min-w-0">
                <p className={cn("text-[13px] leading-snug", !started || state === "waiting" ? "text-t3" : "font-medium text-t1")}>
                  {state === "running" ? (
                    <Shimmer as="span" duration={1.8} className="font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                      {stepTitle[id]}
                    </Shimmer>
                  ) : (
                    stepTitle[id]
                  )}
                </p>
                {line ? <p className={cn("mt-0.5 text-[12px] leading-snug", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{line}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
      {controls}
    </aside>
  );
}

/** A step before the run: an empty ring, no state yet. */
function EmptyRing() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="var(--line-strong)" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** The centre until Choose sources: Gather candidates (the count ticking, the chips arriving), then Check relevance
 * (Deck's amber bar, the chips settling into the three bands). */
function Candidates({ run }: { run: Run }) {
  const gather = run.states[idx("gather")];
  const jev = run.states[idx("jev")];
  const gatherF = gather === "done" ? 1 : gather === "running" ? run.progress[idx("gather")] : 0;
  const jevF = jev === "done" ? 1 : jev === "running" ? run.progress[idx("jev")] : 0;
  const gathered = take(order, gatherF);
  const checkedN = jev === "waiting" ? 0 : Math.ceil(jevF * order.length);
  const checked = order.slice(0, checkedN);
  const pile = gathered.slice(checkedN);
  const count = Math.round(gatherF * candidateCount);

  if (gather === "waiting")
    return (
      <div>
        <h2 className="text-[15px] font-semibold text-t3">Gather candidates</h2>
        <Quiet>Starts once your newest posts are read.</Quiet>
      </div>
    );

  return (
    <LayoutGroup>
      <div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold text-t1">
            {gather === "running" ? (
              <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                Gather candidates
              </Shimmer>
            ) : (
              "Gather candidates"
            )}
          </h2>
          <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{count}</span>
          <span className="text-[12.5px] text-t3">from the source list and the accounts you quoted</span>
        </div>
        {pile.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {pile.map((c) => (
              <Chip key={c.id} c={c} />
            ))}
          </ul>
        ) : null}

        {jev !== "waiting" ? (
          <div className="mt-8">
            <div className="flex items-center gap-4">
              <h2 className="text-[15px] font-semibold text-t1">
                {jev === "running" ? (
                  <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                    Check relevance
                  </Shimmer>
                ) : (
                  "Check relevance"
                )}
              </h2>
              <p className="flex items-center gap-2.5 text-[12.5px] tabular-nums text-t2">
                Checked {Math.round(jevF * candidateCount)} of {candidateCount}
                <span className="block h-1.5 w-40 rounded-full bg-line-strong" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[var(--caution)]" style={{ width: `${jevF * 100}%` }} />
                </span>
              </p>
            </div>
            {checkedN > 0 ? (
              <div className="mt-4 grid gap-5">
                {bandOrder.map((band) => {
                  const list = checked.filter((c) => bandOf(c.score) === band);
                  if (!list.length) return null;
                  const total = jev === "done" ? (band === "set-aside" ? setAsideCount : kept.filter((c) => bandOf(c.score) === band).length) : list.length;
                  const hidden = band === "set-aside" && jev === "done" ? setAsideCount - droppedSample.length : 0;
                  return (
                    <Pile key={band} tone={band === "set-aside" ? "dim" : undefined}>
                      <motion.section layout="position" className={cn(lift, "p-4", band === "set-aside" && "border-dashed bg-[var(--well)]")} style={liftStyle}>
                        <p className="flex items-baseline gap-2">
                          <span className={cn("text-[13.5px] font-semibold", bandTone[band])}>{bandLabel[band]}</span>
                          <span className="text-[12.5px] tabular-nums text-t3">{total}</span>
                        </p>
                        <ul className="mt-2.5 flex flex-wrap gap-1.5">
                          {list.map((c) => (
                            <Chip key={c.id} c={c} dim={band === "set-aside"} />
                          ))}
                          {hidden > 0 ? (
                            <li className="flex h-8 items-center rounded-full border border-dashed border-line px-3 text-[12.5px] tabular-nums text-t3">{hidden} more</li>
                          ) : null}
                        </ul>
                      </motion.section>
                    </Pile>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </LayoutGroup>
  );
}

const bandTone: Record<Band, string> = { strong: "text-[var(--ok)]", possible: "text-t2", "set-aside": "text-t3" };

/** The Deck building's candidate chip: the logo, the name and the kind, moving between the pile and its band. */
function Chip({ c, dim }: { c: Candidate; dim?: boolean }) {
  const isX = c.kind === "x_account";
  return (
    <motion.li
      layoutId={`cand-${c.id}`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-[12.5px]",
        dim ? "border-dashed border-line bg-transparent text-t3" : "border-line bg-[var(--window)] text-t2",
      )}
    >
      {isX ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={20} className={cn(dim && "opacity-60 grayscale")} /> : <SiteIcon host={hostOf(c.target)} size={20} className={cn("rounded-[5px]", dim && "opacity-60 grayscale")} />}
      <span>{c.name}</span>
      <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3 uppercase">{isX ? "X" : c.kind === "rss" ? "RSS" : "Web"}</span>
    </motion.li>
  );
}

/** The Deck building's Pile: a card with offset backing plates under it. The plates carry no content of their own. */
function Pile({ children, plates = 2, tone }: { children: React.ReactNode; plates?: number; tone?: "dim" }) {
  return (
    <div className="relative" style={{ marginBottom: plates * 9 }}>
      {Array.from({ length: plates }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("absolute rounded-xl border border-line-strong", tone === "dim" ? "bg-[var(--well)]" : "bg-[var(--raised)]")}
          style={{ insetInline: (i + 1) * 12, top: 8, bottom: -(i + 1) * 9, zIndex: 1 - i, boxShadow: "var(--card-shadow)" }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** From Choose sources on, only the chosen sources, grouped by kind, as compact rows; a row opens its reason. */
function Chosen({ fraction, open, onToggle }: { fraction: number; open: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="grid gap-3">
      {kinds.map((k) => {
        const list = take(
          sources.filter((s) => s.group === k.id),
          fraction,
        );
        if (!list.length) return null;
        return (
          <section key={k.id} aria-label={k.label} className={cn(lift, "px-3 pt-3.5 pb-2.5")} style={liftStyle}>
            <h2 className="flex items-center gap-2.5 px-2 text-[15px] font-semibold text-t1">
              <span className="grid size-5 place-items-center text-t3">
                <GroupGlyph group={k.id} className="size-3.5" />
              </span>
              {k.label}
            </h2>
            <ul className="mt-2 grid grid-cols-1 items-start gap-x-2 xl:grid-cols-2">
              {list.map((s) => (
                <motion.li key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                  <ChosenRow source={s} group={k.id} open={open.has(s.id)} onToggle={() => onToggle(s.id)} />
                </motion.li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ChosenRow({ source: s, group, open, onToggle }: { source: Source; group: Group; open: boolean; onToggle: () => void }) {
  const quote = group === "x" ? posts.find((p) => p.quoted?.author.toLowerCase() === s.handle.toLowerCase()) : undefined;
  return (
    <div className={cn("rounded-md transition-colors", open ? "bg-[var(--raised)]" : "hover:bg-raised")}>
      <button
        type="button"
        onClick={s.why ? onToggle : undefined}
        aria-expanded={s.why ? open : undefined}
        className="flex min-h-10 w-full min-w-0 items-center gap-3 rounded-md px-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SourceMark source={s} size={20} className={group === "x" ? "" : "rounded-[5px]"} />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
          <span className="ml-2 text-[12.5px] text-t3">{group === "x" ? s.handle : s.mark}</span>
        </span>
      </button>
      {open && s.why ? (
        <div className="pr-3 pb-3 pl-[44px] text-[13px] leading-[1.5]">
          <p className="text-t2">{s.why}</p>
          {quote ? (
            <div className="mt-2.5 rounded-lg border border-line bg-[var(--window)] p-3 shadow-[var(--top-light)]">
              <PostBody post={quote} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
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

/** The right column: ONE identity block (the person, then About: the sentence, the brief, the interests, the
 * language), and the newest posts continuing under it as one list. */
function You({ run, sentence }: { run: Run; sentence: string }) {
  const reduce = useReducedMotion();
  const pState = run.states[idx("profile")];
  const postsState = run.states[idx("posts")];
  const briefState = run.states[idx("brief")];
  const shownPosts = postsState === "running" ? take(posts, run.progress[idx("posts")]) : postsState === "waiting" ? [] : posts;
  const words = brief.summary.split(" ");
  const summary = briefState === "running" ? words.slice(0, Math.max(1, Math.ceil(run.progress[idx("brief")] * words.length))).join(" ") : brief.summary;

  return (
    <div className="grid gap-5">
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        aria-label="Your profile"
        className={cn(lift, "p-4")}
        style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        {pState === "running" || pState === "waiting" ? (
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full bg-[var(--raised)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-44 bg-[var(--raised)]" />
              <Skeleton className="h-3 w-56 bg-[var(--raised)]" />
            </div>
          </div>
        ) : (
          <>
            <XAvatar handle={HANDLE} size={44} />
            <p className="mt-3 truncate text-[14.5px]">
              <span className="font-semibold text-t1">{profile.name}</span>
              <span className="ml-1.5 text-t3">{profile.handle}</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[13px] font-semibold text-t1">About</p>
              <p className="mt-2 flex gap-2 text-[13px] leading-[1.45] font-medium text-t1">
                <QuoteMark className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                {sentence}
              </p>
              {briefState === "running" || briefState === "done" ? (
                <p className="mt-2.5 text-[13px] leading-[1.55] text-t2">
                  {summary}
                  {briefState === "running" ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" /> : null}
                </p>
              ) : (
                <p className="mt-2.5 text-[12.5px] text-t3">The brief is written once your sources are chosen.</p>
              )}
              {briefState === "done" ? (
                <div className="mt-3.5 space-y-3 text-[12.5px]">
                  <div className="flex flex-wrap gap-1.5">
                    {brief.interests.map((t) => (
                      <span key={t} className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-t3">
                    Language <span className="ml-1 text-t1">{brief.languages.join(", ")}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </motion.section>

      {postsState !== "waiting" ? (
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-t1">
            {postsState === "running" ? (
              <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                Your newest posts
              </Shimmer>
            ) : (
              "Your newest posts"
            )}
          </p>
          <ul className="grid gap-2.5">
            {shownPosts.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={cn(lift, "p-3")}
                style={liftStyle}
              >
                <PostBody post={p} />
              </motion.li>
            ))}
          </ul>
          {postsState !== "running" ? (
            <p className="mt-2.5 text-[12px] text-t3">
              {postsRead - posts.length} more of your {postsRead} newest posts have no stored text in this sample.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
