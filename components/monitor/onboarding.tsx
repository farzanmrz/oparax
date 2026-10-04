"use client";

// The One onboarding (design preview v2/one/onboarding.tsx) on the real run: the step rail on the left from
// build_step and build_log (the engine reports three steps), the saved posts and the chosen sources by kind in the
// middle (a source opens in place to its reason and the post that quotes it), the profile and the brief on the
// right. The page ends in place: "Your agent is ready" and Open your feed.

import { ArrowRight, Circle, CircleCheck, CircleX, LoaderCircle, Pin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandIcon } from "@/components/brand-icon";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import { RetryBuild } from "@/components/monitor/building";
import { SourceMark } from "@/components/one/marks";
import { lift, primaryButton } from "@/components/one/stage";
import { Skeleton } from "@/components/ui/skeleton";
import { monitorContent } from "@/lib/monitor/content";
import type { BuildLog } from "@/lib/monitor/read";
import type { Onboarding, OnboardingPost, OnboardingSource } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

const copy = monitorContent.onboarding;
type StepState = "waiting" | "running" | "done" | "failed";
const stateLabel: Record<StepState, string> = {
  waiting: copy.waiting,
  running: copy.running,
  done: copy.done,
  failed: copy.stopped,
};
const day = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

function StepMark({ state, className }: { state: StepState; className?: string }) {
  const size = cn("size-5 shrink-0", className);
  if (state === "done")
    return <CircleCheck className={cn(size, "text-[var(--ok)]")} aria-hidden="true" />;
  if (state === "failed")
    return <CircleX className={cn(size, "text-[var(--error)]")} aria-hidden="true" />;
  if (state === "running")
    return (
      <LoaderCircle
        className={cn(size, "animate-spin text-[var(--caution)] motion-reduce:animate-none")}
        aria-hidden="true"
      />
    );
  return <Circle className={cn(size, "text-t4")} strokeDasharray="3 3" aria-hidden="true" />;
}

