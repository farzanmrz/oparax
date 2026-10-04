"use client";

import { BadgeCheck, Sparkles } from "lucide-react";
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
  "w-full rounded-lg border border-line-strong bg-well text-t1 placeholder:text-t3 outline-none transition-shadow";

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
  const beatInput = useRef<HTMLTextAreaElement>(null);
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

  return (
    <div className="flex flex-col gap-4">
      {closed && (
        <p
          role="status"
          className="rounded-lg border border-line bg-well px-3 py-2 text-[13px] leading-relaxed text-t1"
        >
          {onboardingContent.buildsUnavailable}
        </p>
      )}
      <form action="/api/build" method="post" onSubmit={submit} aria-busy={pending}>
        {verifiedHandle ? (
          <div>
            <p className="text-[13px] font-medium text-t2">{onboardingContent.handleLabel}</p>
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-line-strong bg-well px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white uppercase">
                {verifiedHandle.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-t1">
                @{verifiedHandle}
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--ok)]">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {onboardingContent.verifiedBadge}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-t3">
              {onboardingContent.handleHelpVerified}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="handle" className="text-[13px] font-medium text-t2">
              {onboardingContent.handleLabel}
            </label>
            <div
              className={cn(
                field,
                "mt-2 flex h-11 items-center gap-2 px-3 focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]",
                handleInvalid && "border-[var(--error)]",
              )}
            >
              <span aria-hidden="true" className="text-t3">
                @
              </span>
              <input
                ref={handleInput}
                id="handle"
                name="handle"
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
                autoComplete="off"
                placeholder={onboardingContent.handlePlaceholder}
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                aria-describedby={handleInvalid ? "handle-help setup-error" : "handle-help"}
                aria-invalid={handleInvalid || undefined}
                required
              />
              <BrandIcon name="x" className="size-3.5 text-t3" />
            </div>
            <p id="handle-help" className="mt-2 text-[12.5px] leading-relaxed text-t3">
              {onboardingContent.handleHelpTyped}
            </p>
          </div>
        )}
        <label htmlFor="beat" className="mt-6 block text-[13px] font-medium text-t2">
          {onboardingContent.beatLabel}
        </label>
        <textarea
          ref={beatInput}
          id="beat"
          name="beat"
          rows={3}
          className={cn(
            field,
            "mt-2 block resize-none px-3.5 py-3 text-[16px] leading-[1.5] focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)]",
            beatInvalid && "border-[var(--error)]",
          )}
          placeholder={onboardingContent.beatPlaceholder}
          value={beat}
          onChange={(event) => setBeat(event.target.value)}
          aria-describedby={beatInvalid ? "beat-count setup-error" : "beat-count"}
          aria-invalid={beatInvalid || undefined}
          maxLength={300}
          required
        />
        <p
          id="beat-count"
          aria-live="polite"
          className="mt-2 text-right text-[12.5px] text-t3 tabular-nums"
        >
          {onboardingContent.beatCount(beat.length)}
        </p>

        {failure && failure.code !== "builds_unavailable" && (
          <p
            id="setup-error"
            role="alert"
            className="mt-3 text-[13px] leading-relaxed text-[var(--error)]"
          >
            {failure.code === "signed_out" ? (
              <Link href="/login" className="underline underline-offset-4">
                {onboardingContent.signedOut}
              </Link>
            ) : (
              setupErrorMessage(
                failure.code,
                verifiedHandle !== null,
                normalizedHandle,
                failure.generic,
              )
            )}
          </p>
        )}
        {waitlistFailure && (
          <p role="alert" className="mt-3 text-[13px] leading-relaxed text-[var(--error)]">
            {waitlistFailure === "bot"
              ? onboardingContent.browserError
              : onboardingContent.waitlistFailed}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-3 text-[13px] text-t1">
            {onboardingContent.saved}
          </p>
        )}
        <button
          type="submit"
          className={cn(primaryButton, "mt-6 h-11 w-full")}
          disabled={pending || saved}
        >
          {pending ? (
            <Spinner />
          ) : closed ? null : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {closed
            ? pending
              ? onboardingContent.saving
              : onboardingContent.waitlist
            : pending
              ? onboardingContent.pending
              : onboardingContent.submit}
        </button>
      </form>
      {refreshX && <RefreshXIdentityButton />}
    </div>
  );
}
