"use client";

import posthog from "posthog-js";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { landingContent } from "@/lib/landing/content";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const errorSchema = z.enum(["handle", "beat", "notfound", "lookup"]);
const responseSchema = z.union([
  z.object({ redirect: z.string().regex(/^\/[A-Za-z0-9_]{1,15}$/) }),
  z.object({ error: errorSchema }),
  z.object({ closed: z.literal(true) }),
]);
const savedSchema = z.object({ ok: z.literal(true) });

export function BuildBox({
  closed = false,
  error,
  handle = "",
}: {
  closed?: boolean;
  error?: string;
  handle?: string;
}) {
  const copy = landingContent.box;
  const id = useId();
  const handleInput = useRef<HTMLInputElement>(null);
  const beatInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [handleValue, setHandle] = useState(handle);
  const [beat, setBeat] = useState("");
  const [isClosed, setClosed] = useState(closed);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldError, setFieldError] = useState(errorSchema.safeParse(error).data);
  const [requestError, setRequestError] = useState<string>();

  useEffect(() => {
    handleInput.current?.focus({ preventScroll: true });
  }, []);

  function showFieldError(value: z.infer<typeof errorSchema>) {
    setFieldError(value);
    (value === "beat" ? beatInput : handleInput).current?.focus({ preventScroll: true });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setRequestError(undefined);
    setFieldError(undefined);
    const normalized = normalizeValidHandle(handleValue);
    if (!normalized || isReservedHandle(normalized)) return showFieldError("handle");
    if (!isClosed && !beat.trim()) return showFieldError("beat");
    submitting.current = true;
    setPending(true);
    if (!isClosed) {
      try {
        posthog.capture("agent_build_requested", { placement: "landing" });
      } catch {
        // Analytics must never prevent the build request.
      }
    }
    try {
      const response = await fetch(isClosed ? "/api/waitlist" : "/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ handle: normalized, beat: beat.trim() }),
      });
      if (response.status === 403) {
        setRequestError(copy.browserError);
        return;
      }
      const body: unknown = await response.json();
      if (isClosed) {
        if (!response.ok || !savedSchema.safeParse(body).success) {
          setRequestError(copy.waitlistError);
          return;
        }
        setSaved(true);
        return;
      }
      const result = responseSchema.safeParse(body);
      if (!result.success) {
        setRequestError(copy.requestError);
      } else if ("error" in result.data) {
        showFieldError(result.data.error);
      } else if ("closed" in result.data) {
        setClosed(true);
      } else if (response.ok && !isReservedHandle(result.data.redirect.slice(1))) {
        window.location.assign(result.data.redirect);
      } else {
        setRequestError(copy.requestError);
      }
    } catch {
      setRequestError(isClosed ? copy.waitlistError : copy.requestError);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const handleError = fieldError && fieldError !== "beat" ? copy.errors[fieldError] : undefined;
  return (
    <form
      id="build-agent"
      method="post"
      action="/api/build"
      onSubmit={submit}
      className="grid scroll-mt-20 gap-4 desk:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] desk:items-start"
      aria-busy={pending}
    >
      <div className="desk:col-span-3" role="status">
        {saved ? copy.saved : isClosed ? copy.closed : null}
      </div>
      {!saved ? (
        <>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={`${id}-handle`}>{copy.handle}</Label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-muted-foreground"
              >
                {copy.prefix}
              </span>
              <Input
                ref={handleInput}
                id={`${id}-handle`}
                name="handle"
                value={handleValue}
                onChange={(event) => {
                  setHandle(event.target.value);
                  setFieldError(undefined);
                }}
                placeholder={copy.handlePlaceholder}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={16}
                required
                readOnly={pending}
                aria-invalid={!!handleError}
                aria-describedby={handleError ? `${id}-handle-error` : undefined}
                className="h-11 scroll-mt-20 pl-8 font-mono"
              />
            </div>
            {handleError ? (
              <p id={`${id}-handle-error`} role="alert" className="text-sm text-destructive">
                {handleError}
              </p>
            ) : null}
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={`${id}-beat`}>{copy.beat}</Label>
            <Input
              ref={beatInput}
              id={`${id}-beat`}
              name="beat"
              autoComplete="off"
              value={beat}
              onChange={(event) => {
                setBeat(event.target.value);
                if (fieldError === "beat") setFieldError(undefined);
              }}
              placeholder={copy.beatPlaceholder}
              maxLength={isClosed ? 2000 : 300}
              required={!isClosed}
              readOnly={pending}
              aria-invalid={fieldError === "beat"}
              aria-describedby={fieldError === "beat" ? `${id}-beat-error` : undefined}
              className="h-11 scroll-mt-20"
            />
            {fieldError === "beat" ? (
              <p id={`${id}-beat-error`} role="alert" className="text-sm text-destructive">
                {copy.errors.beat}
              </p>
            ) : null}
          </div>
          <Button className="h-11 desk:mt-6" type="submit" disabled={pending}>
            {pending
              ? isClosed
                ? copy.saving
                : copy.pending
              : isClosed
                ? copy.leaveHandle
                : copy.submit}
          </Button>
        </>
      ) : null}
      {requestError ? (
        <p role="alert" className="text-sm text-destructive desk:col-span-3">
          {requestError}
        </p>
      ) : null}
    </form>
  );
}
