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

import { CheckIcon, InfoIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
  useTransition,
} from "react";
import { ChipsField } from "@/components/chips-field";
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

/** Where the in-progress form is parked across the Connect-X OAuth round trip. Session-scoped
 *  and consumed on read — see the restoring effect in CreateDeskForm. */
const DRAFT_KEY = "oparax:new-agent-draft";

/** The fields worth surviving the round trip. Websites are excluded (greyed / dormant) and
 *  `extractFrom` is excluded on purpose — it repopulates from the freshly connected handle. */
type PersistedDraft = {
  name: string;
  beat: string;
  handles: string[];
  handleDraft: string;
};

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

  // Connect X is a full-page OAuth round trip (this page -> x.com -> /auth/x/callback -> back
  // here as a FRESH mount), so component state does not survive it. Without this, a reporter who
  // fills the whole form and only then notices they must connect X loses every field they typed
  // — the single worst moment to wipe someone's work, because they did nothing wrong.
  //
  // sessionStorage rather than a URL param (no length limit, nothing leaked into history or
  // server logs) and rather than a server-side draft (no table for a value that lives ~15s).
  // Read in an effect, never during render: touching sessionStorage while rendering would
  // desync SSR and client HTML.
  useEffect(() => {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    // One-shot handoff: consumed on read, so a later visit starts clean rather than resurrecting
    // an abandoned draft the reporter has no memory of.
    window.sessionStorage.removeItem(DRAFT_KEY);
    try {
      const draft: unknown = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return;
      const d = draft as Partial<Record<keyof PersistedDraft, unknown>>;
      if (typeof d.name === "string") setName(d.name);
      if (typeof d.beat === "string") setBeat(d.beat);
      if (typeof d.handleDraft === "string") setHandleDraft(d.handleDraft);
      if (Array.isArray(d.handles)) {
        setHandles(d.handles.filter((h): h is string => typeof h === "string"));
      }
      // `extractFrom` is deliberately NOT restored — it was empty before the round trip and is
      // now correctly pre-filled from the handle the reporter just connected.
    } catch {
      // A malformed draft is not worth surfacing: the field it would have refilled is empty,
      // which is exactly what the reporter sees anyway.
    }
  }, []);

  /** Snapshot the form before handing the tab to X's OAuth screen. */
  function persistDraft() {
    const draft: PersistedDraft = { name, beat, handles, handleDraft };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Private-mode / quota failure — the connect must still proceed. Losing the draft is bad;
      // blocking the one action that unblocks the form is worse.
    }
  }

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
    // Full-bleed by design: the three columns below need the width, and the page already sits
    // inside the /agents layout's padding. No max-width cap — a narrower measure would push the
    // columns back into a stack on exactly the screens that can afford three.
    <div className="flex h-full min-h-0 flex-col">
      {/* No brand mark here — the site header already renders the Oparax logo directly above,
          and a second one 60px below it reads as a duplicate rather than a section marker. */}
      <header className="flex shrink-0 items-center gap-3 border-border border-b py-5">
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
            {/* Three peer columns — Basics / Sources / Voice — at lg and up, two at md, stacked
                below. Nothing spans, which is the point: the previous layout ran name and beat
                full-bleed across the top, so on a wide screen they stretched to the viewport
                while the fields under them stayed narrow. Equal columns keep every field on one
                measure. */}
            <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-4">
                <SectionHeader>Basics</SectionHeader>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel help="Shown in the agent switcher at the top. Optional — defaults to a label from your beat.">
                    Agent name
                  </FieldLabel>
                  <Input
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Barça watch"
                    value={name}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel help="The topic this agent watches. Be specific — it steers what counts as a story worth drafting.">
                    Beat
                  </FieldLabel>
                  <Textarea
                    onChange={(e) => setBeat(e.target.value)}
                    placeholder="e.g. US AI regulation — agencies, hearings, enforcement. Skip product launches."
                    rows={5}
                    value={beat}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SectionHeader>Sources</SectionHeader>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel help="The X accounts this agent watches for breaking stories. Paste several at once — comma- or space-separated, with or without the @.">
                    Tracked X accounts ({handles.length}/{MAX_TRACKED})
                  </FieldLabel>
                  {/* Chips live INSIDE the box with the input, not stacked above it — a chip is
                      the field's current value, and rendering it outside read as unrelated
                      content sitting between the label and its input. Same component the Setup
                      card uses, so the two can't drift apart again. */}
                  <ChipsField
                    chipLabel={(handle) => `@${handle}`}
                    chips={handles}
                    inputDisabled={atLimit}
                    onBlur={commitDraft}
                    onChange={setHandleDraft}
                    onKeyDown={onTrackedKeyDown}
                    onPaste={onTrackedPaste}
                    onRemove={removeHandle}
                    onSubmit={commitDraft}
                    placeholder={
                      atLimit
                        ? `Up to ${MAX_TRACKED} accounts`
                        : "Paste handles — comma-separated, @ optional"
                    }
                    removeDisabled={false}
                    removeLabel={(handle) => `Remove @${handle}`}
                    value={handleDraft}
                  />
                </div>

                {/* Greyed to match the Setup card's Sources treatment (opacity + "Coming soon"
                    + disabled). Website sources are dormant by design — nothing scrapes them —
                    so an ACTIVE field here promised an ingestion path that does not exist:
                    typed sites saved fine and were then silently never read. Un-grey this in
                    the same commit that un-greys sources-card.tsx, never on its own. */}
                <div className="flex flex-col gap-1.5 opacity-50">
                  <FieldLabel
                    badge={<Badge variant="secondary">Coming soon</Badge>}
                    help="News sites this agent watches, alongside X accounts. Not yet available — X accounts are the live source today."
                  >
                    Websites ({websites.length}/{MAX_WEBSITES})
                  </FieldLabel>
                  <ChipsField
                    chipLabel={(site) => site}
                    chips={websites}
                    disabled
                    inputDisabled
                    onBlur={commitWebsiteDraft}
                    onChange={setWebsiteDraft}
                    onKeyDown={onWebsiteKeyDown}
                    onRemove={removeWebsite}
                    onSubmit={commitWebsiteDraft}
                    placeholder="example.com"
                    removeDisabled
                    removeLabel={(site) => `Remove ${site}`}
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
                    // A disabled Input read as a field the reporter had failed to fill. This is
                    // a completed state, so it says so — same box treatment as its neighbours
                    // (uniform-fields rule), but affirmative rather than inert.
                    <div className="flex min-h-9 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30">
                      <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">@{xLinkState.handle}</span>
                      <span className="text-muted-foreground">connected</span>
                    </div>
                  ) : (
                    <Button asChild className="w-fit" variant="outline">
                      {/* persistDraft parks the form in sessionStorage on the way out — this
                          navigation leaves the app entirely and returns as a fresh mount. */}
                      <a
                        href={`/auth/x?returnTo=${encodeURIComponent("/agents/new")}`}
                        onClick={persistDraft}
                      >
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
