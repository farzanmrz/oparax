"use client";

// The authorize module, the one interactive block that starts DM alerts. Five states, driven
// by the server-fetched connection state plus what the authorize action returns locally. All
// copy is sentence case and never mentions drafting.

import Link from "next/link";
import posthog from "posthog-js";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { PublicFeedConnectionState } from "@/lib/feed/public-query";
import { requestDmAuthorization } from "./actions";

type View = "idle" | "waiting" | "connected" | "trial-ended" | "stopped";

export function AuthorizeModule({
  handle,
  initialState,
  trialEnded,
}: {
  handle: string;
  initialState: PublicFeedConnectionState;
  trialEnded: boolean;
}) {
  const [connection, setConnection] = useState<PublicFeedConnectionState>(initialState);
  const [fallbackComposeUrl, setFallbackComposeUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const view: View =
    connection === "active"
      ? "connected"
      : connection === "trial_expired" || trialEnded
        ? "trial-ended"
        : connection === "pending"
          ? "waiting"
          : connection === "stopped"
            ? "stopped"
            : "idle";

  function authorize() {
    posthog.capture("authorize_pressed");
    setErrorText(null);
    startTransition(async () => {
      const result = await requestDmAuthorization(handle);
      if (result.state === "error") {
        setErrorText(result.error ?? "Something went wrong. Try again.");
        return;
      }
      setNotice(result.error ?? null);
      setFallbackComposeUrl(result.fallbackComposeUrl ?? null);
      setConnection(result.state);
    });
  }

  const authorizeButton = (
    <Button
      type="button"
      data-attr="authorize-button"
      onClick={authorize}
      disabled={pending}
      className="min-h-11 px-4 desk:min-h-8"
    >
      Authorize alerts
    </Button>
  );

  return (
    <section
      aria-label="Alerts"
      className="flex flex-col gap-3 rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] px-4 py-4 shadow-[var(--card-shadow)] desk:px-6 desk:py-5"
    >
      {view === "idle" && (
        <>
          <p className="text-[14.5px] leading-[1.6] text-text-body">
            Get breaking news from this desk as X direct messages.
          </p>
          <div>{authorizeButton}</div>
          {errorText && <p className="text-[13px] text-danger-text">{errorText}</p>}
        </>
      )}

      {view === "stopped" && (
        <>
          <p className="text-[13px] text-text-muted">
            Alerts are off. You can authorize again any time.
          </p>
          <p className="text-[14.5px] leading-[1.6] text-text-body">
            Get breaking news from this desk as X direct messages.
          </p>
          <div>{authorizeButton}</div>
          {errorText && <p className="text-[13px] text-danger-text">{errorText}</p>}
        </>
      )}

      {view === "waiting" && (
        <>
          <p className="text-[14.5px] leading-[1.6] text-warning">
            Check your X messages and reply yes to start alerts.
          </p>
          {fallbackComposeUrl && (
            <a
              href={fallbackComposeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-[14.5px] text-[var(--accent)] underline-offset-4 hover:underline desk:min-h-0"
            >
              Open X and send yes
            </a>
          )}
          {notice && <p className="text-[13px] text-text-muted">{notice}</p>}
        </>
      )}

      {view === "connected" && (
        <p className="text-[14.5px] leading-[1.6] text-success">
          Alerts are on. Reply stop to the bot at any time.
        </p>
      )}

      {view === "trial-ended" && (
        <>
          <p className="text-[14.5px] leading-[1.6] text-text-body">
            Your free week is over. Keep alerts coming:
          </p>
          <Link
            href={`/pay/${handle}`}
            className="inline-flex min-h-11 items-center text-[14.5px] text-[var(--accent)] underline-offset-4 hover:underline desk:min-h-0"
          >
            Choose a plan
          </Link>
        </>
      )}
    </section>
  );
}
