"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { landingContent } from "@/lib/landing/content";

const savedSchema = z.object({ ok: z.literal(true) });

export function ContactDialog({
  triggerClassName,
  label,
}: {
  readonly triggerClassName: string;
  readonly label?: string;
}) {
  const copy = landingContent.contact;
  const id = useId();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ field: "email" | "message" | "form"; text: string }>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const requestId = useRef<string | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);

  function reset(open: boolean) {
    if (!open || submitting.current || !sent) return;
    setEmail("");
    setMessage("");
    setError(undefined);
    setSent(false);
    requestId.current = null;
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(undefined);
    const validEmail = z.email().max(254).safeParse(email.trim());
    if (!validEmail.success) {
      setError({ field: "email", text: copy.invalidEmail });
      emailInput.current?.focus();
      return;
    }
    if (!message.trim() || message.trim().length > 2000) {
      setError({ field: "message", text: message.trim() ? copy.tooLong : copy.empty });
      messageInput.current?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId.current },
        body: JSON.stringify({ kind: "contact", email: validEmail.data, message: message.trim() }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !savedSchema.safeParse(body).success) {
        setError({ field: "form", text: response.status === 429 ? copy.rateLimit : copy.error });
        return;
      }
      setSent(true);
    } catch {
      setError({ field: "form", text: copy.error });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className={`h-auto min-h-11 p-0 text-inherit desk:min-h-6 ${triggerClassName}`}
        >
          {label ?? copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain [&>button]:size-11 desk:[&>button]:size-6">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <>
            <p role="status">{copy.thanks}</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button className="min-h-11 desk:min-h-8">{copy.close}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={send} noValidate className="grid gap-4" aria-busy={pending}>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-email`}>{copy.email}</Label>
              <Input
                ref={emailInput}
                id={`${id}-email`}
                name="email"
                type="email"
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="email"
                maxLength={254}
                required
                readOnly={pending}
                value={email}
                placeholder={copy.emailPlaceholder}
                className="h-11 desk:h-9"
                aria-invalid={error?.field === "email"}
                aria-describedby={error?.field === "email" ? `${id}-error` : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(undefined);
                  requestId.current = null;
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-message`}>{copy.label}</Label>
              <Textarea
                ref={messageInput}
                id={`${id}-message`}
                name="message"
                autoComplete="off"
                value={message}
                placeholder={copy.placeholder}
                rows={5}
                maxLength={2000}
                required
                readOnly={pending}
                aria-invalid={error?.field === "message"}
                aria-describedby={error?.field === "message" ? `${id}-error` : undefined}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError(undefined);
                  requestId.current = null;
                }}
              />
            </div>
            {error ? (
              <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
                {error.text}
              </p>
            ) : null}
            <DialogFooter>
              <Button className="min-h-11 desk:min-h-8" type="submit" disabled={pending}>
                {pending ? copy.sending : copy.send}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
