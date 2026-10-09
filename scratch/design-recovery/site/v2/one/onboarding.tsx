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
  oneStepDoes,
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
  sourceTable,
  type Band,
  type Candidate,
  type TableRow,
} from "@/next/data/onboarding";
import { setup } from "@/next/copy";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink } from "@/v2/deck/chrome";
import { beat, groups, HANDLE, hostOf, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, SiteIcon, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { AppShell, RailMark, RailTitle } from "./shell";

// One onboarding, which the feed holds (owner, Oct 5: "The feed itself will have the onboarding if the feed has not
// been constructed"): /v2/one/feed?agent=none, in the page's one column. At rest it is the run's page with nothing
// looked up yet. The page line: "Set up your agent", then the Twitter handle, the sentence and Build my agent on one line
// (no card). The seven steps of the real engine stand in the shell's rail, in its middle band where the sources go
// (empty rings, one line each saying what the step does), through rest, the run and ready; the kept sources take
// their place only once the person opens Feed. Under the page line the centre holds the shared source table every
// run starts from. The right column does not exist until step 1 finds the person; then it opens (300ms) with ONE identity block (picture,
// name beside it, handle under, About, Brief) and the newest posts under it, and the centre narrows. Once the run
// gathers, the centre ACCUMULATES top to bottom and never removes a block: the candidates gathered, Jev's verdict
// for each (the band word, never the number) and the three bands, the chosen sources as removable pills, the search
// line, the save line. The replay runs 48 seconds (next/building/steps.ts) and can be paused and replayed;
// ?at=1..7 and ?at=done freeze it.

const take = <T,>(list: T[], f: number) => list.slice(0, Math.ceil(f * list.length));
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
/** The chosen sources' kinds. The recorded run chose sites, feeds and Twitter accounts; it chose no GitHub repository. */
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

const HANDLE_REQUIRED = "Type the Twitter handle your agent is built around.";
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
  const heading = !started
    ? "Set up your agent"
    : done
      ? "Your agent is ready"
      : st("choose") === "done"
        ? "Saving your agent"
        : "Choosing sources";
  const message = [handleError ? HANDLE_REQUIRED : null, error ? setup.beatRequired : null]
    .filter(Boolean)
    .join(" ");
  const sentence = text.trim() || beat;
  const shownHandle = handle.trim() || HANDLE;
  // The right column exists only once step 1 has found the person.
  const found = started && st("profile") === "done";
  const gathering = started && st("gather") !== "waiting";

  const replay = () => {
    setLive(true);
    setRemoved(new Set());
    clock.replay();
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

  const controls = started ? (
    <div className="mx-4 mt-1 flex items-center gap-x-4 border-t border-line pt-3">
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
  ) : null;

  return (
    <AppShell middle={<Timeline run={run} started={started} handle={shownHandle} controls={controls} />}>
      <MotionConfig reducedMotion="user">
        <form
          noValidate
          aria-label="Set up your agent"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex min-h-12 items-center gap-6"
        >
          <div aria-live="polite" className="flex shrink-0 items-center gap-3">
            <RailMark />
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
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
            {started ? (
              <span
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1"
                style={{ boxShadow: "var(--top-light)" }}
              >
                <XLogo className="size-3 text-t1" />@{shownHandle}
                <span className="sr-only">, your Twitter account</span>
              </span>
            ) : (
              <SetupLine
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
              />
            )}
            {done ? (
              <PrimaryLink href={`${BASE}/feed`} className="h-10 shrink-0 px-4 text-[13.5px]">
                Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
              </PrimaryLink>
            ) : (
              <button
                type="submit"
                disabled={started}
                aria-disabled={started}
                className={cn(
                  primary,
                  "h-10 shrink-0",
                  started && "cursor-not-allowed opacity-55 hover:brightness-100",
                )}
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                {setup.submit}
              </button>
            )}
          </div>
        </form>
        {message && !started ? (
          <p
            id="setup-error"
            role="alert"
            className="mt-2 text-right text-[12.5px] text-[var(--error)]"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-6">
          <div className="flex min-w-0 items-start">
            <section
              aria-label={gathering ? "Your run" : "The shared source table"}
              className="min-w-0 flex-1"
            >
              <p className="sr-only" aria-live="polite">
                {oneAnnounce(run)}
              </p>
              {gathering ? (
                <Stream
                  run={run}
                  removed={removed}
                  onRemove={(id) => setRemoved((prev) => new Set(prev).add(id))}
                  follow={live && clock.playing}
                  whyOf={whyOf}
                  onWhy={(id) => setWhyOf((cur) => (cur === id ? null : id))}
                />
              ) : (
                <SourceTable />
              )}
            </section>

            <AnimatePresence initial={false}>
              {found ? (
                <motion.aside
                  key="you"
                  aria-label="You"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 364, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="w-[364px] pl-6">
                    <You run={run} sentence={sentence} />
                  </div>
                </motion.aside>
              ) : null}
            </AnimatePresence>
          </div>
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

/** The setup on the page line, no card: the Twitter handle (220px, @ and the X mark inside), the sentence (one line,
 * flexible, the counter inside). Build my agent follows at the line's right end. */
function SetupLine({
  handle,
  text,
  handleError,
  error,
  message,
  onHandle,
  onText,
}: {
  handle: string;
  text: string;
  handleError: boolean;
  error: boolean;
  message: string;
  onHandle: (v: string) => void;
  onText: (v: string) => void;
}) {
  return (
    <>
      <label
        className={cn(field, "h-10 w-[220px] shrink-0", handleError && "border-[var(--error)]")}
      >
        <span className="sr-only">{setup.handleLabel}</span>
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
      </label>
      <label className={cn(field, "h-10 min-w-0 flex-1", error && "border-[var(--error)]")}>
        <span className="sr-only">{setup.beatLabel}</span>
        <input
          id="beat"
          value={text}
          maxLength={setup.beatMax}
          onChange={(e) => onText(e.target.value)}
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
    </>
  );
}

const tableKinds: { kind: TableRow["kind"]; group: Group; label: string }[] = [
  { kind: "x_account", group: "x", label: "Twitter accounts" },
  { kind: "rss", group: "rss", label: "RSS feeds" },
  { kind: "website", group: "website", label: "Websites" },
];
const addressOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** The centre before the run gathers: the shared source table the run starts from (docs/source-table-seed.json),
 * one lifted panel, grouped by kind under plain 13px labels, one line per row (logo, name, handle or address). The
 * table holds no GitHub rows, so no GitHub group is drawn. */
function SourceTable() {
  return (
    <div className={cn(lift, "divide-y divide-line")} style={liftStyle}>
      <p className="px-5 py-3.5 text-[13px] text-t3">
        Every agent starts from these; your run scores them for your beat.
      </p>
      {tableKinds.map(({ kind, group, label }) => {
        const rows = sourceTable.filter((r) => r.kind === kind);
        return (
          <section key={kind} aria-label={label} className="px-3 pt-3.5 pb-3">
            <p className="flex items-center gap-2 px-2 text-[13px] font-semibold text-t1">
              <span className="grid size-[18px] place-items-center text-t3">
                <GroupGlyph group={group} className="size-3.5" />
              </span>
              {label}
            </p>
            <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-x-2">
              {rows.map((r) => {
                const isX = kind === "x_account";
                const handle = isX
                  ? `@${r.target.replace("https://x.com/", "")}`
                  : addressOf(r.target);
                return (
                  <li key={r.id} className="flex h-8 min-w-0 items-center gap-2.5 rounded-md px-2">
                    {isX ? (
                      <XAvatar handle={handle} size={18} />
                    ) : (
                      <SiteIcon host={hostOf(r.target)} size={18} className="rounded-[5px]" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      <span className="font-medium text-t1">{r.name}</span>
                      <span className="ml-1.5 text-[12px] text-t3">{handle}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
/** What a step is doing while it runs: the live count from the recorded run, never a timer's invention. */
function runningLine(id: OneStepId, run: Run, handle: string) {
  const p = run.progress[idx(id)];
  switch (id) {
    case "profile":
      return `Looking up @${handle} on Twitter.`;
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
  if (!started || state === "waiting") return oneStepDoes[id];
  if (state === "failed") return "The Twitter timeline did not answer.";
  return state === "done" || state === "skipped" ? oneStepLine[id] : runningLine(id, run, handle);
}

/** The seven steps in the rail's middle band, the same list and states as before: the mark, the name and one line
 * (what the step does while it waits, its live count while it runs, its result once done), the amber ground while a
 * step runs. Pause and Replay sit under the list once the run has started. */
function Timeline({ run, started, handle, controls }: { run: Run; started: boolean; handle: string; controls: React.ReactNode }) {
  return (
    <section aria-label="Steps" className="pb-4">
      <RailTitle>Steps</RailTitle>
      <ol className="px-2 pt-1 pb-1">
        {oneStepIds.map((id, i) => {
          const state = run.states[i];
          const line = stepLineFor(id, run, started, handle);
          return (
            <li
              key={id}
              id={`step-${id}`}
              className={cn("grid grid-cols-[20px_1fr] gap-x-3 rounded-lg px-2 py-2", state === "running" && "bg-[var(--caution-soft)]")}
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
    </section>
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
                    <motion.section key={band} layout="position" className={cn(lift, "p-4")} style={liftStyle}>
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
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {choose !== "waiting" ? (
          <section id="block-choose" aria-label="Choose sources and write the brief" className="scroll-mt-6">
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
          <section aria-label="Search Twitter for more accounts">
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
      <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3 uppercase">{isX ? "Twitter" : c.kind === "rss" ? "RSS" : "Web"}</span>
    </motion.li>
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

/** The right column, once step 1 has found the person: ONE identity block (the picture with the name beside it and
 * the handle under the name, About with their Twitter bio, then Brief: the sentence, then the summary streaming in at
 * step 5), and the newest posts under it. */
function You({ run, sentence }: { run: Run; sentence: string }) {
  const postsState = run.states[idx("posts")];
  const chooseState = run.states[idx("choose")];
  const shownPosts =
    postsState === "running"
      ? take(posts, run.progress[idx("posts")])
      : postsState === "waiting"
        ? []
        : posts;
  const words = brief.summary.split(" ");
  const f =
    chooseState === "done"
      ? 1
      : chooseState === "running"
        ? briefF(run.progress[idx("choose")])
        : 0;
  const summary = f >= 1 ? brief.summary : words.slice(0, Math.ceil(f * words.length)).join(" ");

  return (
    <div className="grid gap-5">
      <section
        aria-label="Your profile"
        className={cn(lift, "p-4")}
        style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        <div className="flex items-center gap-3">
          <XAvatar handle={HANDLE} size={48} />
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-semibold text-t1">
              {profile.name}
            </p>
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
            <QuoteMark
              className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]"
              aria-hidden="true"
            />
            {sentence}
          </p>
          {summary ? (
            <p className="mt-2.5 text-[13px] leading-[1.55] text-t2">
              {summary}
              {chooseState === "running" ? (
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" />
              ) : null}
            </p>
          ) : null}
        </div>
      </section>

      {postsState !== "waiting" ? (
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-t1">
            {postsState === "running" ? (
              <Shimmer
                as="span"
                duration={1.8}
                className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]"
              >
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
        </div>
      ) : null}
    </div>
  );
}