export function OnboardingView({
  monitorId,
  handle,
  step,
  log,
  failed,
  ready,
  canRetry,
  failure,
  onboarding,
}: {
  monitorId: string;
  handle: string;
  step: number;
  log: BuildLog;
  failed: boolean;
  ready: boolean;
  canRetry: boolean;
  /** The failure line the page already shows: the step and the reason. */
  failure: string;
  onboarding: Onboarding;
}) {
  const router = useRouter();
  const building = !failed && !ready;
  // Mark the address while building so the refresh that lands after completion keeps this page in place.
  useEffect(() => {
    if (building) router.replace(`/${handle}?built=1`, { scroll: false });
  }, [building, handle, router]);
  const states = copy.steps.map((_, i): StepState => {
    const n = i + 1;
    if (ready || n < step) return "done";
    if (n > step) return "waiting";
    return failed ? "failed" : "running";
  });
  const lines = copy.steps.map((_, i) => log.findLast((entry) => entry.step === i + 1)?.message);
  const current = Math.min(Math.max(step, 1), copy.steps.length) - 1;
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const groups = (["x", "rss", "website"] as const)
    .map((kind) => ({ kind, list: onboarding.sources.filter((source) => source.kind === kind) }))
    .filter((group) => group.list.length);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--window)] text-t1">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-6 desk:flex-row desk:items-center desk:justify-between desk:gap-10 desk:px-8">
        <div className="min-w-0" aria-live="polite">
          <h1 className="flex items-center gap-3 text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
            {failed ? <CircleX className="size-6 text-[var(--error)]" aria-hidden="true" /> : null}
            {ready ? copy.ready : failed ? copy.stoppedTitle : copy.steps[current]}
          </h1>
          {failed ? <p className="mt-2.5 text-[13.5px] text-t2">{failure}</p> : null}
        </div>
        {ready ? (
          <Link href={`/${handle}`} className={cn(primaryButton, "h-9 shrink-0 text-[13.5px]")}>
            {copy.openFeed} <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : failed && canRetry ? (
          <RetryBuild monitorId={monitorId} handle={handle}>
            {(retrying) => (
              <button
                type="submit"
                disabled={retrying}
                className={cn(primaryButton, "h-9 shrink-0 text-[13.5px]")}
              >
                {retrying ? (
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {monitorContent.retry}
              </button>
            )}
          </RetryBuild>
        ) : null}
      </div>

      <div className="grid flex-1 grid-cols-1 desk:min-h-[720px] desk:grid-cols-[264px_minmax(0,1fr)_340px]">
        <aside aria-label={copy.stepsLabel} className="border-line bg-[var(--rail)] desk:border-r">
          <div className="sticky top-0 px-4 pt-5 pb-6">
            <p className="px-1 font-mono text-[10.5px] font-medium tracking-[0.12em] text-t3 uppercase">
              {copy.stepsLabel}
            </p>
            <ol className="mt-3">
              {copy.steps.map((title, i) => {
                const state = states[i];
                return (
                  <li key={title} className="relative grid grid-cols-[24px_1fr] gap-x-3 pb-4">
                    {i < copy.steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-7 bottom-1 left-[11.5px] w-px",
                          state === "done" ? "bg-[var(--ok)]/50" : "bg-line-strong",
                        )}
                      />
                    ) : null}
                    <span className="relative z-10 grid size-6 place-items-center rounded-full bg-[var(--rail)]">
                      <StepMark state={state} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={cn(
                          "text-[13px] leading-snug",
                          state === "waiting" ? "text-t3" : "font-medium text-t1",
                        )}
                      >
                        {state === "running" ? (
                          <Shimmer as="span" duration={1.8} className="font-medium">
                            {title}
                          </Shimmer>
                        ) : (
                          title
                        )}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[12px] leading-snug",
                          state === "failed" ? "text-[var(--error)]" : "text-t3",
                        )}
                      >
                        {state === "waiting" ? stateLabel.waiting : (lines[i] ?? stateLabel[state])}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <section aria-label={copy.work} className="min-w-0 border-line desk:border-r">
          {onboarding.posts.length ? (
            <section aria-label={copy.posts} className="border-b border-line px-7 py-6">
              <header className="flex items-center gap-3">
                <StepMark state={states[1]} />
                <h2 className="text-[15px] font-semibold text-t1">{copy.steps[1]}</h2>
                <span className="ml-auto text-[12px] text-t3">{stateLabel[states[1]]}</span>
              </header>
              {lines[1] ? <p className="mt-1.5 pl-8 text-[13.5px] text-t2">{lines[1]}</p> : null}
              <ul className="mt-4 grid gap-2.5 desk:grid-cols-3">
                {onboarding.posts.map((post) => (
                  <li
                    key={post.id}
                    className="rounded-lg border border-line bg-raised p-3 shadow-[var(--top-light)]"
                  >
                    <PostBody post={post} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {groups.length ? (
            <section className="space-y-6 px-7 py-6">
              <p className="text-[12.5px] text-t3">{copy.sourcesHint}</p>
              {groups.map((group) => (
                <div key={group.kind}>
                  <p className="mb-2.5 flex items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-t1">
                      {copy.groups[group.kind]}
                    </span>
                    <span className="text-[12.5px] text-t3 tabular-nums">{group.list.length}</span>
                  </p>
                  <ul className="grid items-start gap-2.5 desk:grid-cols-3">
                    {group.list.map((source) => (
                      <li key={source.key}>
                        <SourceCard
                          source={source}
                          open={open.has(source.key)}
                          onToggle={() => toggle(source.key)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
        </section>

        <aside aria-label={copy.side} className="bg-[var(--rail)]">
          <div className="sticky top-0 px-5 pt-5 pb-6">
            {onboarding.profile ? (
              <div className="mb-6 grid gap-2.5">
                <div className={cn(lift, "p-3.5")}>
                  <div className="flex items-center gap-3">
                    <ProfileAvatar profile={{ ...onboarding.profile, site: null }} />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[14px] font-semibold text-t1">
                        {onboarding.profile.name}
                      </p>
                      <p className="text-[12.5px] text-[var(--kind-post)]">
                        {onboarding.profile.handle}
                      </p>
                    </div>
                    <BrandIcon name="x" className="ml-auto size-3.5 text-[var(--kind-post)]" />
                  </div>
                  {onboarding.profile.bio ? (
                    <p className="mt-3 text-[13px] leading-[1.5] text-t2">
                      {onboarding.profile.bio}
                    </p>
                  ) : null}
                </div>
                {onboarding.profile.pinned ? (
                  <div className={cn(lift, "p-3.5")}>
                    <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
                      <Pin className="size-3" aria-hidden="true" /> {copy.pinned}
                      <span className="ml-auto tabular-nums">
                        {day(onboarding.profile.pinned.date)}
                      </span>
                    </p>
                    <p className="mt-2 text-[13px] leading-[1.5] whitespace-pre-line text-t1">
                      {onboarding.profile.pinned.text}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="text-[13px] font-semibold text-t1">{copy.brief}</p>
            {onboarding.brief ? (
              <div className={cn(lift, "mt-3 space-y-3 p-4")}>
                <p className="text-[13.5px] font-semibold text-t1">
                  {copy.about(onboarding.profile?.name.split(" ")[0] ?? `@${handle}`)}
                </p>
                <p className="text-[13px] leading-[1.55] text-t2">{onboarding.brief.summary}</p>
                {onboarding.brief.interests.length ? (
                  <div className="text-[12.5px]">
                    <p className="mb-1.5 text-t3">{copy.interests}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {onboarding.brief.interests.map((topic) => (
                        <li
                          key={topic}
                          className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {onboarding.brief.languages.length ? (
                  <p className="text-[12.5px] text-t3">
                    {copy.language}{" "}
                    <span className="ml-1 text-t1">{onboarding.brief.languages.join(", ")}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-line-strong p-4">
                <p className="text-[13px] text-t3">{copy.briefWaiting}</p>
                <Skeleton className="h-3 w-full bg-raised" />
                <Skeleton className="h-3 w-5/6 bg-raised" />
                <Skeleton className="h-3 w-2/3 bg-raised" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PostBody({ post }: { post: OnboardingPost }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <BrandIcon name="x" className="size-2.5 text-[var(--kind-post)]" />
        {post.kind === "quote"
          ? copy.quote
          : post.kind === "thread"
            ? copy.thread(post.parts)
            : copy.post}
        <span className="ml-auto tabular-nums">{day(post.date)}</span>
      </span>
      <span className="mt-1.5 line-clamp-6 block text-[13px] leading-[1.5] whitespace-pre-line text-t1">
        {post.text}
      </span>
      {post.quoted ? (
        <span className="mt-2 line-clamp-4 block rounded-md border border-line bg-well px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
          <span className="font-medium text-[var(--kind-post)]">{post.quoted.author}</span>{" "}
          {post.quoted.text}
        </span>
      ) : null}
    </>
  );
}

function SourceCard({
  source,
  open,
  onToggle,
}: {
  source: OnboardingSource;
  open: boolean;
  onToggle: () => void;
}) {
  const isX = source.kind === "x";
  return (
    <div className={cn(lift, "relative overflow-hidden")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-2.5 px-3.5 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SourceMark kind={isX ? "x" : "site"} mark={source.address} size={22} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-t1">{source.name}</span>
          {source.name !== source.address ? (
            <span className="block truncate text-[11.5px] text-t3">{source.address}</span>
          ) : null}
        </span>
      </button>
      {open ? (
        <div className="px-3.5 pb-3.5">
          <p className="text-[13px] leading-[1.45] text-t2">{source.why}</p>
          {source.quote ? (
            <>
              <p className="mt-3 mb-1.5 text-[11.5px] text-t3">{copy.fromPosts}</p>
              <div className="rounded-lg border border-line bg-raised p-3 shadow-[var(--top-light)]">
                <PostBody post={source.quote} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
