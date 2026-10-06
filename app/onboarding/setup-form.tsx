"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { type FormEvent, useRef, useState } from "react";
import { z } from "zod";
import { RefreshXIdentityButton } from "@/components/auth/refresh-x-identity";
import { BrandIcon } from "@/components/brand-icon";
import { primaryButton } from "@/components/one/stage";
import { Spinner } from "@/components/ui/spinner";
import {
  onboardingContent,
  type SetupErrorCode,
  setupErrorMessage,
  setupErrorSchema,
} from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const field =
  "rounded-lg border border-line-strong bg-well text-t1 transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]";

const buildResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), redirect: z.string().regex(/^\/[A-Za-z0-9_]{1,15}$/) }),
  z.object({ ok: z.literal(false), error: setupErrorSchema }),
]);
const waitlistResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: setupErrorSchema }),
]);

type Failure = { code: SetupErrorCode; generic: boolean };

export function SetupForm({
  verifiedHandle,
  buildsOpen,
  error,
}: {
  verifiedHandle: string | null;
  buildsOpen: boolean;
  error?: SetupErrorCode;
}) {
  const handleInput = useRef<HTMLInputElement>(null);
  const beatInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [handle, setHandle] = useState("");
  const [beat, setBeat] = useState("");
  const [closed, setClosed] = useState(!buildsOpen || error === "builds_unavailable");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(
    error ? { code: error, generic: true } : null,
  );
  const [waitlistFailure, setWaitlistFailure] = useState<"bot" | "save_failed" | null>(null);

  function showFailure(code: SetupErrorCode) {
    setFailure({ code, generic: false });
    if (code === "handle_required" || code === "invalid_handle" || code === "reserved_handle") {
      handleInput.current?.focus({ preventScroll: true });
    } else if (code === "beat_required" || code === "beat_too_long") {
      beatInput.current?.focus({ preventScroll: true });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || saved) return;
    setFailure(null);
    setWaitlistFailure(null);

    const normalizedHandle = verifiedHandle ?? normalizeValidHandle(handle);
    if (!normalizedHandle) return showFailure(handle.trim() ? "invalid_handle" : "handle_required");
    if (isReservedHandle(normalizedHandle)) return showFailure("reserved_handle");
    const trimmedBeat = beat.trim();
    if (!trimmedBeat) return showFailure("beat_required");
    if (trimmedBeat.length > 300) return showFailure("beat_too_long");

    submitting.current = true;
    setPending(true);
    if (!closed) {
      try {
        posthog.capture("agent_build_requested", { placement: "setup" });
      } catch {
        // Analytics must never prevent the build request.
      }
    }
    try {
      const response = await fetch(closed ? "/api/waitlist" : "/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          beat: trimmedBeat,
          ...(verifiedHandle ? {} : { handle: normalizedHandle }),
        }),
      });
      const body: unknown = await response.json();
      if (closed) {
        const result = waitlistResponseSchema.safeParse(body);
        if (response.ok && result.success && result.data.ok) {
          setSaved(true);
        } else if (result.success && !result.data.ok && result.data.error === "signed_out") {
          showFailure("signed_out");
        } else if (
          result.success &&
          !result.data.ok &&
          result.data.error === "x_identity_invalid"
        ) {
          showFailure("x_identity_invalid");
        } else if (result.success && !result.data.ok && result.data.error === "bot") {
          setWaitlistFailure("bot");
        } else {
          setWaitlistFailure("save_failed");
        }
        return;
      }

      const result = buildResponseSchema.safeParse(body);
      if (!result.success) return showFailure("build_unavailable");
      if (!result.data.ok) {
        if (result.data.error === "builds_unavailable") setClosed(true);
        showFailure(result.data.error);
        return;
      }
      if (!response.ok || isReservedHandle(result.data.redirect.slice(1))) {
        return showFailure("build_unavailable");
      }
      window.location.assign(result.data.redirect);
    } catch {
      if (closed) setWaitlistFailure("save_failed");
      else showFailure("build_unavailable");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const normalizedHandle = normalizeValidHandle(handle);
  const handleInvalid =
    failure?.code === "handle_required" ||
    failure?.code === "invalid_handle" ||
    failure?.code === "reserved_handle";
  const beatInvalid = failure?.code === "beat_required" || failure?.code === "beat_too_long";
  const refreshX =
    verifiedHandle !== null &&
    (failure?.code === "identity_mismatch" ||
      failure?.code === "profile_not_found" ||
      failure?.code === "profile_unavailable" ||
      failure?.code === "x_identity_invalid");

  const message =
    failure && failure.code !== "builds_unavailable" ? (
      failure.code === "signed_out" ? (
        <Link href="/login" className="underline underline-offset-4">
          {onboardingContent.signedOut}
        </Link>
      ) : (
        setupErrorMessage(failure.code, verifiedHandle !== null, normalizedHandle, failure.generic)
      )
    ) : null;

  // The page line (design preview v2/one/onboarding.tsx SetupLine): the title, then the X handle, the one sentence
  // with its counter inside, and the action on one line, no card. Errors sit under the line at its right.
  return (
    <>
      <form
        action="/api/build"
        method="post"
        onSubmit={submit}
        aria-busy={pending}
        aria-label={onboardingContent.title}
        className="flex min-h-10 flex-wrap items-center gap-x-6 gap-y-3"
      >
        <h1 className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] whitespace-nowrap text-t1">
          {onboardingContent.title}
        </h1>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {verifiedHandle ? (
            <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 shadow-[var(--top-light)]">
              <BrandIcon name="x" className="size-3 text-t1" />@{verifiedHandle}
              <span className="sr-only">, {onboardingContent.verifiedBadge}</span>
            </span>
          ) : (
            <label
              className={cn(
                field,
                "flex h-10 w-[220px] shrink-0 items-center gap-2 px-3",
                handleInvalid && "border-[var(--error)]",
              )}
            >
              <span className="sr-only">{onboardingContent.handleLabel}</span>
              <span aria-hidden="true" className="text-[14px] text-t3">
                @
              </span>
              <input
                ref={handleInput}
                id="handle"
                name="handle"
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
                autoComplete="off"
                spellCheck={false}
                placeholder={onboardingContent.handlePlaceholder}
                value={handle}
                onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))}
                aria-describedby={handleInvalid ? "setup-error" : undefined}
                aria-invalid={handleInvalid || undefined}
                required
              />
              <BrandIcon name="x" className="size-3.5 shrink-0 text-t3" />
            </label>
          )}
          <label
            className={cn(
              field,
              "flex h-10 min-w-0 flex-1 items-center gap-2 px-3",
              beatInvalid && "border-[var(--error)]",
            )}
          >
            <span className="sr-only">{onboardingContent.beatLabel}</span>
            <input
              ref={beatInput}
              id="beat"
              name="beat"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
              autoComplete="off"
              placeholder={onboardingContent.beatPlaceholder}
              value={beat}
              onChange={(event) => setBeat(event.target.value)}
              aria-describedby={beatInvalid ? "beat-count setup-error" : "beat-count"}
              aria-invalid={beatInvalid || undefined}
              maxLength={300}
              required
            />
            <span id="beat-count" className="shrink-0 text-[11.5px] text-t3 tabular-nums">
              {onboardingContent.beatCount(beat.length)}
            </span>
          </label>
          <button
            type="submit"
            className={cn(primaryButton, "h-10 shrink-0 text-[13.5px]")}
            disabled={pending || saved}
          >
            {pending ? (
              <Spinner />
            ) : closed ? null : (
              <Sparkles className="size-3.5" aria-hidden="true" />
            )}
            {closed
              ? pending
                ? onboardingContent.saving
                : onboardingContent.waitlist
              : pending
                ? onboardingContent.pending
                : onboardingContent.submit}
          </button>
        </div>
      </form>
      <div className="mt-2 flex flex-col items-end gap-2 text-right text-[12.5px] leading-relaxed empty:hidden">
        {closed ? (
          <p role="status" className="text-t1">
            {onboardingContent.buildsUnavailable}
          </p>
        ) : null}
        {message ? (
          <p id="setup-error" role="alert" className="text-[var(--error)]">
            {message}
          </p>
        ) : null}
        {waitlistFailure ? (
          <p role="alert" className="text-[var(--error)]">
            {waitlistFailure === "bot"
              ? onboardingContent.browserError
              : onboardingContent.waitlistFailed}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="text-t1">
            {onboardingContent.saved}
          </p>
        ) : null}
        {refreshX ? <RefreshXIdentityButton /> : null}
      </div>
    </>
  );
}
