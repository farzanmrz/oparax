"use client";

// app/agents/new/create-desk-form.tsx
//
// The create-desk screen: a full-width form — Desk name + Beat across the top, then Sources and
// Voice side by side — with a short "what happens next" panel below. Tracked accounts accept
// comma/space/newline paste with or without a leading @, capped at MAX_TRACKED_HANDLES; the
// server (createDesk) re-validates + re-caps. Identity comes from a linked X account (Connect X)
// rather than a typed handle — `xLinkState` is fetched server-side by page.tsx and handed down
// as a prop, since a client component can't read the reporter's own OAuth link state without a
// round trip. Once createDesk succeeds this same screen swaps to a live extraction view
// (extraction-progress.tsx) instead of redirecting straight into the desk — the old
// submit-and-redirect flow is gone.

import { InfoIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
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
import { MAX_WEBSITES } from "@/lib/websites";
import { MAX_TRACKED_HANDLES as MAX_TRACKED } from "@/lib/x/handle";
import { saveWebsites } from "../[id]/setup/actions";
import { createDesk } from "./actions";
import { ExtractionProgress } from "./extraction-progress";

/** Split a typed/pasted blob into candidate website entries — comma / whitespace / newline
 *  separated. Light client-side shaping only; `saveWebsites` (server) does the real
 *  URL validation, same division of labor as the X-handles field below. */
function splitWebsites(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeWebsites(existing: readonly string[], incoming: readonly string[]): string[] {
  const next = [...existing];
  for (const site of incoming) {
    if (next.length >= MAX_WEBSITES) break;
    if (!next.some((s) => s.toLowerCase() === site.toLowerCase())) next.push(site);
  }
  return next;
}

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

export function CreateDeskForm({
  xLinkState,
  canOverrideHandle,
}: {
  readonly xLinkState: { linked: boolean; handle: string | null };
  /** Owner-only (`lib/owner-allowlist.ts`): render the extract-from handle as editable instead
   *  of a disabled mirror of the connected account. Presentation only — `createDesk` re-checks
   *  the allowlist server-side and ignores the value for anyone else. */
  readonly canOverrideHandle: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [beat, setBeat] = useState("");
  const [handles, setHandles] = useState<string[]>([]);
  const [handleDraft, setHandleDraft] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdDeskId, setCreatedDeskId] = useState<string | null>(null);
  // Pre-filled with the connected handle so the default submit is byte-identical to the
  // non-override path; only an allowlisted owner can edit it away from that default.
  const [extractFrom, setExtractFrom] = useState(xLinkState.handle ?? "");

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

  function commitWebsiteDraft() {
    const parts = splitWebsites(websiteDraft);
    if (parts.length > 0) setWebsites((prev) => mergeWebsites(prev, parts));
    setWebsiteDraft("");
  }

  function onWebsiteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitWebsiteDraft();
    }
  }

  function removeWebsite(site: string) {
    setWebsites((prev) => prev.filter((s) => s !== site));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!xLinkState.linked) {
      setFormError("Connect your X account before creating an agent.");
      return;
    }
    const finalHandles = mergeHandles(handles, splitHandles(handleDraft));
    const finalWebsites = mergeWebsites(websites, splitWebsites(websiteDraft));
    startTransition(async () => {
      const result = await createDesk({
        name,
        beat,
        trackedHandles: finalHandles,
        // Sent only when an allowlisted owner actually changed it — an unchanged value is the
        // connected handle, which the server would resolve identically on its own.
        ...(canOverrideHandle && extractFrom.trim() && extractFrom.trim() !== xLinkState.handle
          ? { extractFromHandle: extractFrom }
          : {}),
      });
      if (result.error || !result.id) {
        setFormError(result.error ?? "Could not create your agent. Please try again.");
        return;
      }
      const deskId = result.id;
      // Best-effort, same discipline as voice extraction's after() call: the desk already
      // exists, so a websites-save failure must never block navigation or the desk's creation.
      if (finalWebsites.length > 0) {
        saveWebsites(deskId, finalWebsites).catch((err) => {
          console.error("createDesk: saveWebsites failed", err);
        });
      }
      setCreatedDeskId(deskId);
    });
  }

  const canSubmit = beat.trim().length > 0 && xLinkState.linked && !isPending;
  const reporterDisplay = xLinkState.linked && xLinkState.handle ? `@${xLinkState.handle}` : "your";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-border border-b py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <OparaxMark className="size-5" />
        </span>
        <h1 className="min-w-0 flex-1 truncate font-semibold text-lg tracking-tight">
          {createdDeskId ? "Building your voice guide" : "Create agent"}
        </h1>
        <Button aria-label="Close" asChild size="icon-sm" variant="ghost">
          <Link href={createdDeskId ? `/agents/${createdDeskId}` : "/agents"}>
            <XIcon />
          </Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-10">
        {createdDeskId ? (
          <ExtractionProgress deskId={createdDeskId} />
        ) : (
          <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <FieldLabel help="Shown in the agent switcher at the top. Optional — defaults to a label from your beat.">
                  Agent name
                </FieldLabel>
                <Input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Barça watch"
                  value={name}
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <FieldLabel help="The topic this agent watches. Be specific — it steers what counts as a story worth drafting.">
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
                  <FieldLabel help="The X accounts this agent watches for breaking stories. Paste several at once — comma- or space-separated, with or without the @.">
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

                <div className="flex flex-col gap-1.5">
                  <FieldLabel help="News sites this agent watches, alongside X accounts. Paste several at once — comma- or space-separated.">
                    Websites ({websites.length}/{MAX_WEBSITES})
                  </FieldLabel>
                  {websites.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {websites.map((site) => (
                        <Badge className="gap-1 pr-1" key={site} variant="secondary">
                          {site}
                          <button
                            aria-label={`Remove ${site}`}
                            className="rounded-full p-0.5 hover:bg-foreground/10"
                            onClick={() => removeWebsite(site)}
                            type="button"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <Input
                    disabled={websites.length >= MAX_WEBSITES}
                    onBlur={commitWebsiteDraft}
                    onChange={(e) => setWebsiteDraft(e.target.value)}
                    onKeyDown={onWebsiteKeyDown}
                    placeholder={
                      websites.length >= MAX_WEBSITES
                        ? `Up to ${MAX_WEBSITES} sites`
                        : "example.com — press Enter to add"
                    }
                    value={websiteDraft}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SectionHeader>Voice</SectionHeader>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel help="Connect your X account. Oparax reads your recent posts to learn how you write, so drafts land in your voice — not a generic tone.">
                    Your X account
                  </FieldLabel>
                  {xLinkState.linked && xLinkState.handle ? (
                    <Input disabled value={`@${xLinkState.handle}`} />
                  ) : (
                    <Button asChild className="w-fit" variant="outline">
                      <a href={`/auth/x?returnTo=${encodeURIComponent("/agents/new")}`}>
                        Connect X
                      </a>
                    </Button>
                  )}
                </div>

                {/* Owner-only. Rendered as its OWN field rather than by making the one above
                    editable, because they are two different facts: the account that publishes
                    (owner-keyed, resolved by getXAccount at post time) and the voice drafts are
                    written in (this agent's reporter_handle). The product keeps them fused for
                    real users; separating them here is what makes testing another reporter
                    possible without touching either mechanism. */}
                {canOverrideHandle && xLinkState.linked ? (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel
                      badge={<Badge variant="secondary">Owner only</Badge>}
                      help="Whose voice this agent writes in. Defaults to your connected account. Posts still publish from your connected account either way."
                    >
                      Extract voice from
                    </FieldLabel>
                    <Input
                      onChange={(e) => setExtractFrom(e.target.value)}
                      placeholder="handle without the @"
                      value={extractFrom}
                    />
                  </div>
                ) : null}

                <p className="text-sm text-muted-foreground">
                  Draft instructions aren&apos;t set here — once your agent is created, Oparax
                  learns your voice from your posts, and you can add or edit specific rules anytime
                  from the agent&apos;s Voice tab.
                </p>
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
                Create agent
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-5">
              <p className="font-semibold text-foreground text-sm">
                What happens when you create this agent
              </p>
              <ol className="mt-3 flex flex-col gap-2 text-muted-foreground text-sm">
                <li>1. Oparax builds your writing voice from {reporterDisplay} recent posts.</li>
                <li>
                  2. It watches{" "}
                  {handles.length > 0
                    ? `${handles.length} tracked account${handles.length === 1 ? "" : "s"}`
                    : "your tracked accounts"}{" "}
                  for breaking stories on this beat.
                </li>
                <li>
                  3. Each story gets a draft in your voice — you review and post from the Feed.
                </li>
              </ol>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
