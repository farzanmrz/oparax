"use client";

import { useState } from "react";
import { ArrowRight, Quote as QuoteMark, Sparkles } from "lucide-react";
import { LayoutGroup, motion, MotionConfig, useReducedMotion } from "motion/react";
import { announce, isDone, stepIds, stepLabel, stepLine, stepTitle, useRun, type Run, type StepId } from "@/next/building/steps";
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
  profile,
  setAsideCount,
  type Band,
  type Candidate,
} from "@/next/data/onboarding";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle, PrimaryLink, useThemeGuard } from "@/v2/deck/chrome";
import { beat, groups, HANDLE, hostOf, sources, type Group, type Source } from "@/v2/deck/data";
import { EASE } from "@/v2/deck/live";
import { GroupGlyph, kindColor, SiteIcon, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";

// One onboarding. Three columns (owner, Oct 4: "The right side is for the user's own stuff, and the left side is for
// my timeline"): on the left the eight steps; in the centre the candidates as the run gathers them, then Jev's
// check settling them into the Deck building bands (Strong match, Possible match, Set aside), then, from Choose
// sources on, only the chosen sources by kind; on the right the person's own things: Your brief first from Choose
// sources on, the profile, and the newest posts arriving one under another. The heading moves Choosing sources,
// Saving your agent, Your agent is ready; the X account and Build my agent sit at the top right the whole time.

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
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const heading = done ? "Your agent is ready" : st("choose") === "done" ? "Saving your agent" : "Choosing sources";

  return (
    <MotionConfig reducedMotion="user">
      <div className="palette-council flex min-h-svh flex-col">
        <main className="flex min-h-svh flex-1 flex-col bg-[var(--window)]">
          <div className="flex flex-col gap-4 border-b border-line px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8">
            <div className="min-w-0" aria-live="polite">
              <motion.h1
                key={heading}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
              >
                {heading}
              </motion.h1>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="inline-flex h-9 items-center gap-2.5 rounded-full border border-line-strong bg-[var(--raised)] pr-3.5 pl-3 text-[13px]" style={{ boxShadow: "var(--top-light)" }}>
                <span className="text-t3">X account</span>
                <span className="flex items-center gap-1.5 font-medium text-t1">
                  <XLogo className="size-3 text-t1" />@{HANDLE}
                </span>
              </span>
              {done ? (
                <PrimaryLink href={`${BASE}/feed`} className="h-9 px-4 text-[13.5px]">
                  Open your feed <ArrowRight className="size-3.5" aria-hidden="true" />
                </PrimaryLink>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground opacity-55"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Build my agent
                </button>
              )}
            </div>
          </div>

          <div className="grid min-h-[720px] flex-1 grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_340px]">
            <Steps run={run} />
            <section aria-label="Your sources" className="min-w-0 border-r border-line">
              <p className="sr-only" aria-live="polite">
                {announce(run)}
              </p>
              {chooseF > 0 ? (
                <div className="space-y-7 px-7 py-6">
                  {kinds.map((k) => {
                    const list = chosen(k.id);
                    if (!list.length) return null;
                    return (
                      <div key={k.id}>
                        <p className="mb-3 flex items-center gap-2">
                          <span className="grid size-4 place-items-center text-t3">
                            <GroupGlyph group={k.id} className="size-3.5" />
                          </span>
                          <span className="text-[15px] font-semibold text-t1">{k.label}</span>
                          <span className="text-[12.5px] tabular-nums text-t3">{sources.filter((s) => s.group === k.id).length}</span>
                        </p>
                        <ul className="grid grid-cols-3 items-start gap-2.5 2xl:grid-cols-4">
                          {list.map((s) => (
                            <motion.li key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                              <SourceCard source={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Candidates run={run} />
              )}
            </section>
            <RightPane run={run} />
          </div>
        </main>
      </div>
    </MotionConfig>
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

/** The centre until Choose sources: the candidates arriving as the run gathers them, then Jev's check moving each
 * one from the gathered pile into its band. */
function Candidates({ run }: { run: Run }) {
  const gi = stepIds.indexOf("gather");
  const ji = stepIds.indexOf("jev");
  const gather = run.states[gi];
  const jev = run.states[ji];
  const gatherF = gather === "done" ? 1 : gather === "running" ? run.progress[gi] : 0;
  const jevF = jev === "done" ? 1 : jev === "running" ? run.progress[ji] : 0;
  const gathered = take(order, gatherF);
  const checkedN = jev === "waiting" ? 0 : Math.ceil(jevF * order.length);
  const checked = order.slice(0, checkedN);
  const pile = gathered.slice(checkedN);
  const count = gather === "running" ? Math.round(gatherF * candidateCount) : gatherF === 1 ? candidateCount : 0;

  return (
    <LayoutGroup>
      <div className="px-7 py-6">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold text-t1">
            {gather === "running" ? (
              <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                Gathering candidates
              </Shimmer>
            ) : gather === "waiting" ? (
              <span className="text-t3">Gathering candidates</span>
            ) : (
              "Candidates"
            )}
          </h2>
          <span className={cn("text-[22px] leading-none font-semibold tabular-nums", gather === "waiting" ? "text-t4" : "text-t1")}>{count}</span>
          {jev === "running" ? (
            <p className="ml-auto flex items-center gap-2.5 text-[12.5px] tabular-nums text-t2">
              Checked {Math.round(jevF * candidateCount)} of {candidateCount}
              <span className="block h-1.5 w-44 rounded-full bg-line-strong" aria-hidden="true">
                <span className="block h-full rounded-full bg-[var(--caution)]" style={{ width: `${jevF * 100}%` }} />
              </span>
            </p>
          ) : null}
        </div>

        {gather === "waiting" ? (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-5">
            <p className="text-[13px] text-t3">Starts once your newest posts are read.</p>
          </div>
        ) : null}

        {pile.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {pile.map((c) => (
              <Chip key={c.id} c={c} />
            ))}
          </ul>
        ) : null}

        {checkedN > 0 ? (
          <div className="mt-6 grid gap-5">
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

/** The right column, the person's own things: Your brief first from Choose sources on, then the profile, then the
 * newest posts arriving one under another while they are read. */
function RightPane({ run }: { run: Run }) {
  const at = (id: StepId) => run.states[stepIds.indexOf(id)];
  const pState = at("profile");
  const postsState = at("posts");
  const showBrief = at("choose") !== "waiting";
  const pi = stepIds.indexOf("posts");
  const shownPosts = postsState === "running" ? take(posts, run.progress[pi]) : postsState === "waiting" ? [] : posts;
  return (
    <aside aria-label="Your profile and brief" className="bg-[var(--rail)]">
      <div className="grid gap-6 px-5 pt-5 pb-8">
        {showBrief ? <BriefCard run={run} /> : null}
        {pState === "running" ? <ProfileRunning /> : pState === "waiting" ? null : <ProfileCard />}
        {postsState !== "waiting" ? (
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-t1">
              {postsState === "running" ? (
                <Shimmer as="span" duration={1.8} className="font-semibold [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                  Reading your newest posts
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
                  className="rounded-lg border border-line bg-[var(--raised)] p-3 shadow-[var(--top-light)]"
                >
                  <PostBody post={p} />
                </motion.li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

/** Your brief: the person's sentence, then the summary streaming in while the brief is written. */
function BriefCard({ run }: { run: Run }) {
  const reduce = useReducedMotion();
  const i = stepIds.indexOf("brief");
  const state = run.states[i];
  const streaming = state === "running";
  const ready = state === "done";
  const words = brief.summary.split(" ");
  const text = streaming ? words.slice(0, Math.max(1, Math.ceil(run.progress[i] * words.length))).join(" ") : brief.summary;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
      <p className="mb-2.5 text-[13px] font-semibold text-t1">Your brief</p>
      <div className={cn(lift, "p-4")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
        <p className="flex gap-2 text-[13px] leading-[1.45] font-medium text-t1">
          <QuoteMark className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {beat}
        </p>
        <div className="mt-3.5 border-t border-line pt-3.5">
          <p className="text-[13px] font-semibold text-t1">About {profile.name.split(" ")[0]}</p>
          {streaming || ready ? (
            <p className="mt-1.5 text-[13px] leading-[1.55] text-t2">
              {text}
              {streaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle" /> : null}
            </p>
          ) : (
            <div className="mt-2 space-y-2" aria-label="Written after the sources are chosen">
              <Skeleton className="h-3 w-full bg-[var(--line-strong)]" />
              <Skeleton className="h-3 w-5/6 bg-[var(--line-strong)]" />
              <Skeleton className="h-3 w-2/3 bg-[var(--line-strong)]" />
            </div>
          )}
          {ready ? (
            <div className="mt-3.5 space-y-3 text-[12.5px]">
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
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/** Window's ProfileRunning. */
function ProfileRunning() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line p-3.5">
      <Skeleton className="size-10 rounded-full bg-[var(--raised)]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32 bg-[var(--raised)]" />
        <Skeleton className="h-3 w-44 bg-[var(--raised)]" />
      </div>
    </div>
  );
}

/** Window's ProfileCard: the avatar, name, handle and bio. The pinned post stays off ("You don't need to show the
 * pinned post"). */
function ProfileCard() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className={cn(lift, "p-3.5")} style={liftStyle}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">{profile.name[0]}</span>
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-semibold text-t1">{profile.name}</p>
          <p className="text-[12.5px] text-[var(--kind-post)]">{profile.handle}</p>
        </div>
        <XLogo className="ml-auto size-3.5 text-[var(--kind-post)]" />
      </div>
      <p className="mt-3 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
    </motion.div>
  );
}

