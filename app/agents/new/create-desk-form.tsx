"use client";

// app/agents/new/create-desk-form.tsx
//
// The create-desk screen: a full-width form — Desk name + Beat across the top, then Sources and
// Voice side by side — with a short "what happens next" panel below. Tracked accounts accept
// comma/space/newline paste with or without a leading @, capped at MAX_TRACKED_HANDLES; the
// server (createDesk) re-validates + re-caps. No model call runs from this screen.

import { InfoIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { OparaxMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_TRACKED_HANDLES as MAX_TRACKED } from "@/lib/x/handle";
import { createDesk } from "./actions";

/** Strip leading @(s) + whitespace. Case is preserved for display; the server lowercases and
 *  charset-validates on save (lib/x/handle.ts). */
function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/** Split a typed/pasted blob into candidate handles — comma / whitespace / newline separated,
 *  each with or without a leading @. */
function splitHandles(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map(cleanHandle)
    .filter(Boolean);
}

/** Merge new handles into an existing list: case-insensitive dedupe, capped at MAX_TRACKED. */
function mergeHandles(existing: readonly string[], incoming: readonly string[]): string[] {
  const next = [...existing];
  for (const handle of incoming) {
    if (next.length >= MAX_TRACKED) break;
    if (!next.some((h) => h.toLowerCase() === handle.toLowerCase())) next.push(handle);
  }
  return next;
}

/** Field label — sentence case, readable weight (not a faint micro-label), with optional ⓘ
 *  hover-help and a trailing badge. */
function FieldLabel({
  children,
  help,
  badge,
}: {
  readonly children: ReactNode;
  readonly help?: string;
  readonly badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="What is this for?"
              className="text-muted-foreground/70 transition-colors hover:text-foreground"
              type="button"
            >
              <InfoIcon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{help}</TooltipContent>
        </Tooltip>
      ) : null}
      {badge}
    </div>
  );
}

function SectionHeader({ children }: { readonly children: ReactNode }) {
  return (
    <h2 className="border-border border-b pb-2 font-semibold text-base text-foreground">
      {children}
    </h2>
  );
}

function SoonBadge() {
  return (
    <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
      Coming soon
    </Badge>
  );
}

export function CreateDeskForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [beat, setBeat] = useState("");
  const [handles, setHandles] = useState<string[]>([]);
  const [handleDraft, setHandleDraft] = useState("");
  const [reporterHandle, setReporterHandle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const atLimit = handles.length >= MAX_TRACKED;

  function commitDraft() {
    const parts = splitHandles(handleDraft);
    if (parts.length > 0) setHandles((prev) => mergeHandles(prev, parts));
    setHandleDraft("");
  }

  function onTrackedKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    }
  }

  function onTrackedPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[\s,]/.test(text)) {
      e.preventDefault();
      setHandles((prev) => mergeHandles(prev, splitHandles(`${handleDraft} ${text}`)));
      setHandleDraft("");
    }
  }

  function removeHandle(handle: string) {
    setHandles((prev) => prev.filter((h) => h !== handle));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const finalHandles = mergeHandles(handles, splitHandles(handleDraft));
    startTransition(async () => {
      const result = await createDesk({ name, beat, trackedHandles: finalHandles, reporterHandle });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.push(`/agents/${result.id}/voice`);
    });
  }

  const canSubmit = beat.trim().length > 0 && reporterHandle.trim().length > 0 && !isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-border border-b py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <OparaxMark className="size-5" />
        </span>
        <h1 className="min-w-0 flex-1 truncate font-semibold text-lg tracking-tight">
          Create desk
        </h1>
        <Button aria-label="Close" asChild size="icon-sm" variant="ghost">
          <Link href="/agents">
            <XIcon />
          </Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-10">
        <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <FieldLabel help="Shown in the desk switcher at the top. Optional — defaults to a label from your beat.">
                Desk name
              </FieldLabel>
              <Input
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Barça watch"
                value={name}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <FieldLabel help="The topic this desk watches. Be specific — it steers what counts as a story worth drafting.">
                Beat
              </FieldLabel>
              <Textarea
                onChange={(e) => setBeat(e.target.value)}
                placeholder="e.g. US AI regulation — agencies, hearings, enforcement. Skip product launches."
                rows={3}
                value={beat}
              />
            </div>

            <div className="flex flex-col gap-4">
              <SectionHeader>Sources</SectionHeader>

              <div className="flex flex-col gap-1.5">
                <FieldLabel help="The X accounts this desk watches for breaking stories. Paste several at once — comma- or space-separated, with or without the @.">
                  Tracked X accounts ({handles.length}/{MAX_TRACKED})
                </FieldLabel>
                {handles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {handles.map((handle) => (
                      <Badge className="gap-1 pr-1" key={handle} variant="secondary">
                        @{handle}
                        <button
                          aria-label={`Remove @${handle}`}
                          className="rounded-full p-0.5 hover:bg-foreground/10"
                          onClick={() => removeHandle(handle)}
                          type="button"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <Input
                  disabled={atLimit}
                  onBlur={commitDraft}
                  onChange={(e) => setHandleDraft(e.target.value)}
                  onKeyDown={onTrackedKeyDown}
                  onPaste={onTrackedPaste}
                  placeholder={
                    atLimit
                      ? `Up to ${MAX_TRACKED} accounts`
                      : "Paste handles — comma-separated, @ optional"
                  }
                  value={handleDraft}
                />
              </div>

              <div className="flex flex-col gap-1.5 opacity-55">
                <FieldLabel badge={<SoonBadge />}>Websites</FieldLabel>
                <Input disabled placeholder="https:// …" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <SectionHeader>Voice</SectionHeader>

              <div className="flex flex-col gap-1.5">
                <FieldLabel help="Your own X handle. Oparax reads your recent posts to learn how you write, so drafts land in your voice — not a generic tone.">
                  Your X handle
                </FieldLabel>
                <Input
                  onChange={(e) => setReporterHandle(e.target.value)}
                  placeholder="yourhandle (@ optional)"
                  value={reporterHandle}
                />
              </div>

              <div className="flex flex-col gap-1.5 opacity-55">
                <FieldLabel badge={<SoonBadge />}>Draft instructions</FieldLabel>
                <Textarea disabled placeholder='e.g. "never speculate on outcomes"' rows={2} />
              </div>
            </div>
          </div>

          {formError ? <p className="text-destructive text-sm">{formError}</p> : null}

          <div>
            <Button
              className="w-full sm:w-auto sm:min-w-56"
              disabled={!canSubmit}
              size="lg"
              type="submit"
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Create desk
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-5">
            <p className="font-semibold text-foreground text-sm">
              What happens when you create this desk
            </p>
            <ol className="mt-3 flex flex-col gap-2 text-muted-foreground text-sm">
              <li>
                1. Oparax builds your writing voice from{" "}
                {reporterHandle.trim() ? `@${cleanHandle(reporterHandle)}` : "your"} recent posts.
              </li>
              <li>
                2. It watches{" "}
                {handles.length > 0
                  ? `${handles.length} tracked account${handles.length === 1 ? "" : "s"}`
                  : "your tracked accounts"}{" "}
                for breaking stories on this beat.
              </li>
              <li>3. Each story gets a draft in your voice — you review and post from the Feed.</li>
            </ol>
          </div>
        </form>
      </div>
    </div>
  );
}
