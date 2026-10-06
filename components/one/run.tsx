"use client";

// The One run (design preview v2/one/onboarding.tsx) on the real engine: the page line with the heading from the
// phase, the X account and the one action; the seven phases on the left; the centre accumulating top to bottom as
// the log and the checkpoints allow (the source table until gathering starts, then the candidates, Jev's bands, the
// chosen sources, the search, the save); the person on the right once the profile checkpoint exists. Nothing moves
// on a timer: the page refreshes every 3 seconds and shows what is saved.

import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandIcon } from "@/components/brand-icon";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { PhaseList } from "@/components/one/phases";
import { RunYou } from "@/components/one/run-you";
import { lift, primaryButton } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import { onboardingContent } from "@/lib/onboarding/content";
import type { RunView } from "@/lib/onboarding/phases";
import type {
  Band,
  Onboarding,
  OnboardingCandidate,
  OnboardingSource,
} from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const copy = monitorContent.onboarding;
const bands: Band[] = ["strong", "possible", "aside"];
const bandTone: Record<Band, string> = {
  strong: "text-[var(--ok)]",
  possible: "text-t2",
  aside: "text-t3",
};
/** Set-aside candidates shown before "N more". */
const ASIDE_SHOWN = 12;

export function OneRun({
  monitorId,
  handle,
  displayHandle,
  beat,
  view,
  run,
  failed,
  ready,
  canRetry,
  table,
  preview = false,
}: {
  monitorId: string;
  /** The page address's handle. */
  handle: string;
  displayHandle: string;
  beat: string;
  view: RunView;
  run: Onboarding;
  failed: boolean;
  ready: boolean;
  canRetry: boolean;
  /** The shared source table, rendered on the server. */
  table: React.ReactNode;
  /** The development preview freezes a run at a checkpoint, so its address is left as it is. */
  preview?: boolean;
}) {
  const router = useRouter();
  const building = !failed && !ready;
  // Mark the address while building so the refresh that lands after completion keeps this page in place.
  useEffect(() => {
    if (building && !preview) router.replace(`/${handle}?built=1`, { scroll: false });
  }, [building, preview, handle, router]);
  const state = (id: string) => view.phases.find((p) => p.id === id)?.state ?? "waiting";
  const gathering = state("gather") !== "waiting";

  return (
    <>
      <div className="flex min-h-10 flex-wrap items-center gap-x-6 gap-y-3">
        <h1
          aria-live="polite"
          className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] whitespace-nowrap text-t1"
        >
          {view.heading}
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 shadow-[var(--top-light)]">
            <BrandIcon name="x" className="size-3 text-t1" />@{displayHandle}
            <span className="sr-only">{copy.yourAccount}</span>
          </span>
          {ready ? (
            <Link href={`/${handle}`} className={cn(primaryButton, "h-10 shrink-0 text-[13.5px]")}>
              {copy.openFeed} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : failed && canRetry ? (
            <RetryBuild monitorId={monitorId} handle={handle}>
              {(retrying) => (
                <button
                  type="submit"
                  disabled={retrying}
                  className={cn(primaryButton, "h-10 shrink-0 text-[13.5px]")}
                >
                  {retrying ? (
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  {monitorContent.retry}
                </button>
              )}
            </RetryBuild>
          ) : (
            <button
              type="button"
              disabled
              className={cn(
                primaryButton,
                "h-10 shrink-0 cursor-not-allowed text-[13.5px] disabled:opacity-55",
              )}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {onboardingContent.submit}
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mt-6 grid grid-cols-1 items-start gap-6",
          run.profile
            ? "desk:grid-cols-[264px_minmax(0,1fr)_364px]"
            : "desk:grid-cols-[264px_minmax(0,1fr)]",
        )}
      >
        <PhaseList phases={view.phases} />
        <section aria-label={gathering ? copy.runLabel : copy.tableLabel} className="min-w-0">
          {gathering ? <Stream view={view} run={run} state={state} ready={ready} /> : table}
        </section>
        {run.profile ? (
          <RunYou profile={run.profile} beat={beat} brief={run.brief} posts={run.posts} />
        ) : null}
      </div>
    </>
  );
}

/** A block's label in the run: 13px semibold, shimmering while its phase runs. */
function Label({ running, children }: { running?: boolean; children: string }) {
  return (
    <h2 className="text-[13px] font-semibold text-t1">
      {running ? (
        <Shimmer as="span" duration={1.8} className="font-semibold">
          {children}
        </Shimmer>
      ) : (
        children
      )}
    </h2>
  );
}

/** The centre once the run gathers. It accumulates top to bottom; nothing is removed when a later phase starts. */
function Stream({
  view,
  run,
  state,
  ready,
}: {
  view: RunView;
  run: Onboarding;
  state: (id: string) => string;
  ready: boolean;
}) {
  const [why, setWhy] = useState<string | null>(null);
  const jev = state("jev");
  const choose = state("choose");
  const search = state("search");
  const groups = (["x", "rss", "website"] as const)
    .map((kind) => ({ kind, list: run.chosen?.filter((s) => s.kind === kind) ?? [] }))
    .filter((group) => group.list.length);
  return (
    <div className="grid gap-5">
      <section aria-label={copy.gathering}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Label running={state("gather") === "running"}>{copy.gathering}</Label>
          {view.gathered !== null ? (
            <span className="text-[22px] leading-none font-semibold text-t1 tabular-nums">
              {view.gathered}
            </span>
          ) : null}
          <span className="text-[12.5px] text-t3">{copy.gatheredFrom}</span>
        </div>
      </section>

      {jev !== "waiting" ? (
        <section aria-label={copy.phases.jev.title}>
          <div className="flex items-center gap-4">
            <Label running={jev === "running"}>{copy.phases.jev.title}</Label>
            {jev === "running" ? <Activity /> : null}
          </div>
          {run.candidates ? (
            <div className="mt-3 grid gap-4">
              {bands.map((band) => (
                <BandBlock
                  key={band}
                  band={band}
                  list={run.candidates?.filter((c) => c.band === band) ?? []}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {choose !== "waiting" ? (
        <section aria-label={copy.phases.choose.title}>
          <Label running={choose === "running"}>{copy.phases.choose.title}</Label>
          {groups.length ? (
            <div className="mt-3 grid gap-4">
              {groups.map(({ kind, list }) => {
                const open = list.find((s) => s.key === why);
                return (
                  <section key={kind} aria-label={copy.groups[kind]}>
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-t1">
                      <span className="grid size-[18px] place-items-center text-t3">
                        <GroupGlyph kind={kind} className="size-3.5" />
                      </span>
                      {copy.groups[kind]}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {list.map((source) => (
                        <Pill
                          key={source.key}
                          source={source}
                          on={why === source.key}
                          onWhy={() => setWhy((cur) => (cur === source.key ? null : source.key))}
                        />
                      ))}
                    </ul>
                    {open ? (
                      <p className="mt-2 text-[13px] leading-[1.5] text-t2">
                        <span className="font-medium text-t1">{open.name}</span> {open.why}
                      </p>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {view.searchTerms && search !== "waiting" ? (
        <section aria-label={copy.phases.search.title}>
          <Label running={search === "running"}>{copy.phases.search.title}</Label>
          <p className="mt-1 text-[13px] text-t2">
            {view.phases.find((p) => p.id === "search")?.result ?? copy.searched(view.searchTerms)}
          </p>
        </section>
      ) : null}

      {ready ? (
        <section aria-label={copy.phases.save.title}>
          <Label>{copy.phases.save.title}</Label>
          <p className="mt-1 text-[13px] text-t2">{copy.saved}</p>
        </section>
      ) : null}
    </div>
  );
}

/** The one sign of Jev's single request: an amber line that moves without a count, since nothing is counted. */
function Activity() {
  const reduce = useReducedMotion();
  return (
    <span
      role="status"
      className="relative block h-1.5 w-40 overflow-hidden rounded-full bg-line-strong"
    >
      <span className="sr-only">{copy.scoring}</span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--caution)]"
        initial={{ x: "-100%" }}
        animate={reduce ? { x: "100%" } : { x: ["-100%", "300%"] }}
        transition={
          reduce ? { duration: 0 } : { duration: 1.6, ease: "easeInOut", repeat: Infinity }
        }
      />
    </span>
  );
}

function BandBlock({ band, list }: { band: Band; list: OnboardingCandidate[] }) {
  if (!list.length) return null;
  const shown = band === "aside" ? list.slice(0, ASIDE_SHOWN) : list;
  const hidden = list.length - shown.length;
  return (
    <section className={cn(lift, "p-4")}>
      <p className="flex items-baseline gap-2">
        <span className={cn("text-[13.5px] font-semibold", bandTone[band])}>
          {copy.bands[band]}
        </span>
        <span className="text-[12.5px] text-t3 tabular-nums">{list.length}</span>
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <li
            key={c.key}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-[12.5px]",
              band === "aside"
                ? "border-dashed border-line bg-transparent text-t3"
                : "border-line bg-[var(--window)] text-t2",
            )}
          >
            <SourceMark
              kind={c.kind === "x" ? "x" : c.kind === "github" ? "github" : "site"}
              mark={c.mark}
              size={20}
              className={band === "aside" ? "opacity-60 grayscale" : undefined}
            />
            <span>{c.name}</span>
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3 uppercase">
              {c.kind === "x"
                ? "X"
                : c.kind === "rss"
                  ? "RSS"
                  : c.kind === "github"
                    ? "GitHub"
                    : "Web"}
            </span>
          </li>
        ))}
        {hidden > 0 ? (
          <li className="flex h-8 items-center rounded-full border border-dashed border-line px-3 text-[12.5px] text-t3 tabular-nums">
            {copy.more(hidden)}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** A chosen source: the logo, the name and the handle or address; the pill opens its reason under the group. */
function Pill({ source, on, onWhy }: { source: OnboardingSource; on: boolean; onWhy: () => void }) {
  const x = source.kind === "x";
  return (
    <li>
      <button
        type="button"
        onClick={onWhy}
        aria-expanded={on}
        className={cn(
          "flex h-8 items-center gap-2 rounded-full border pr-3 pl-1.5 text-[12.5px] shadow-[var(--top-light)] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          on
            ? "border-[var(--brand-line)] bg-raised"
            : "border-line-strong bg-[var(--window)] hover:bg-raised",
        )}
      >
        <SourceMark kind={x ? "x" : "site"} mark={source.address} size={20} />
        <span className="font-medium whitespace-nowrap text-t1">{source.name}</span>
        {source.name !== source.address ? (
          <span className="whitespace-nowrap text-t3">{source.address}</span>
        ) : null}
      </button>
    </li>
  );
}

const retryResult = z.object({ ok: z.literal(true), redirect: z.string() });

function safeRetryDestination(raw: string): boolean {
  if (raw === "/onboarding?error=build_unavailable") return true;
  if (!raw.startsWith("/") || raw.slice(1).includes("/")) return false;
  const handle = normalizeValidHandle(raw.slice(1));
  return handle !== null && handle === raw.slice(1) && !isReservedHandle(handle);
}

/** The existing retry: a POST to /api/build/retry (a plain form post without script), then a refresh in place. */
function RetryBuild({
  monitorId,
  handle,
  children,
}: {
  monitorId: string;
  handle: string;
  children: (retrying: boolean) => React.ReactNode;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(false);
  async function retry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRetrying(true);
    setError(false);
    try {
      const response = await fetch("/api/build/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitorId }),
      });
      if (!response.ok) {
        setError(true);
      } else {
        const result = retryResult.safeParse(await response.json());
        if (!result.success || !safeRetryDestination(result.data.redirect)) {
          setError(true);
        } else if (result.data.redirect === `/${handle}`) {
          router.refresh();
        } else {
          router.push(result.data.redirect);
        }
      }
    } catch {
      setError(true);
    } finally {
      setRetrying(false);
    }
  }
  return (
    <form
      method="post"
      action="/api/build/retry"
      onSubmit={retry}
      className="flex items-center gap-3"
    >
      <input type="hidden" name="monitorId" value={monitorId} />
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--error)]">
          {monitorContent.retryFailed}
        </p>
      ) : null}
      {children(retrying)}
    </form>
  );
}
