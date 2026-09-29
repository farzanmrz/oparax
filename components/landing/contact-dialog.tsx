"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { landingContent } from "@/lib/landing/content";

const copy = landingContent.contact;
const mailto = `mailto:${copy.address}?subject=${encodeURIComponent(copy.subject)}`;
// A browser with no mail app set up opens an empty mail setup on mailto, so Gmail's web composer is offered beside it.
const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(copy.address)}&su=${encodeURIComponent(copy.subject)}`;

export function ContactDialog({
  triggerClassName,
  label,
}: {
  readonly triggerClassName: string;
  readonly label?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard
      .writeText(copy.address)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  return (
    <Dialog onOpenChange={() => setCopied(false)}>
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] font-medium select-all">{copy.address}</span>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 desk:min-h-8"
            onClick={copyAddress}
            aria-live="polite"
          >
            {copied ? copy.copied : copy.copy}
          </Button>
        </div>
        <DialogFooter>
          <Button asChild variant="outline" className="min-h-11 desk:min-h-8">
            <a href={gmail} target="_blank" rel="noopener noreferrer">
              {copy.gmail}
            </a>
          </Button>
          <Button asChild className="min-h-11 desk:min-h-8">
            <a href={mailto}>{copy.mailApp}</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
