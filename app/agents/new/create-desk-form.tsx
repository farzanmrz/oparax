"use client";

// app/agents/new/create-desk-form.tsx
//
// The create-desk screen: a full-width form in three peer columns — Basics, Sources, Voice —
// closed by a centred commit bar. No close button and no "what happens next" panel: with zero
// agents `/agents` can only bounce back here, and the post-create story is told by the live
// extraction view rather than predicted in advance. Tracked accounts accept
// comma/space/newline paste with or without a leading @, capped at MAX_TRACKED_HANDLES; the
// server (createDesk) re-validates + re-caps. Identity comes from a linked X account (Connect X)
// rather than a typed handle — `xLinkState` is fetched server-side by page.tsx and handed down
// as a prop, since a client component can't read the reporter's own OAuth link state without a
// round trip. Once createDesk succeeds this same screen swaps to a live extraction view
// (extraction-progress.tsx) instead of redirecting straight into the desk — the old
// submit-and-redirect flow is gone.

import { CheckIcon, InfoIcon, Loader2Icon } from "lucide-react";
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

/**
 * A column header. The hairline rule beneath it is the form's one structural device and it
 * encodes something true: these three sit at the same level, so three matching rules read as
 * three peer columns. The page title deliberately has NO rule — it is not a peer of anything,
 * and giving it the same treatment was what made the two levels indistinguishable.
 *
 * `note` is the plain-language answer to "what goes in this column", set inline and quiet so the
 * header still reads as one line (no stacked kicker — see .claude/rules/components.md).
 */
function SectionHeader({
  children,
  note,
}: {
  readonly children: ReactNode;
  readonly note: string;
}) {
  return (
    <h2 className="flex flex-wrap items-baseline gap-x-2 border-border border-b pb-2 text-sm">
      <span className="font-medium text-foreground">{children}</span>
      <span className="font-normal text-muted-foreground text-xs">{note}</span>
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Three deliberate absences here, each of which was actively misleading:
          - No brand mark: the site header renders the Oparax logo 60px above this.
          - No rule beneath: the rule is the SECTION device (three peer columns). Repeating it
            here flattened the page title into a fourth sibling of Basics/Sources/Voice.
          - No close button: with zero agents `/agents` has nowhere to send you but back to
            this page, so it looked like a broken reload. The site header's agent switcher is
            already the way out (.claude/rules/app.md's way-back guarantee), so this was a
            second, worse exit for the same job.
          The title carries the level instead: two type steps above a section header, with air
          under it rather than a line. */}
      <header className="shrink-0 pt-6 pb-8">
        <h1 className="truncate font-semibold text-2xl tracking-tight">
          {createdDeskId ? "Agent created" : "Create agent"}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-10">
        {/* Two panels, not two pages. Submitting used to REPLACE the form with the progress view,
            which threw away the only record of what had just been asked for at the exact moment
            the reporter most wanted to check it ("did I paste the right handles?") — and left the
            step list alone on a 2000px-wide page, stranded against the left edge.

            The form's column is a fixed measure in BOTH states, so it does not move when the
            right panel appears; the panel simply arrives beside it. The right cell is empty
            before submit rather than holding a greyed placeholder — an unspecified stage gets no
            chrome (.claude/rules/components.md), and an empty grid cell draws nothing. */}
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
          <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
            {/* Linear again — Basics, then Sources, then Voice, top to bottom. The three-column
                layout existed to use a full-bleed page; now the page's other half streams the
                extraction, so the form gets one honest measure and reads in the order you fill
                it. `fieldset disabled` freezes it once the desk exists: past that point it is a
                record of what was asked for, not something still editable, and every shadcn
                control inside inherits the disabled state natively. */}
            <fieldset
              className="flex flex-col gap-8 disabled:opacity-70"
              disabled={createdDeskId !== null}
            >
              <div className="flex flex-col gap-4">
                <SectionHeader note="what this agent covers">Basics</SectionHeader>

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
                <SectionHeader note="where the news comes from">Sources</SectionHeader>

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
                    // The primary input of the whole form — sized to hold a few rows of chips up
                    // front so the box stops jumping taller with every handle added.
                    className="min-h-28"
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
                <SectionHeader note="how drafts get written">Voice</SectionHeader>

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
              </div>
            </fieldset>

            {/* The commit bar disappears once the desk exists — the action is done, and the panel
                beside it now carries the state. Left-aligned rather than centred: it sits under a
                single column now, so centring would float it away from the fields it commits. */}
            {createdDeskId ? null : (
              <div className="flex flex-col items-start gap-3 border-border border-t pt-8">
                {formError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {formError}
                  </p>
                ) : null}
                <Button
                  className="w-full sm:w-auto sm:min-w-64"
                  disabled={!canSubmit}
                  size="lg"
                  type="submit"
                >
                  {isPending ? <Loader2Icon className="animate-spin" /> : null}
                  Create agent
                </Button>
              </div>
            )}
          </form>

          {/* Sticky so the steps stay in view while a long form scrolls past them. */}
          {createdDeskId ? (
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <ExtractionProgress deskId={createdDeskId} />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
