"use client";

import { GlobeIcon, InfoIcon, Loader2Icon, UserRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { BandCard } from "@/components/band-card";
import { ChipsField } from "@/components/chips-field";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { splitList } from "@/lib/split-list";
import { MAX_WEBSITES } from "@/lib/websites";
import { MAX_TRACKED_HANDLES as MAX_TRACKED } from "@/lib/x/handle";
import { mergeHandles, splitHandles } from "@/lib/x/handle-input";
import { discoverAndSaveSource } from "../[id]/sources/actions";
import { startExtraction } from "../[id]/voice/actions";
import { createDesk } from "./actions";

const DRAFT_KEY = "oparax:new-agent-draft";

type PersistedDraft = {
  name: string;
  beat: string;
  handles: string[];
  handleDraft: string;
  websites: string[];
  websiteDraft: string;
};

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
  children: ReactNode;
  help?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-text-label">{children}</span>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="More information"
              className="flex size-11 items-center justify-center rounded-md text-text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring desk:size-6"
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

export function CreateDeskForm({
  xLinkState,
  canOverrideHandle,
}: {
  xLinkState: { linked: boolean; handle: string | null };
  canOverrideHandle: boolean;
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
      if (typeof value.websiteDraft === "string") setWebsiteDraft(value.websiteDraft);
      if (Array.isArray(value.websites)) {
        setWebsites(
          value.websites.filter((website): website is string => typeof website === "string"),
        );
      }
    } catch {
      // A malformed session draft safely degrades to the empty form already on screen.
    }
  }, []);

  function persistDraft() {
    const draft: PersistedDraft = { name, beat, handles, handleDraft, websites, websiteDraft };
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // OAuth remains available when private-mode storage is unavailable.
    }
  }

  const hasLinkedAccount = xLinkState.linked && Boolean(xLinkState.handle);
  const formDisabled = isPending || createdDeskId !== null || !hasLinkedAccount;
  const atHandleLimit = handles.length >= MAX_TRACKED;
  const atWebsiteLimit = websites.length >= MAX_WEBSITES;

  function commitHandleDraft() {
    const parts = splitHandles(handleDraft);
    if (parts.length) setHandles((current) => mergeHandles(current, parts));
    setHandleDraft("");
  }

  function onTrackedKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    commitHandleDraft();
  }

  function onTrackedPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const incoming = splitHandles(`${handleDraft} ${text}`);
    if (!incoming.length) return;
    event.preventDefault();
    setHandles((current) => mergeHandles(current, incoming));
    setHandleDraft("");
  }

  function commitWebsiteDraft() {
    const parts = splitList(websiteDraft);
    if (parts.length) setWebsites((current) => mergeWebsites(current, parts));
    setWebsiteDraft("");
  }

  function onWebsiteKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    commitWebsiteDraft();
  }

  function onWebsitePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const incoming = splitList(`${websiteDraft} ${text}`);
    if (!incoming.length) return;
    event.preventDefault();
    setWebsites((current) => mergeWebsites(current, incoming));
    setWebsiteDraft("");
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
    if (!finalHandles.length) {
      setFormError("Add at least one tracked X account.");
      return;
    }
    const finalWebsites = mergeWebsites(websites, splitList(websiteDraft));

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
      for (const site of finalWebsites) {
        try {
          const sourceResult = await discoverAndSaveSource(deskId, site);
          if (sourceResult.ok) continue;
          toast.error(`Couldn't add ${site}`, {
            description: `${sourceResult.error} You can retry from Sources.`,
            action: {
              label: "Open Sources",
              onClick: () => router.push(`/agents/${deskId}/sources`),
            },
          });
        } catch {
          toast.error(`Couldn't add ${site}`, {
            description: "Source onboarding failed. You can retry from Sources.",
            action: {
              label: "Open Sources",
              onClick: () => router.push(`/agents/${deskId}/sources`),
            },
          });
        }
      }

      try {
        await startExtraction(deskId);
      } finally {
        router.replace(`/agents/${deskId}`);
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
    <form className="flex w-full flex-col gap-4 py-4 desk:gap-6 desk:py-6" onSubmit={handleSubmit}>
      <PageHeading>Create Agent</PageHeading>
      <div className="grid items-stretch gap-4 desk:grid-cols-2 desk:gap-6">
        <BandCard className="h-full" icon={<UserRoundIcon />} title="Identity">
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel help="Connect the X account Oparax will use to publish approved drafts.">
                Your X Account
              </FieldLabel>
              {xLinkState.linked && xLinkState.handle ? (
                <div className="flex min-h-11 items-center gap-2 rounded-md border border-input bg-[var(--input-bg)] px-3 text-sm">
                  <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                  <span className="truncate font-medium">@{xLinkState.handle}</span>
                  <span className="text-text-muted">Connected</span>
                </div>
              ) : (
                <Button asChild className="min-h-11 w-fit" variant="outline">
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
              <FieldLabel help="Shown in the agent switcher and throughout the workspace.">
                Agent Name
              </FieldLabel>
              <Input
                className="h-11 rounded-md bg-[var(--input-bg)] desk:h-9"
                disabled={formDisabled}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Arsenal Watch"
                value={name}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="Define what counts as relevant and what this agent should ignore.">
                Beat
              </FieldLabel>
              <Textarea
                className="min-h-44 flex-1 resize-none rounded-md bg-[var(--input-bg)] text-base desk:text-sm"
                disabled={formDisabled}
                onChange={(event) => setBeat(event.target.value)}
                placeholder="Explain the exact news this agent should track and what it should skip — be as detailed as possible. e.g. Arsenal team news, transfers, and match reaction; skip gaming and personal posts."
                value={beat}
              />
            </div>

            {canOverrideHandle && xLinkState.linked ? (
              <div className="flex flex-col gap-1.5">
                <FieldLabel
                  badge={
                    <Badge className="rounded-badge" variant="secondary">
                      Owner only
                    </Badge>
                  }
                  help="Whose voice this agent writes in. Posts still publish from your connected account."
                >
                  Extract Voice From
                </FieldLabel>
                <Input
                  className="h-11 rounded-md bg-[var(--input-bg)] desk:h-9"
                  disabled={isPending || createdDeskId !== null}
                  onChange={(event) => setExtractFrom(event.target.value)}
                  placeholder="handle without the @"
                  value={extractFrom}
                />
              </div>
            ) : null}
          </div>
        </BandCard>

        <BandCard className="h-full" icon={<GlobeIcon />} title="Sources">
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="The X accounts this agent watches. Paste one or several handles.">
                Tracked X Accounts ({handles.length}/{MAX_TRACKED})
              </FieldLabel>
              <ChipsField
                chipClassName="rounded-md bg-[var(--chip-x-bg)]"
                chipLabel={(handle) => `@${handle}`}
                chips={handles}
                className="min-h-36 flex-1 rounded-md border-dashed bg-[var(--input-bg)]"
                hideInput={atHandleLimit}
                inputDisabled={formDisabled || atHandleLimit}
                onBlur={commitHandleDraft}
                onChange={setHandleDraft}
                onKeyDown={onTrackedKeyDown}
                onPaste={onTrackedPaste}
                onRemove={(handle) =>
                  setHandles((current) => current.filter((value) => value !== handle))
                }
                onSubmit={commitHandleDraft}
                placeholder="Paste handles — @ optional"
                removeDisabled={formDisabled}
                removeLabel={(handle) => `Remove @${handle}`}
                value={handleDraft}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="Sites are onboarded one at a time after you create the agent.">
                Websites ({websites.length}/{MAX_WEBSITES})
              </FieldLabel>
              <ChipsField
                chipClassName="rounded-md bg-[var(--chip-web-bg)]"
                chipLabel={(site) => site}
                chips={websites}
                className="min-h-36 flex-1 rounded-md border-dashed bg-[var(--input-bg)]"
                hideInput={atWebsiteLimit}
                inputDisabled={formDisabled || atWebsiteLimit}
                onBlur={commitWebsiteDraft}
                onChange={setWebsiteDraft}
                onKeyDown={onWebsiteKeyDown}
                onPaste={onWebsitePaste}
                onRemove={(site) =>
                  setWebsites((current) => current.filter((value) => value !== site))
                }
                onSubmit={commitWebsiteDraft}
                placeholder="Paste websites — example.com"
                removeDisabled={formDisabled}
                removeLabel={(site) => `Remove ${site}`}
                value={websiteDraft}
              />
            </div>
          </div>
        </BandCard>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button className="min-h-11 w-full" disabled={!canSubmit} size="lg" type="submit">
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isPending ? "Creating agent…" : "Create Agent"}
        </Button>
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
