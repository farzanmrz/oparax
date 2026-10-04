"use client";

import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { BuildLog, Profile } from "@/lib/monitor/read";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const retryResult = z.object({ ok: z.literal(true), redirect: z.string() });

function safeRetryDestination(raw: string): boolean {
  if (raw === "/onboarding?error=build_unavailable") return true;
  if (!raw.startsWith("/") || raw.slice(1).includes("/")) return false;
  const handle = normalizeValidHandle(raw.slice(1));
  return handle !== null && handle === raw.slice(1) && !isReservedHandle(handle);
}

export function Building({
  monitorId,
  handle,
  step,
  log,
  profile,
  failed,
  canRetry,
  tries,
}: {
  monitorId: string;
  handle: string;
  step: number;
  log: BuildLog;
  profile: Profile | null;
  failed: boolean;
  canRetry: boolean;
  tries: number;
}) {
  const reducedMotion = useReducedMotion();
  const labels = copy.steps(handle);
  return (
    <section aria-labelledby="building-heading" className="space-y-4">
      <h2 id="building-heading" className="font-heading text-xl font-bold">
        {copy.building}
      </h2>
      <ChainOfThought open>
        <ChainOfThoughtContent className="data-[state=open]:animate-none data-[state=closed]:animate-none">
          {labels.map((label, index) => {
            const complete = index + 1 < step;
            const active = !failed && index === step - 1;
            const message = log.findLast((entry) => entry.step === index + 1)?.message;
            return (
              <ChainOfThoughtStep
                key={label}
                className="animate-none text-foreground"
                status={complete ? "complete" : active ? "active" : "pending"}
                label={active && reducedMotion === false ? <Shimmer>{label}</Shimmer> : label}
                description={message}
              >
                {index === 0 && profile ? (
                  <div className="flex items-start gap-3">
                    <ProfileAvatar profile={profile} />
                    <div>
                      <p>{profile.name}</p>
                      <p>{profile.bio}</p>
                    </div>
                  </div>
                ) : null}
              </ChainOfThoughtStep>
            );
          })}
        </ChainOfThoughtContent>
      </ChainOfThought>
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription className="space-y-3 text-sm">
            <p>{copy.buildFailed(labels[Math.min(Math.max(step - 1, 0), 2)], copy.buildReason)}</p>
            {canRetry && tries < 2 ? (
              <RetryBuild monitorId={monitorId} handle={handle}>
                {(retrying) => (
                  <Button disabled={retrying} className="min-h-11 desk:min-h-6">
                    {copy.retry}
                  </Button>
                )}
              </RetryBuild>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

/** The existing retry: a POST to /api/build/retry (a plain form post without script), then a refresh in place. */
export function RetryBuild({
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
    <form method="post" action="/api/build/retry" onSubmit={retry} className="grid gap-2">
      <input type="hidden" name="monitorId" value={monitorId} />
      {children(retrying)}
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--error)]">
          {copy.retryFailed}
        </p>
      ) : null}
    </form>
  );
}
