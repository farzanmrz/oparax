"use client";

// app/agents/new/create-desk-form.tsx
//
// The create-desk screen: a single-column form grouped into Beat / Sources / Voice, with a
// short "what happens next" panel below (form-first, not a side-by-side split). Tracked
// accounts accept comma/space/newline paste with or without a leading @, capped at MAX_TRACKED;
// the server (createDesk) re-validates + re-caps. No model call runs from this screen.

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

/** Sentence-case field label with an optional ⓘ hover-help and an optional trailing badge. */
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
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="What is this for?"
              className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
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
    // Fold any uncommitted draft into the handles before sending.
    const finalHandles = mergeHandles(handles, splitHandles(handleDraft));
    startTransition(async () => {
      const result = await createDesk({ beat, trackedHandles: finalHandles, reporterHandle });
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
      <header className="flex shrink-0 items-center gap-3 border-b border-border py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <OparaxMark className="size-5" />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          Create desk
        </h1>
        <Button aria-label="Close" asChild size="icon-sm" variant="ghost">
          <Link href="/agents">
            <XIcon />
          </Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-10">
        <form className="mx-auto flex w-full max-w-xl flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
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
            <p className="text-sm font-semibold text-foreground">Sources</p>

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
            <p className="text-sm font-semibold text-foreground">Voice</p>

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

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <Button className="w-full" disabled={!canSubmit} size="lg" type="submit">
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Create desk
          </Button>

          <div className="rounded-xl border border-border bg-card/40 p-5">
            <p className="text-sm font-semibold text-foreground">
              What happens when you create this desk
            </p>
            <ol className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
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
