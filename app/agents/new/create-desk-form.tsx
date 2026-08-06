"use client";

import { CheckCircle2Icon, InfoIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_WEBSITES } from "@/lib/websites";
import { MAX_TRACKED_HANDLES as MAX_TRACKED } from "@/lib/x/handle";
import { mergeHandles, splitHandles } from "@/lib/x/handle-input";
import { startExtraction } from "../[id]/voice/actions";
import { createDesk, startWebsiteOnboardingAtCreation } from "./actions";

const DRAFT_KEY = "oparax:new-agent-draft";

type PersistedDraft = {
  name: string;
  beat: string;
  handles: string[];
  handleDraft: string;
};

function splitWebsites(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((site) => site.trim())
    .filter(Boolean);
}

function mergeWebsites(existing: readonly string[], incoming: readonly string[]): string[] {
  const next = [...existing];
  for (const site of incoming) {
    if (next.length >= MAX_WEBSITES) break;
    if (!next.some((value) => value.toLowerCase() === site.toLowerCase())) next.push(site);
  }
  return next;
}

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
      <span className="font-medium text-sm">{children}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="More information"
              className="text-muted-foreground transition-colors hover:text-foreground"
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

function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <div className="border-border border-b pb-3">
      <h2 className="font-semibold text-base">{children}</h2>
    </div>
  );
}

