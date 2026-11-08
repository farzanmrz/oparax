"use client";

// The One run on the real engine (lab v2/one/onboarding.tsx; owner, Oct 10: one heading, "Setup Feed Agent", on
// every state): the rail holds the seven steps and, once step 1 finds the person, their profile; the card the person
// built from becomes the run in place (run-stream.tsx); the right column opens with the posts step: the brief and the
// newest posts. At Ready "Open Your Feed" stands at the right of the heading. On a failure the card keeps everything
// found and offers the existing retry. Nothing moves on a timer: the page refreshes every 3 seconds and shows what is
// saved.

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { PageLine } from "@/components/one/app-shell";
import { Stream } from "@/components/one/run-stream";
import { RunYou } from "@/components/one/run-you";
import { primaryButton } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import type { RunView } from "@/lib/onboarding/phases";
import type { Onboarding } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const copy = monitorContent.onboarding;

export function OneRun({
  monitorId,
  handle,
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
  // Mark the address while building so the refresh that lands after completion keeps this page in place.
  useEffect(() => {
    if (building && !preview) router.replace(`/${handle}?built=1`, { scroll: false });
  }, [building, preview, handle, router]);

  const state = (id: string) => view.phases.find((p) => p.id === id)?.state ?? "waiting";
  const postsState = state("posts");
  const reading = postsState !== "waiting";

  return (
    <>
      <PageLine
        title={copy.heading}
        home={`/${handle}`}
        right={
          ready ? (
            <Link href={`/${handle}`} className={cn(primaryButton, "shrink-0")}>
              {copy.openFeed} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      <div className="mt-6 flex min-w-0 flex-col items-start gap-6 min-[1100px]:flex-row">
        <section aria-label={copy.runLabel} className="w-full min-w-0 flex-1">
          <p className="sr-only" aria-live="polite">
            {failed ? copy.stoppedTitle : ready ? copy.ready : view.heading}
          </p>
          <Stream
            view={view}
            run={run}
            ready={ready}
            stopped={
              failed ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="mr-auto text-[13px] text-[var(--error)]">
                    {monitorContent.buildReason}
                  </p>
                  {canRetry ? <RetryBuild monitorId={monitorId} handle={handle} /> : null}
                </div>
              ) : null
            }
          />
        </section>
        {reading ? (
          <div className="w-full shrink-0 min-[1100px]:w-[364px]">
            <RunYou
              beat={beat}
              brief={run.brief}
              posts={run.posts}
              postsState={postsState}
              chooseState={state("choose")}
            />
          </div>
        ) : null}
      </div>
    </>
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
      <button
        type="submit"
        disabled={retrying}
        className={cn(primaryButton, "h-9 px-3.5 text-[13px]")}
      >
        {retrying ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
        {monitorContent.retry}
      </button>
    </form>
  );
}
