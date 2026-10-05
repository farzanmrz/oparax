"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Quote as QuoteMark, Sparkles, X as CloseIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, MotionConfig, useReducedMotion } from "motion/react";
import {
  isDone,
  ONE_REPLAY_MS,
  oneAnnounce,
  oneRunAt,
  oneRunFailed,
  oneRunFrozen,
  oneStepIds,
  oneStepLine,
  oneStepTitle,
  type OneStepId,
  type Run,
} from "@/next/building/steps";
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

// One onboarding, which the feed holds (owner, Oct 5: "The feed itself will have the onboarding if the feed has not
// been constructed"): /v2/one/feed?agent=none, full width with 32px at each side. The page line holds the heading;
// once the run starts, the X account and the button at its right. Three columns under it: the seven steps of the
// real engine on the left, prefilled as empty rings before the run; the setup card centred in the middle (the X
// handle, the sentence, Build my agent), replaced in place by the run as it streams, ACCUMULATING top to bottom and
// never removing a block: the candidates gathered, Jev's verdict for each (the band word, never the number), the
// chosen sources as removable pills, the search line, the save line; and the person on the right as ONE identity
// block (picture, name and handle, About, Brief) with their newest posts under it. ?layout=top turns the steps
// into a row of tiles above. The replay runs 48 seconds (next/building/steps.ts) and can be paused and replayed.
// ?at=1..7 and ?at=done freeze it for screenshots.