export function CreateDeskForm({
  xLinkState,
  canOverrideHandle,
}: {
  readonly xLinkState: { linked: boolean; handle: string | null };
  readonly canOverrideHandle: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [beat, setBeat] = useState("");
  const [handles, setHandles] = useState<string[]>([]);
  const [handleDraft, setHandleDraft] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdDeskId, setCreatedDeskId] = useState<string | null>(null);
  const [extractFrom, setExtractFrom] = useState(xLinkState.handle ?? "");

  useEffect(() => {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(DRAFT_KEY);
    try {
      const draft: unknown = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return;
      const value = draft as Partial<Record<keyof PersistedDraft, unknown>>;
      if (typeof value.name === "string") setName(value.name);
      if (typeof value.beat === "string") setBeat(value.beat);
      if (typeof value.handleDraft === "string") setHandleDraft(value.handleDraft);
      if (Array.isArray(value.handles)) {
        setHandles(value.handles.filter((handle): handle is string => typeof handle === "string"));
      }
    } catch {
      // A malformed session draft safely degrades to the empty form already on screen.
    }
  }, []);

  function persistDraft() {
    const draft: PersistedDraft = { name, beat, handles, handleDraft };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // OAuth must remain available when private-mode storage is unavailable.
    }
  }

  const hasLinkedAccount = xLinkState.linked && Boolean(xLinkState.handle);
  const formDisabled = isPending || createdDeskId !== null || !hasLinkedAccount;
  const atLimit = handles.length >= MAX_TRACKED;

  function commitDraft() {
    const parts = splitHandles(handleDraft);
    if (parts.length > 0) setHandles((current) => mergeHandles(current, parts));
    setHandleDraft("");
  }

  function onTrackedKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  }

  function onTrackedPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (/[\s,]/.test(text)) {
      event.preventDefault();
      setHandles((current) => mergeHandles(current, splitHandles(`${handleDraft} ${text}`)));
      setHandleDraft("");
    }
  }

  function commitWebsiteDraft() {
    const parts = splitWebsites(websiteDraft);
    if (parts.length > 0) setWebsites((current) => mergeWebsites(current, parts));
    setWebsiteDraft("");
  }

  function onWebsiteKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitWebsiteDraft();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!hasLinkedAccount) {
      setFormError("Connect your X account before creating an agent.");
      return;
    }
    if (!name.trim()) {
      setFormError("Name this agent.");
      return;
    }
    if (!beat.trim()) {
      setFormError("Describe the beat this agent should watch.");
      return;
    }

    const finalHandles = mergeHandles(handles, splitHandles(handleDraft));
    if (finalHandles.length === 0) {
      setFormError("Add at least one tracked X account.");
      return;
    }
    const finalWebsites = mergeWebsites(websites, splitWebsites(websiteDraft));
    startTransition(async () => {
      const result = await createDesk({
        name,
        beat,
        trackedHandles: finalHandles,
        ...(canOverrideHandle && extractFrom.trim() && extractFrom.trim() !== xLinkState.handle
          ? { extractFromHandle: extractFrom }
          : {}),
      });
      if (result.error || !result.id) {
        setFormError(result.error ?? "Could not create your agent. Please try again.");
        return;
      }

      const deskId = result.id;
      setCreatedDeskId(deskId);
      // Resolve concurrently, not sequentially — N sites should not wait on each other (#106).
      // Next.js serializes server actions through the router's action queue rather than truly
      // running them in parallel, so every call must be awaited (via allSettled, not a bare
      // Promise.all) to guarantee it's actually issued before the navigation below unmounts
      // this component. Not waiting for onboarding itself to finish — that stays async, with
      // the new desk's Setup page picking up from here via polling.
      await Promise.allSettled(
        finalWebsites.map((url) =>
          startWebsiteOnboardingAtCreation(deskId, url).catch((error: unknown) => {
            console.error("createDesk: startWebsiteOnboardingAtCreation failed", error);
          }),
        ),
      );

      try {
        await startExtraction(deskId);
      } finally {
        // A created agent is recoverable from Feed/Voice even if the extraction start itself
        // returns a failure. Replacing prevents Back from reopening a committed form.
        router.replace(`/agents/${deskId}/setup`);
      }
    });
  }

  const canSubmit =
    name.trim().length > 0 &&
    beat.trim().length > 0 &&
    mergeHandles(handles, splitHandles(handleDraft)).length > 0 &&
    hasLinkedAccount &&
    !isPending &&
    !createdDeskId;
  return (
    <form className="flex w-full flex-col gap-6 py-5 md:gap-7 md:py-7" onSubmit={handleSubmit}>
      <h1 className="font-semibold text-2xl tracking-tight">Create agent</h1>

      <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className="h-full shadow-none">
          <CardContent className="flex h-full flex-col gap-5">
            <SectionTitle>Identity</SectionTitle>

            <div className="flex flex-col gap-1.5">
              <FieldLabel help="Connect the X account Oparax will use to learn your voice and publish approved drafts.">
                Your X account
              </FieldLabel>
              {xLinkState.linked && xLinkState.handle ? (
                <div className="flex min-h-10 items-center gap-2 rounded-lg border border-input bg-input/20 px-3 text-sm">
                  <CheckCircle2Icon aria-hidden="true" className="size-4 shrink-0 text-success" />
                  <span className="truncate font-medium">@{xLinkState.handle}</span>
                  <span className="text-muted-foreground">Connected</span>
                </div>
              ) : (
                <Button asChild className="w-fit" variant="outline">
                  <a
                    href={`/auth/x?returnTo=${encodeURIComponent("/agents/new")}`}
                    onClick={persistDraft}
                  >
                    Connect X
                  </a>
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel help="Shown in the agent picker and throughout the workspace.">
                Agent name
              </FieldLabel>
              <Input
                disabled={formDisabled}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Arsenal watch"
                value={name}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="Define what counts as relevant and what this agent should ignore.">
                Beat
              </FieldLabel>
              <Textarea
                className="min-h-36 flex-1 resize-none"
                disabled={formDisabled}
                onChange={(event) => setBeat(event.target.value)}
                placeholder="e.g. Arsenal team news, transfers and match reaction. Skip gaming and personal posts."
                value={beat}
              />
            </div>

            {canOverrideHandle && xLinkState.linked ? (
              <div className="flex flex-col gap-1.5">
                <FieldLabel
                  badge={<Badge variant="secondary">Owner only</Badge>}
                  help="Whose voice this agent writes in. Defaults to your connected account. Posts still publish from your connected account either way."
                >
                  Extract voice from
                </FieldLabel>
                <Input
                  disabled={isPending || createdDeskId !== null}
                  onChange={(event) => setExtractFrom(event.target.value)}
                  placeholder="handle without the @"
                  value={extractFrom}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full shadow-none">
          <CardContent className="flex h-full flex-col gap-5">
            <SectionTitle>Sources</SectionTitle>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="The X accounts this agent watches. Paste several handles at once.">
                Tracked X accounts ({handles.length}/{MAX_TRACKED})
              </FieldLabel>
              <ChipsField
                chipLabel={(handle) => `@${handle}`}
                chips={handles}
                className="min-h-36 flex-1"
                inputDisabled={formDisabled || atLimit}
                onBlur={commitDraft}
                onChange={setHandleDraft}
                onKeyDown={onTrackedKeyDown}
                onPaste={onTrackedPaste}
                onRemove={(handle) =>
                  setHandles((current) => current.filter((value) => value !== handle))
                }
                onSubmit={commitDraft}
                placeholder={
                  atLimit
                    ? `Up to ${MAX_TRACKED} accounts`
                    : "Paste handles — comma-separated, @ optional"
                }
                removeDisabled={formDisabled}
                removeLabel={(handle) => `Remove @${handle}`}
                value={handleDraft}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel help="Websites are onboarded automatically once your desk is created — each appears as a pending chip until it's ready.">
                Websites ({websites.length}/{MAX_WEBSITES})
              </FieldLabel>
              <ChipsField
                chipLabel={(site) => site}
                chips={websites}
                inputDisabled={formDisabled}
                onBlur={commitWebsiteDraft}
                onChange={setWebsiteDraft}
                onKeyDown={onWebsiteKeyDown}
                onRemove={(site) =>
                  setWebsites((current) => current.filter((value) => value !== site))
                }
                onSubmit={commitWebsiteDraft}
                placeholder="example.com"
                removeDisabled={formDisabled}
                removeLabel={(site) => `Remove ${site}`}
                value={websiteDraft}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button className="w-full" disabled={!canSubmit} size="lg" type="submit">
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isPending ? "Creating agent…" : "Create agent"}
        </Button>
        {formError ? (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
