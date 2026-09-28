"use client";

import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
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

export function Building({
  monitorId,
  handle,
  step,
  log,
  profile,
  failed,
  reason,
  tries,
}: {
  monitorId: string;
  handle: string;
  step: number;
  log: BuildLog;
  profile: Profile | null;
  failed: boolean;
  reason: string | null;
  tries: number;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(false);
  const labels = copy.steps(handle);
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
      if (!response.ok) setError(true);
      else router.refresh();
    } catch {
      setError(true);
    } finally {
      setRetrying(false);
    }
  }
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
            <p>
              {copy.buildFailed(
                labels[Math.min(Math.max(step - 1, 0), 2)],
                reason || copy.buildReason,
              )}
            </p>
            {tries < 2 ? (
              <form method="post" action="/api/build/retry" onSubmit={retry}>
                <input type="hidden" name="monitorId" value={monitorId} />
                <Button disabled={retrying} className="min-h-11 desk:min-h-6">
                  {copy.retry}
                </Button>
              </form>
            ) : null}
            {error ? <p role="alert">{copy.retryFailed}</p> : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
