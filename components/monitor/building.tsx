"use client";

import { useReducedMotion } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { BuildLog, Profile } from "@/lib/monitor/read";
import { displayLine } from "@/lib/onboarding/phases";

// What a visitor sees while someone else's agent builds; the owner watches the One run (components/one/run.tsx).
export function Building({
  handle,
  step,
  log,
  profile,
  failed,
}: {
  handle: string;
  step: number;
  log: BuildLog;
  profile: Profile | null;
  failed: boolean;
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
                description={message ? displayLine(message) : undefined}
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
          <AlertDescription className="text-sm">
            <p>{copy.buildFailed(labels[Math.min(Math.max(step - 1, 0), 2)], copy.buildReason)}</p>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
