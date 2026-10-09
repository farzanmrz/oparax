"use client";

// The One run on the real engine (council, October 8): the title band reads the phase; the seven phases fill the
// lifted aside; the card the person built from becomes the run in place, carrying the stream top to bottom (see
// run-stream.tsx) under a quiet line with the handle and the sentence; the person on the right once the profile
// checkpoint exists. At ready the card's foot opens the feed; on a failure it keeps everything found and offers the
// existing retry. Nothing moves on a timer: the page refreshes every 3 seconds and shows what is saved.

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { BrandIcon } from "@/components/brand-icon";
import { OneFrame } from "@/components/one/frame";
import { PhaseList } from "@/components/one/phases";
import { Stream } from "@/components/one/run-stream";
import { RunYou } from "@/components/one/run-you";
import { primaryButton, runCard, stepsAside } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import type { RunView } from "@/lib/onboarding/phases";
import type { Onboarding } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const copy = monitorContent.onboarding;

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
  /** The development preview freezes a run at a checkpoint, so its address is left as it is. */
  preview?: boolean;
}) {
  const router = useRouter();
  const building = !failed && !ready;
  // Before Jev's scores exist the card leads with the person's sentence at story-title size, the handle above it
  // and the run's activity lines under it (owner review, October 8); once the bands arrive the line goes quiet.
  const early = building && run.candidates === null;
  // Mark the address while building so the refresh that lands after completion keeps this page in place.
  useEffect(() => {
    if (building && !preview) router.replace(`/${handle}?built=1`, { scroll: false });
  }, [building, preview, handle, router]);

  const open = ready ? (
    <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3.5">
      <Link href={`/${handle}`} className={cn(primaryButton, "text-[13.5px]")}>
        {copy.openFeed} <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  ) : null;
  // A stopped run says so at the top of the card, with the retry beside it, above everything it had found.
  const stopped = failed ? (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-[var(--error-soft)] px-5 py-3">
      <p className="mr-auto text-[13px] text-[var(--error)]">{monitorContent.buildReason}</p>
      {canRetry ? <RetryBuild monitorId={monitorId} handle={handle} /> : null}
    </div>
  ) : null;

  return (
    <OneFrame title={view.heading} live aside={stepsAside(<PhaseList phases={view.phases} />)}>
      <div
        className={cn(
          "grid grid-cols-1 items-start gap-6",
          run.profile && "min-[1100px]:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <section aria-label={copy.runLabel} className={runCard}>
          {early ? (
            <div className="px-5 pt-5">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t1 shadow-[var(--top-light)]">
                <BrandIcon name="x" className="size-3" />@{displayHandle}
                <span className="sr-only">{copy.yourAccount}</span>
              </span>
              <p className="mt-3 text-[21px] leading-[1.3] font-semibold tracking-[-0.01em] text-t1">
                {beat}
              </p>
            </div>
          ) : (
            <p className="flex min-w-0 items-baseline gap-2.5 border-b border-line px-5 py-3.5 text-[13px]">
              <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-t1">
                <BrandIcon name="x" className="size-3 self-center" />@{displayHandle}
                <span className="sr-only">{copy.yourAccount}</span>
              </span>
              <span className="min-w-0 truncate text-t3">{beat}</span>
            </p>
          )}
          {stopped}
          <div className={cn("grid gap-5 px-5 py-5 empty:hidden", early && "pt-4")}>
            <Stream view={view} run={run} ready={ready} />
          </div>
          {open}
        </section>
        {run.profile ? (
          <RunYou profile={run.profile} beat={beat} brief={run.brief} posts={run.posts} />
        ) : null}
      </div>
    </OneFrame>
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
function RetryBuild({ monitorId, handle }: { monitorId: string; handle: string }) {
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
      <button type="submit" disabled={retrying} className={cn(primaryButton, "text-[13.5px]")}>
        {retrying ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
        {monitorContent.retry}
      </button>
    </form>
  );
}
