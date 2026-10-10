"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleDashed, Quote as QuoteMark, Sparkles, X as CloseIcon } from "lucide-react";
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
  chosenAccounts,
  chosenSites,
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
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink } from "@/v2/deck/chrome";
import { beat, groups, HANDLE, hostOf, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, SiteIcon, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { AppShell, hue, RailMark, railRow } from "./shell";
import { useDirection, type Dir } from "./direction";

// One onboarding, which the feed holds (owner, Oct 5: "The feed itself will have the onboarding if the feed has not
// been constructed"): /v2/one/feed?agent=none, in the page's one column (council, Oct 9, items g, h and i). Before
// Build the title "Set up your agent" stands alone on its line and the centre is one lifted card: the Twitter handle,
// the sentence and Build my agent, nothing else. The rail holds the Oparax head, the seven steps under the product's
// full names (next/building/steps.ts) and the foot; no Feed, Settings or Notifications before the agent is saved.
// Build happens in place: the same card becomes the run, titled with the running step, the run's recorded lines for
// that step streaming in under it (Jev's verdicts with their reasons, the chosen sources with theirs), then its work: the chosen sources as removable pills, the Strong match, Possible match and Set aside
// groups, and the candidates still waiting to be checked. The right column opens once step 1 finds the person: the
// brief at its top once written, the picture with the name beside it and the handle under, About, then the newest
// posts. At Ready the title is "Your agent is ready" with Open your feed, and the card holds the chosen sources first,
// then the three completed groups, and the rail is the after-save rail (Feed, Settings, Notifications, his sources).
// The replay runs 48 seconds; ?at=1..7 and ?at=done freeze it.

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
  const dir = useDirection();
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

  return (
    <AppShell middle={done ? undefined : <Timeline run={run} started={started} />}>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-12 items-center gap-6">
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
          {done ? (
            <PrimaryLink href={`${BASE}/feed`} className="ml-auto h-10 shrink-0 px-4 text-[13.5px]">
              Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
            </PrimaryLink>
          ) : null}
        </div>

        <div className="mt-6 flex min-w-0 items-start">
          <section aria-label={started ? "Your run" : "Set up your agent"} className="min-w-0 flex-1">
            <p className="sr-only" aria-live="polite">
              {oneAnnounce(run)}
            </p>
            {started ? (
              <Stream
                dir={dir}
                run={run}
                handle={shownHandle}
                removed={removed}
                onRemove={(id) => setRemoved((prev) => new Set(prev).add(id))}
                whyOf={whyOf}
                onWhy={(id) => setWhyOf((cur) => (cur === id ? null : id))}
              />
            ) : (
              <form
                noValidate
                aria-label="Set up your agent"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className={cn(lift, "p-5")}
                style={liftStyle}
              >
                <div className="flex items-center gap-3">
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
                  <button type="submit" className={cn(primary, "h-10 shrink-0")}>
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {setup.submit}
                  </button>
                </div>
                {message ? (
                  <p id="setup-error" role="alert" className="mt-2 text-[12.5px] text-[var(--error)]">
                    {message}
                  </p>
                ) : null}
              </form>
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
      </MotionConfig>
    </AppShell>
  );
}
const field =
  "flex items-center gap-2 rounded-md border border-line-strong bg-[var(--well)] px-3 transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]";
const primary =
  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The setup inside the card: the Twitter handle (220px, @ and the X mark inside), the sentence (one line, flexible,
 * the counter inside). Build my agent follows at the line's right end. */
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

/** The reasons the run recorded for the sources it chose (next/data/onboarding.ts, the whys on the picks). */
const reasonOf = new Map<string, string>([...chosenSites, ...chosenAccounts].map((c) => [c.id, c.why]));

/** One streamed line: a candidate or source with its verdict and reason, or one of the step's recorded lines. */
type StreamLine = { key: string; name?: string; band?: Band; text: string };

/** The running step's stream, from what the recorded run holds and nothing else. Jev: one line per candidate as Jev
 * reaches it (the name, the band word, the recorded reason where the run kept one). Choose: one line per chosen
 * source as it arrives, with its reason. The other steps: the step's own recorded line. The live count closes the
 * stream while the step runs. */
function streamFor(id: OneStepId, run: Run, handle: string, checked: Candidate[], arrived: Source[]): StreamLine[] {
  const state = run.states[idx(id)];
  if (state === "failed") return [{ key: "failed", text: "The Twitter timeline did not answer." }];
  if (state === "skipped") return [{ key: "skipped", text: oneStepLine[id] }];
  const live = { key: "live", text: runningLine(id, run, handle) };
  if (id === "jev") return [...checked.map((c) => ({ key: c.id, name: c.name, band: bandOf(c.score), text: reasonOf.get(c.id) ?? "" })), live];
  if (id === "choose") return [...arrived.map((s) => ({ key: s.id, name: s.name, text: s.why ?? "" })), live];
  return [live];
}

/** The stream under the running step's name: newest line at the bottom and kept in view, a caret on the last line
 * while the step runs. */
function StreamLog({ lines, running, failed }: { lines: StreamLine[]; running: boolean; failed: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <ul ref={ref} className="mt-2 max-h-[220px] overflow-y-auto text-[13px] leading-[1.55]">
      {lines.map((l, i) => (
        <li key={l.key} className={cn("py-0.5", failed ? "text-[var(--error)]" : "text-t2")}>
          {l.name ? <span className="font-medium text-t1">{l.name}</span> : null}
          {l.band ? <span className={cn("ml-2 font-medium", bandTone[l.band])}>{bandLabel[l.band]}</span> : null}
          {l.name ? (l.text ? <span className="ml-2 text-t3">{l.text}</span> : null) : l.text}
          {running && i === lines.length - 1 ? (
            <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The seven steps alone in the rail's middle, each in the rail's row (32px for one line; a long name wraps to a
 * second line): the status mark in the icon slot (an empty ring while waiting, the --ok check once done, the
 * --caution ring and the --raised fill on the current step, --error when it failed) and the step's full name. */
function Timeline({ run, started }: { run: Run; started: boolean }) {
  return (
    <section aria-label="Steps" className="pb-3">
      <ol className="flex flex-col gap-[2px]">
        {oneStepIds.map((id, i) => {
          const state = run.states[i];
          const waiting = !started || state === "waiting";
          return (
            <li
              key={id}
              id={`step-${id}`}
              className={cn(railRow, "h-auto min-h-8 items-start py-[7px] leading-[18px]", (state === "running" || state === "failed") && "bg-raised")}
            >
              <span className="grid h-[18px] w-[15px] shrink-0 place-items-center">{waiting ? <EmptyRing /> : <StepMark state={state} size={15} />}</span>
              <StepName id={id} state={state} started={started} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The rail's name for a step: the product's own title, in full. */
function StepName({ id, state, started }: { id: OneStepId; state: Run["states"][number]; started: boolean }) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1",
        !started || state === "waiting" ? "text-t3" : state === "running" ? "font-medium text-t1" : state === "failed" ? "text-[var(--error)]" : "text-t2",
      )}
    >
      {state === "running" ? (
        <Shimmer as="span" duration={1.8} className="font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
          {oneStepTitle[id]}
        </Shimmer>
      ) : (
        oneStepTitle[id]
      )}
    </span>
  );
}

/** A step before the run: an empty ring, no state yet. */
function EmptyRing() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden="true" fill="none" stroke="var(--line-strong)" strokeWidth={2.4}>
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

/** The run, in place of the setup card: ONE lifted card in sections divided by hairlines. While the run is on, the
 * first section is the running step's full name (shimmering) with its lines streaming in under it. Then the step's
 * work, sources first: the chosen sources as removable pills under their kind, the Strong match, Possible match and
 * Set aside groups as Jev places each candidate (the band word, never the number), and the candidates gathered and
 * not yet checked. At Ready the step section is gone: the chosen sources, then the three completed groups. */
function Stream({
  dir,
  run,
  handle,
  removed,
  onRemove,
  whyOf,
  onWhy,
}: {
  dir: Dir;
  run: Run;
  handle: string;
  removed: Set<string>;
  onRemove: (id: string) => void;
  whyOf: string | null;
  onWhy: (id: string) => void;
}) {
  const gather = run.states[idx("gather")];
  const jev = run.states[idx("jev")];
  const choose = run.states[idx("choose")];
  const gatherF = gather === "done" ? 1 : gather === "running" ? run.progress[idx("gather")] : 0;
  const jevF = jev === "done" ? 1 : jev === "running" ? run.progress[idx("jev")] : 0;
  const chooseP = choose === "done" ? 1 : choose === "running" ? run.progress[idx("choose")] : 0;
  const gathered = take(order, gatherF);
  const checkedN = jev === "waiting" ? 0 : Math.ceil(jevF * order.length);
  const checked = order.slice(0, checkedN);
  const pile = gathered.slice(checkedN);
  const current = run.states.findIndex((s) => s === "running" || s === "failed");
  const step = current >= 0 ? oneStepIds[current] : null;
  const arrived = kinds.flatMap((k) => take(sources.filter((s) => s.group === k.id), pillsF(chooseP)));
  const stream = step ? streamFor(step, run, handle, checked, arrived) : null;

  return (
    <LayoutGroup>
      <div className={cn(lift, "divide-y divide-line")} style={liftStyle}>
        {step && stream ? (
          <section aria-label={oneStepTitle[step]} className="p-5">
            <Label running={run.states[current] === "running"} className="text-[15px]">
              {oneStepTitle[step]}
            </Label>
            <StreamLog lines={stream} running={run.states[current] === "running"} failed={run.states[current] === "failed"} />
          </section>
        ) : null}

        {choose !== "waiting" ? (
          <section aria-label="Your sources" className="grid gap-4 p-5">
            {kinds.map((k) => {
              const list = take(
                sources.filter((s) => s.group === k.id),
                pillsF(chooseP),
              ).filter((s) => !removed.has(s.id));
              if (!list.length) return null;
              const open = list.find((s) => s.id === whyOf);
              return (
                <div key={k.id} role="group" aria-label={k.label}>
                  <KindHead dir={dir} group={k.id} label={k.label} />
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
          </section>
        ) : null}

        {checked.length ? <Verdicts dir={dir} checked={checked} done={jev === "done"} /> : null}

        {pile.length ? (
          <section aria-label="Gathered candidates" className="grid gap-4 p-5">
            {candidateKinds.map((k) => {
              const list = pile.filter((c) => kindKey(c) === k.key);
              if (!list.length) return null;
              return (
                <div key={k.key} role="group" aria-label={k.label}>
                  <KindHead dir={dir} group={k.group} label={k.label} />
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {list.map((c) => (
                      <Chip key={c.id} c={c} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </LayoutGroup>
  );
}

/** The three areas a candidate falls in (owner, Oct 9: "They can be separate areas: RSS feeds, websites, tweets"). */
const candidateKinds: { key: "x" | "rss" | "website"; group: Group; label: string }[] = [
  { key: "x", group: "x", label: "Tweets" },
  { key: "rss", group: "rss", label: "RSS feeds" },
  { key: "website", group: "website", label: "Websites" },
];
const kindKey = (c: Candidate): "x" | "rss" | "website" => (c.kind === "x_account" ? "x" : c.kind === "rss" ? "rss" : "website");

/** A kind's heading inside the run card: 15px semibold with the kind mark. Direction A draws it as a band on the
 * raised ground across the card (the Settings A header); B leaves it as type on the card. */
function KindHead({ dir, group, label, count }: { dir: Dir; group: Group; label: string; count?: number }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[15px] leading-5 font-semibold text-t1",
        dir === "a" && "-mx-5 h-10 bg-[var(--raised)] px-5",
      )}
    >
      <GroupGlyph group={group} className={cn("size-4 shrink-0", hue[group])} />
      {label}
      {count !== undefined ? <span className="font-mono text-[11px] font-normal tabular-nums text-t3">{count}</span> : null}
    </p>
  );
}

const verdictMark: Record<Band, React.ReactNode> = {
  strong: <Check className="size-3.5 text-[var(--ok)]" strokeWidth={2.5} aria-hidden="true" />,
  possible: <CircleDashed className="size-3.5 text-[var(--caution)]" strokeWidth={2} aria-hidden="true" />,
  "set-aside": <span aria-hidden="true" className="block size-1.5 rounded-full bg-t4" />,
};

function CandidateMark({ c, size, dim }: { c: Candidate; size: number; dim?: boolean }) {
  return c.kind === "x_account" ? (
    <XAvatar handle={c.target.replace("https://x.com/", "")} size={size} className={cn(dim && "opacity-60 grayscale")} />
  ) : (
    <SiteIcon host={hostOf(c.target)} size={size} className={cn("rounded-[5px]", dim && "opacity-60 grayscale")} />
  );
}

/** Step 4's judgments. Direction A gives the three verdicts three bodies (council, Oct 9): Strong match as a row of
 * Deck tiles (logo, name, reason), Possible match as rows (mark, name, reason), Set aside as one line of names.
 * Direction B is a ledger: under each kind, every checked candidate as a row, Strong first (48px with its reason and
 * the --ok mark), then Possible (32px, the --caution mark, its reason), then Set aside (28px, name only); every row
 * names its verdict at the right. */
function Verdicts({ dir, checked, done }: { dir: Dir; checked: Candidate[]; done: boolean }) {
  const of = (band: Band) => checked.filter((c) => bandOf(c.score) === band);
  const hidden = done ? setAsideCount - droppedSample.length : 0;
  if (dir === "b") {
    return (
      <section aria-label="Jev's verdicts" className="grid gap-4 p-5">
        {candidateKinds.map((k) => {
          const list = bandOrder.flatMap((band) => of(band).filter((c) => kindKey(c) === k.key));
          if (!list.length) return null;
          return (
            <div key={k.key} role="group" aria-label={k.label}>
              <KindHead dir={dir} group={k.group} label={k.label} count={list.length} />
              <ul className="mt-2 flex flex-col">
                {list.map((c) => {
                  const band = bandOf(c.score);
                  const reason = reasonOf.get(c.id);
                  return (
                    <motion.li
                      key={c.id}
                      layoutId={`cand-${c.id}`}
                      className={cn(
                        "flex items-center gap-2.5 border-b border-line last:border-b-0",
                        band === "strong" ? "min-h-12 py-1.5" : band === "possible" ? "min-h-8 py-1" : "min-h-7 py-0.5",
                      )}
                    >
                      <span className="grid size-5 shrink-0 place-items-center">{verdictMark[band]}</span>
                      <CandidateMark c={c} size={band === "set-aside" ? 16 : 20} dim={band === "set-aside"} />
                      <span className={cn("min-w-0 flex-1 text-[13px] leading-[1.4]", band === "set-aside" ? "truncate text-t3" : "text-t1")}>
                        <span className="font-medium">{c.name}</span>
                        {band !== "set-aside" && reason ? <span className="ml-2 text-t2">{reason}</span> : null}
                      </span>
                      <span className={cn("shrink-0 text-[11.5px] font-medium", bandTone[band])}>{bandLabel[band]}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {hidden > 0 ? <p className="text-[12.5px] tabular-nums text-t3">{hidden} more set aside.</p> : null}
      </section>
    );
  }
  const strong = of("strong");
  const possible = of("possible");
  const aside = of("set-aside");
  return (
    <>
      {strong.length ? (
        <motion.section layout="position" aria-label={bandLabel.strong} className="p-5">
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[15px] font-semibold", bandTone.strong)}>{bandLabel.strong}</span>
            <span className="text-[12.5px] tabular-nums text-t3">{strong.length}</span>
          </p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {strong.map((c) => (
              <motion.li key={c.id} layoutId={`cand-${c.id}`} className={cn(lift, "flex items-start gap-2.5 p-3")} style={liftStyle}>
                <CandidateMark c={c} size={24} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-t1">{c.name}</span>
                  {reasonOf.get(c.id) ? <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-t2">{reasonOf.get(c.id)}</span> : null}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      ) : null}
      {possible.length ? (
        <motion.section layout="position" aria-label={bandLabel.possible} className="p-5">
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[15px] font-semibold", bandTone.possible)}>{bandLabel.possible}</span>
            <span className="text-[12.5px] tabular-nums text-t3">{possible.length}</span>
          </p>
          <ul className="mt-2 flex flex-col">
            {possible.map((c) => (
              <motion.li key={c.id} layoutId={`cand-${c.id}`} className="flex min-h-8 items-center gap-2.5 border-b border-line py-1 last:border-b-0">
                <span className="grid size-5 shrink-0 place-items-center">{verdictMark.possible}</span>
                <CandidateMark c={c} size={20} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-t1">
                  <span className="font-medium">{c.name}</span>
                  {reasonOf.get(c.id) ? <span className="ml-2 text-t2">{reasonOf.get(c.id)}</span> : null}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      ) : null}
      {aside.length ? (
        <motion.section layout="position" aria-label={bandLabel["set-aside"]} className="p-5">
          <p className="text-[13px] leading-[1.6] text-t3">
            <span className="font-semibold">{bandLabel["set-aside"]}</span>
            <span className="ml-2 tabular-nums">{done ? setAsideCount : aside.length}</span>
            <span className="ml-3">{aside.map((c) => c.name).join(", ")}</span>
            {hidden > 0 ? <span>, and {hidden} more</span> : null}
          </p>
        </motion.section>
      ) : null}
    </>
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

/** The right column, once step 1 has found the person: ONE identity block (the brief at its top once step 5 starts
 * writing it: the sentence, then the summary streaming in; then the picture with the name beside it and the handle
 * under the name, About with their Twitter bio), and the newest posts under it. */
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
          <XAvatar handle={HANDLE} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-semibold text-t1">{profile.name}</p>
            <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">{profile.handle}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>

        {chooseState !== "waiting" ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[13px] font-semibold text-t1">Brief</p>
            <p className="mt-2 flex gap-2 text-[13px] leading-[1.45] font-medium text-t1">
              <QuoteMark className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
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
        ) : null}
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
