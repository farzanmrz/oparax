"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { z } from "zod";
import { RefreshXIdentityButton } from "@/components/auth/refresh-x-identity";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  onboardingContent,
  type SetupErrorCode,
  setupErrorMessage,
  setupErrorSchema,
} from "@/lib/onboarding/content";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

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
        <p role="status" className="text-sm leading-relaxed">
          {onboardingContent.buildsUnavailable}
        </p>
      )}
      <form
        action={closed ? "/api/waitlist" : "/api/build"}
        method="post"
        onSubmit={submit}
        className="flex flex-col gap-4"
        aria-busy={pending}
      >
        <FieldGroup>
          {verifiedHandle ? (
            <Field>
              <FieldTitle>{onboardingContent.handleLabel}</FieldTitle>
              <p className="text-sm font-medium">@{verifiedHandle}</p>
              <FieldDescription>{onboardingContent.handleHelpVerified}</FieldDescription>
            </Field>
          ) : (
            <Field data-invalid={handleInvalid || undefined}>
              <FieldLabel htmlFor="handle">{onboardingContent.handleLabel}</FieldLabel>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-muted-foreground"
                >
                  @
                </span>
                <Input
                  ref={handleInput}
                  id="handle"
                  name="handle"
                  className="min-h-11 pl-7 desk:min-h-7"
                  autoComplete="off"
                  placeholder={onboardingContent.handlePlaceholder}
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  aria-describedby="handle-help"
                  aria-invalid={handleInvalid || undefined}
                  required
                />
              </div>
              <FieldDescription id="handle-help">
                {onboardingContent.handleHelpTyped}
              </FieldDescription>
            </Field>
          )}
          <Field data-invalid={beatInvalid || undefined}>
            <FieldLabel htmlFor="beat">{onboardingContent.beatLabel}</FieldLabel>
            <Textarea
              ref={beatInput}
              id="beat"
              name="beat"
              className="min-h-28"
              placeholder={onboardingContent.beatPlaceholder}
              value={beat}
              onChange={(event) => setBeat(event.target.value)}
              aria-describedby="beat-count"
              aria-invalid={beatInvalid || undefined}
              maxLength={300}
              required
            />
            <FieldDescription id="beat-count" aria-live="polite">
              {onboardingContent.beatCount(beat.length)}
            </FieldDescription>
          </Field>
        </FieldGroup>

        {failure && failure.code !== "builds_unavailable" && (
          <p role="alert" className="text-sm leading-relaxed text-destructive">
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
          <p role="alert" className="text-sm leading-relaxed text-destructive">
            {waitlistFailure === "bot"
              ? onboardingContent.browserError
              : onboardingContent.waitlistFailed}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm">
            {onboardingContent.saved}
          </p>
        )}
        <Button type="submit" className="min-h-11 w-full desk:min-h-7" disabled={pending || saved}>
          {pending && <Spinner data-icon="inline-start" />}
          {closed
            ? pending
              ? onboardingContent.saving
              : onboardingContent.waitlist
            : pending
              ? onboardingContent.pending
              : onboardingContent.submit}
        </Button>
      </form>
      {refreshX && <RefreshXIdentityButton />}
    </div>
  );
}