export type Layout = "columns" | "top";

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
/** The chosen sources' kinds. The recorded run chose sites, feeds and X accounts; it chose no GitHub repository. */
const kinds = groups.filter((g) => g.id !== "github" && sources.some((s) => s.group === g.id));
const chosenTotal = sources.filter((s) => s.group !== "github").length;

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
const before: Run = { states: oneStepIds.map(() => "waiting"), progress: oneStepIds.map(() => 0) };
const idx = (id: OneStepId) => oneStepIds.indexOf(id);

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
      at.current = Math.min(ONE_REPLAY_MS, at.current + (now - last));
      last = now;
      setElapsed(at.current);
      if (at.current >= ONE_REPLAY_MS) setPlaying(false);
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
  initialLayout = "columns",
}: {
  mode: RunMode;
  /** The run is on the page at load (?at= or ?state=failed); otherwise the page opens before the run. */
  started?: boolean;
  why?: string | null;
  typed?: boolean;
  blank?: boolean;
  initialLayout?: Layout;
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
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [whyOf, setWhyOf] = useState<string | null>(why);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());

  const run: Run = !started
    ? before
    : live
      ? oneRunAt(clock.elapsed)
      : mode.kind === "frozen"
        ? oneRunFrozen(mode.at)
        : mode.kind === "failed"
          ? oneRunFailed()
          : oneRunAt(clock.elapsed);
  const done = started && isDone(run);
  const st = (id: OneStepId) => run.states[idx(id)];
  const heading = !started ? "Set up your agent" : done ? "Your agent is ready" : st("choose") === "done" ? "Saving your agent" : "Choosing sources";
  const message = [handleError ? HANDLE_REQUIRED : null, error ? setup.beatRequired : null].filter(Boolean).join(" ");
  const sentence = text.trim() || beat;
  const shownHandle = handle.trim() || HANDLE;

  const replay = () => {
    setLive(true);
    setRemoved(new Set());
    clock.replay();
  };
  const chooseLayout = (next: Layout) => {
    setLayout(next);
    const q = new URLSearchParams(location.search);
    if (next === "top") q.set("layout", "top");
    else q.delete("layout");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  };
  const submit = () => {
    if (started) return;
    const h = handle.trim();
    const t = text.trim();
    setHandleError(!h);
    setError(!t);
    if (!h || !t) return;
    setStarted(true);
    replay();
  };

  const controls = (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", layout === "columns" && "border-t border-line px-4 py-3")}>
      {started ? (
        <>
          <button type="button" disabled={!live || done} onClick={clock.playing ? clock.pause : clock.resume} className={quietButton}>
            {live && !clock.playing && !done ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={replay} className={quietButton}>
            Replay
          </button>
        </>
      ) : null}
      <LayoutSwitch layout={layout} onChange={chooseLayout} />
    </div>
  );

  return (
    <AppShell full>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-9 items-center gap-6">
          <div aria-live="polite">
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
          {started ? (
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
          ) : null}
        </div>

        {layout === "top" ? <TopSteps run={run} started={started} handle={shownHandle} controls={controls} /> : null}

        <div
          className={cn(
            "grid grid-cols-1 items-start gap-6",
            layout === "top" ? "mt-5 lg:grid-cols-[minmax(0,1fr)_400px]" : "mt-6 lg:grid-cols-[264px_minmax(0,1fr)_340px]",
          )}
        >
          {layout === "columns" ? <Timeline run={run} started={started} handle={shownHandle} controls={controls} /> : null}

          <section aria-label="Setup and run" className="min-w-0">
            <p className="sr-only" aria-live="polite">
              {oneAnnounce(run)}
            </p>
            {!started ? (
              <SetupCard
                handle={handle}
                text={text}
                handleError={handleError}
                error={error}
                message={message}
                onHandle={(v) => {
                  setHandle(v.replace(/^@/, ""));
                  if (v.trim()) setHandleError(false);
                }}
                onText={(v) => {
                  setText(v);
                  if (v.trim()) setError(false);
                }}
                onSubmit={submit}
              />
            ) : (
              <Stream
                run={run}
                removed={removed}
                onRemove={(id) => setRemoved((prev) => new Set(prev).add(id))}
                follow={live && clock.playing}
                whyOf={whyOf}
                onWhy={(id) => setWhyOf((cur) => (cur === id ? null : id))}
              />
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
  "flex items-center gap-2 rounded-md border border-line-strong bg-[var(--well)] px-3 transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]";
const primary =
  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const quietButton =
  "rounded-sm text-[12.5px] text-t3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50";

/** One quiet line on the open ground, where the run will put its objects. */
function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[13px] text-t3">{children}</p>;
}

/** "Layout: Columns | Top": two quiet text buttons that flip the page live. */
function LayoutSwitch({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  return (
    <p className="flex items-center gap-2 text-[12.5px] text-t3">
      Layout:
      {(["columns", "top"] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 ? (
            <span aria-hidden="true" className="text-t4">
              |
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={layout === l}
            onClick={() => onChange(l)}
            className={cn(
              "rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              layout === l ? "font-medium text-t1" : "underline decoration-line-strong underline-offset-4 hover:text-t1 hover:decoration-current",
            )}
          >
            {l === "columns" ? "Columns" : "Top"}
          </button>
        </span>
      ))}
    </p>
  );
}

/** The setup, centred in the middle column: one lifted card with the X handle, the sentence and Build my agent. */
function SetupCard({
  handle,
  text,
  handleError,
  error,
  message,
  onHandle,
  onText,
  onSubmit,
}: {
  handle: string;
  text: string;
  handleError: boolean;
  error: boolean;
  message: string;
  onHandle: (v: string) => void;
  onText: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      noValidate
      aria-label="Set up your agent"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn(lift, "mx-auto w-full max-w-[560px] p-6")}
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <label htmlFor="handle" className="block text-[13px] font-semibold text-t1">
        {setup.handleLabel}
      </label>
      <div className={cn(field, "mt-2 h-10", handleError && "border-[var(--error)]")}>
        <span className="text-[14px] text-t3" aria-hidden="true">
          @
        </span>
        <input
          id="handle"
          value={handle}
          onChange={(e) => onHandle(e.target.value)}
          placeholder={setup.handlePlaceholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={handleError}
          aria-describedby={message ? "setup-error" : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
        />
        <XLogo className="size-3.5 shrink-0 text-t3" />
      </div>

      <label htmlFor="beat" className="mt-5 block text-[13px] font-semibold text-t1">
        {setup.beatLabel}
      </label>
      <div className={cn(field, "mt-2 items-start py-2.5", error && "border-[var(--error)]")}>
        <textarea
          id="beat"
          value={text}
          rows={3}
          maxLength={setup.beatMax}
          onChange={(e) => onText(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-invalid={error}
          aria-describedby={message ? "setup-error" : undefined}
          className="min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-[1.5] text-t1 outline-none placeholder:text-t3"
        />
      </div>
      <p className="mt-1.5 text-right text-[11.5px] text-t3 tabular-nums" aria-hidden="true">
        {text.length}/{setup.beatMax}
      </p>

      {message ? (
        <p id="setup-error" role="alert" className="mt-2 text-[12.5px] text-[var(--error)]">
          {message}
        </p>
      ) : null}
      <p className="mt-4 text-[12.5px] leading-[1.5] text-t3">Your public X handle is enough. No sign-in with X needed.</p>
      <button type="submit" className={cn(primary, "mt-5 h-10 w-full justify-center")}>
        <Sparkles className="size-3.5" aria-hidden="true" />
        {setup.submit}
      </button>
    </form>
  );
}

/** What a step is doing while it runs: the live count from the recorded run, never a timer's invention. */
function runningLine(id: OneStepId, run: Run, handle: string) {
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
      return `Chose ${Math.max(1, Math.ceil(pillsF(p) * chosenTotal))} so far. Writing your brief.`;
    case "search":
      return "Deciding whether more accounts are needed.";
    case "save":
      return "Saving your sources and your brief.";
  }
}

/** Within step 5 the pills arrive over the first 80 percent; the brief streams from 15 percent to the end. */
const pillsF = (p: number) => Math.min(1, p / 0.8);
const briefF = (p: number) => Math.max(0, Math.min(1, (p - 0.15) / 0.85));

function stepLineFor(id: OneStepId, run: Run, started: boolean, handle: string) {
  const state = run.states[idx(id)];
  if (!started || state === "waiting") return null;
  if (state === "failed") return "The X timeline did not answer.";
  return state === "done" || state === "skipped" ? oneStepLine[id] : runningLine(id, run, handle);
}

/** The seven steps as records on one lifted card: the mark, the name and one result line, the amber mark while a
 * step runs; finished records keep their line. Pause, Replay and the layout switch sit at its foot. */
function Timeline({ run, started, handle, controls }: { run: Run; started: boolean; handle: string; controls: React.ReactNode }) {
  return (
    <aside aria-label="Steps" className={cn(lift, "overflow-hidden lg:sticky lg:top-[84px]")} style={liftStyle}>
      <ol className="px-3 pt-3 pb-1">
        {oneStepIds.map((id, i) => {
          const state = run.states[i];
          const line = stepLineFor(id, run, started, handle);
          return (
            <li
              key={id}
              id={`step-${id}`}
              className={cn("grid grid-cols-[20px_1fr] gap-x-3 rounded-lg px-2 py-2.5", state === "running" && "bg-[var(--caution-soft)]")}
            >
              <span className="pt-px">{started ? <StepMark state={state} size={20} /> : <EmptyRing />}</span>
              <div className="min-w-0">
                <StepName id={id} state={state} started={started} />
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

function StepName({ id, state, started }: { id: OneStepId; state: Run["states"][number]; started: boolean }) {
  return (
    <p className={cn("text-[13px] leading-snug", !started || state === "waiting" ? "text-t3" : "font-medium text-t1")}>
      {state === "running" ? (
        <Shimmer as="span" duration={1.8} className="font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
          {oneStepTitle[id]}
        </Shimmer>
      ) : (
        oneStepTitle[id]
      )}
    </p>
  );
}

/** The second layout: the seven steps as a row of tiles under the page line (name, result line, state mark; the
 * active one amber), with Pause, Replay and the layout switch at the right end of the row. */
function TopSteps({ run, started, handle, controls }: { run: Run; started: boolean; handle: string; controls: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-stretch gap-4">
      <ol aria-label="Steps" className="grid min-w-0 flex-1 grid-cols-7 gap-3">
        {oneStepIds.map((id, i) => {
          const state = run.states[i];
          const line = stepLineFor(id, run, started, handle);
          return (
            <li
              key={id}
              id={`step-${id}`}
              className={cn(lift, "flex min-w-0 flex-col gap-2 p-3", state === "running" && "bg-[var(--caution-soft)]")}
              style={liftStyle}
            >
              <span>{started ? <StepMark state={state} size={20} /> : <EmptyRing />}</span>
              <StepName id={id} state={state} started={started} />
              {line ? <p className={cn("text-[12px] leading-snug", state === "failed" ? "text-[var(--error)]" : "text-t3")}>{line}</p> : null}
            </li>
          );
        })}
      </ol>
      <div className="flex w-[148px] shrink-0 flex-col justify-end gap-2 pb-1">{controls}</div>
    </div>
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

/** A block's label in the run: 13px semibold, shimmering while its step runs. */
function Label({ running, children, className }: { running?: boolean; children: string; className?: string }) {
  return (
    <h2 className={cn("text-[13px] font-semibold text-t1", className)}>
      {running ? (
        <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
          {children}
        </Shimmer>
      ) : (
        children
      )}
    </h2>
  );
}

/** The centre once the run starts. It ACCUMULATES top to bottom and nothing is removed when a later step starts:
 * the candidates gathered, Jev's verdicts and the three bands, the chosen sources, the search line, the save line. */
function Stream({
  run,
  removed,
  onRemove,
  whyOf,
  onWhy,
  follow,
}: {
  follow: boolean;
  run: Run;
  removed: Set<string>;
  onRemove: (id: string) => void;
  whyOf: string | null;
  onWhy: (id: string) => void;
}) {
  const gather = run.states[idx("gather")];
  const jev = run.states[idx("jev")];
  const choose = run.states[idx("choose")];
  const search = run.states[idx("search")];
  const save = run.states[idx("save")];
  const gatherF = gather === "done" ? 1 : gather === "running" ? run.progress[idx("gather")] : 0;
  const jevF = jev === "done" ? 1 : jev === "running" ? run.progress[idx("jev")] : 0;
  const chooseP = choose === "done" ? 1 : choose === "running" ? run.progress[idx("choose")] : 0;
  const gathered = take(order, gatherF);
  const checkedN = jev === "waiting" ? 0 : Math.ceil(jevF * order.length);
  const checked = order.slice(0, checkedN);
  const pile = gathered.slice(checkedN);
  const count = Math.round(gatherF * candidateCount);

  // While the replay runs, when the sources start arriving, bring them into view: the bands above are tall, and the newest work is what
  // the person is watching. The blocks above stay where they are, a scroll up away.
  const reduce = useReducedMotion();
  const choosing = choose !== "waiting";
  useEffect(() => {
    if (choosing && follow) document.getElementById("block-choose")?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [choosing, follow, reduce]);

  if (gather === "waiting") return <Quiet>Candidates and the sources chosen from them appear here once your newest posts are read.</Quiet>;

  return (
    <LayoutGroup>
      <div className="grid gap-5">
        <section aria-label="Gathering candidates">
          <div className="flex items-baseline gap-3">
            <Label running={gather === "running"}>Gathering candidates</Label>
            <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{count}</span>
            <span className="text-[12.5px] text-t3">from the source list and the accounts you quoted</span>
          </div>
          {pile.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {pile.map((c) => (
                <Chip key={c.id} c={c} />
              ))}
            </ul>
          ) : null}
        </section>

        {jev !== "waiting" ? (
          <section aria-label="Jev scores every candidate">
            <div className="flex items-center gap-4">
              <Label running={jev === "running"}>Jev scores every candidate</Label>
              <p className="flex items-center gap-2.5 text-[12.5px] tabular-nums text-t2">
                Checked {Math.round(jevF * candidateCount)} of {candidateCount}
                <span className="block h-1.5 w-40 rounded-full bg-line-strong" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[var(--caution)]" style={{ width: `${jevF * 100}%` }} />
                </span>
              </p>
            </div>
            <VerdictLog list={checked} done={jev === "done"} />
            {checkedN > 0 ? (
              <div className="mt-5 grid gap-5">
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
          </section>
        ) : null}

        {choose !== "waiting" ? (
          <section id="block-choose" aria-label="Choose sources and write the brief" className="scroll-mt-[84px]">
            <Label running={choose === "running"}>{oneStepTitle.choose}</Label>
            <div className="mt-3 grid gap-4">
              {kinds.map((k) => {
                const list = take(
                  sources.filter((s) => s.group === k.id),
                  pillsF(chooseP),
                ).filter((s) => !removed.has(s.id));
                if (!list.length) return null;
                const open = list.find((s) => s.id === whyOf);
                return (
                  <div key={k.id} role="group" aria-label={k.label}>
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-t1">
                      <span className="grid size-[18px] place-items-center text-t3">
                        <GroupGlyph group={k.id} className="size-3.5" />
                      </span>
                      {k.label}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      <AnimatePresence initial={false}>
                        {list.map((s) => (
                          <Pill key={s.id} source={s} group={k.id} on={whyOf === s.id} onWhy={() => onWhy(s.id)} onRemove={() => onRemove(s.id)} />
                        ))}
                      </AnimatePresence>
                    </ul>
                    {open?.why ? (
                      <p className="mt-2 text-[13px] leading-[1.5] text-t2">
                        <span className="font-medium text-t1">{open.name}</span> {open.why}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {search !== "waiting" ? (
          <section aria-label="Search X for more accounts">
            <Label>{oneStepTitle.search}</Label>
            <p className="mt-1 text-[13px] text-t2">{oneStepLine.search}</p>
          </section>
        ) : null}

        {save !== "waiting" ? (
          <section aria-label="Save your agent">
            <Label running={save === "running"}>{oneStepTitle.save}</Label>
            <p className="mt-1 text-[13px] text-t2">{save === "done" ? "Saved." : "Saving your sources and your brief."}</p>
          </section>
        ) : null}
      </div>
    </LayoutGroup>
  );
}

/** Jev's verdicts, one line per candidate as it is scored, newest at the bottom: the logo, the name and the band
 * word. Never the number (the product shows three bands). The log holds every line and keeps the newest in view. */
function VerdictLog({ list, done }: { list: Candidate[]; done: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length, done]);
  if (!list.length) return null;
  return (
    <ul
      ref={ref}
      aria-label="Jev's verdicts"
      tabIndex={0}
      className="mt-3 max-h-[236px] overflow-y-auto rounded-lg border border-line bg-[var(--well)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {list.map((c) => {
        const band = bandOf(c.score);
        const isX = c.kind === "x_account";
        return (
          <li key={c.id} className="flex h-7 items-center gap-2.5 text-[12.5px] text-t2">
            {isX ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={18} /> : <SiteIcon host={hostOf(c.target)} size={18} className="rounded-[5px]" />}
            <span className="w-[200px] min-w-0 truncate">{c.name}</span>
            <span className={cn("font-medium", bandTone[band])}>{bandLabel[band]}</span>
          </li>
        );
      })}
      {done ? <li className="flex h-7 items-center text-[12.5px] text-t3">{setAsideCount - droppedSample.length} more candidates were scored and set aside the same way.</li> : null}
    </ul>
  );
}

/** A chosen source as a pill: the logo, the name and the handle or address on one line, and a small x at its right
 * that removes it (a 150ms fade). The body opens its reason in a quiet line under the group. */
function Pill({ source: s, group, on, onWhy, onRemove }: { source: Source; group: Group; on: boolean; onWhy: () => void; onRemove: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: EASE }}
      className={cn(
        "flex h-8 items-center rounded-full border text-[12.5px] transition-colors",
        on ? "border-[var(--brand-line)] bg-[var(--raised)]" : "border-line-strong bg-[var(--window)]",
      )}
      style={{ boxShadow: "var(--top-light)" }}
    >
      <button
        type="button"
        onClick={s.why ? onWhy : undefined}
        aria-expanded={s.why ? on : undefined}
        className="flex h-full min-w-0 items-center gap-2 rounded-l-full pr-1 pl-1.5 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SourceMark source={s} size={20} className={group === "x" ? "" : "rounded-[5px]"} />
        <span className="font-medium whitespace-nowrap text-t1">{s.name}</span>
        <span className="whitespace-nowrap text-t3">{group === "x" ? s.handle : s.mark}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${s.name}`}
        className="mr-1 grid size-6 shrink-0 place-items-center rounded-full text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CloseIcon className="size-3" aria-hidden="true" />
      </button>
    </motion.li>
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

/** The right column: ONE identity block (the picture with the name beside it and the handle under the name, About
 * with their X bio, then Brief: the sentence, the summary streaming in at step 5, the interests, the language), and
 * the newest posts continuing under it as one list. */
function You({ run, sentence }: { run: Run; sentence: string }) {
  const reduce = useReducedMotion();
  const pState = run.states[idx("profile")];
  const postsState = run.states[idx("posts")];
  const chooseState = run.states[idx("choose")];
  const shownPosts = postsState === "running" ? take(posts, run.progress[idx("posts")]) : postsState === "waiting" ? [] : posts;
  const words = brief.summary.split(" ");
  const f = chooseState === "done" ? 1 : chooseState === "running" ? briefF(run.progress[idx("choose")]) : 0;
  const summary = f >= 1 ? brief.summary : words.slice(0, Math.ceil(f * words.length)).join(" ");

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
            <Skeleton className="size-12 rounded-full bg-[var(--raised)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-36 bg-[var(--raised)]" />
              <Skeleton className="h-3 w-24 bg-[var(--raised)]" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <XAvatar handle={HANDLE} size={48} />
              <div className="min-w-0">
                <p className="truncate text-[15px] leading-tight font-semibold text-t1">{profile.name}</p>
                <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">{profile.handle}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[13px] font-semibold text-t1">About</p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[13px] font-semibold text-t1">Brief</p>
              <p className="mt-2 flex gap-2 text-[13px] leading-[1.45] font-medium text-t1">
                <QuoteMark className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                {sentence}
              </p>
              {chooseState === "running" || chooseState === "done" ? (
                <p className="mt-2.5 text-[13px] leading-[1.55] text-t2">
                  {summary}
                  {chooseState === "running" ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" /> : null}
                </p>
              ) : (
                <p className="mt-2.5 text-[12.5px] text-t3">The brief is written once your sources are chosen.</p>
              )}
              {chooseState === "done" ? (
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
