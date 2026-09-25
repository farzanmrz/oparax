"use client";

import { useId, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { landingContent } from "@/lib/landing/content";

// Owner, September 24: the contact form is UI only for now; sending is a later step, so nothing
// is stored or delivered and the confirmation does not claim delivery.
export function ContactDialog({
  triggerClassName,
  label,
}: {
  readonly triggerClassName: string;
  readonly label?: string;
}) {
  const copy = landingContent.contact;
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const errorId = useId();

  function reset(open: boolean) {
    if (open) return;
    setMessage("");
    setError(false);
    setSent(false);
  }

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError(true);
      return;
    }
    setSent(true);
  }

  return (
    <Dialog onOpenChange={reset}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          {label ?? copy.trigger}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{sent ? copy.thanks : copy.description}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <DialogFooter>
            <DialogClose asChild>
              <Button>{copy.close}</Button>
            </DialogClose>
          </DialogFooter>
        ) : (
          <form onSubmit={send} noValidate className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor={fieldId}>{copy.label}</Label>
              <Textarea
                id={fieldId}
                value={message}
                placeholder={copy.placeholder}
                rows={5}
                aria-invalid={error || undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (error) setError(false);
                }}
              />
              {error && (
                <p id={errorId} role="alert" className="text-xs text-destructive">
                  {copy.empty}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit">{copy.send}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
