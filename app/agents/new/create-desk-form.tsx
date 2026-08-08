"use client";

import { GlobeIcon, Loader2Icon, UserRoundIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { splitList } from "@/lib/split-list";
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

/** Label plus always-visible helper text (owner decision: the create form is the deliberate
 *  exception to the no-eyebrow-helper rule — users were struggling here, especially on
 *  mobile where the old info-tooltip hover was undiscoverable; see DESIGN.md). */
function FieldLabel({
  children,
  help,
  badge,
  htmlFor,
}: {
  children: ReactNode;
  help?: string;
  badge?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-text-label" htmlFor={htmlFor}>
          {children}
        </label>
        {badge}
      </div>
      {help ? <p className="text-xs leading-relaxed text-text-muted">{help}</p> : null}
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
  // Admin sessions default the voice-override field to the standing test reporter; everyone
  // else never sees the field and their connected handle flows through it untouched.
  const [extractFrom, setExtractFrom] = useState(
    canOverrideHandle ? "ReshadRahman" : (xLinkState.handle ?? ""),
  );

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
    // Belt to the Input's maxLength braces: pasted or prefilled text can bypass the attribute.
    if (name.trim().length > 30) {
      setFormError("Agent name must be 30 characters or fewer.");
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
      // Resolve concurrently, not sequentially — N sites should not wait on each other (#106).
      // Next.js serializes server actions through the router's action queue rather than truly
      // running them in parallel, so every call must be awaited (via allSettled, not a bare
      // Promise.all) to guarantee it's actually issued before the navigation below unmounts
      // this component. Not waiting for onboarding itself to finish — that stays async, with
      // the new desk's Sources page picking up from here via polling.
      const onboardingResults = await Promise.all(
        finalWebsites.map(async (url) => {
          try {
            return { url, result: await startWebsiteOnboardingAtCreation(deskId, url) };
          } catch (error) {
            console.error("createDesk: startWebsiteOnboardingAtCreation failed", error);
            return { url, result: { ok: false, error: "Couldn't add that website." } };
          }
        }),
      );
      for (const { url, result: onboarding } of onboardingResults) {
        if (!onboarding.ok) {
          toast.error(`Couldn't add ${url}`, {
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
        // A created agent is recoverable from Feed/Voice even if the extraction start itself
        // returns a failure. Replacing prevents Back from reopening a committed form. Sources
        // is the landing page so creation-time onboarding's pending chips are visible.
        router.replace(`/agents/${deskId}/sources`);
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
    <form
      className="flex w-full flex-col gap-[var(--page-rhythm-mobile)] py-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)] desk:py-[var(--page-rhythm-web)]"
      onSubmit={handleSubmit}
    >
      <PageHeading>Create Agent</PageHeading>
      <div className="grid items-stretch gap-[var(--page-rhythm-mobile)] desk:grid-cols-2 desk:gap-[var(--page-rhythm-web)]">
        <BandCard className="h-full" icon={<UserRoundIcon />} title="Identity">
          <div className="flex h-full flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel help="Oparax needs your X account connected so it can learn your writing style from your posts and post approved drafts on your behalf.">
                Your X Account
              </FieldLabel>
              {xLinkState.linked && xLinkState.handle ? (
                <div className="flex min-h-11 items-center gap-2 rounded-md border border-input bg-[var(--input-bg)] px-3 text-sm">
                  <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                  <span className="truncate font-medium">@{xLinkState.handle}</span>
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
              <FieldLabel
                htmlFor="agent-name"
                help="What you'll call this agent — shown in the agent switcher and around the workspace. Up to 30 characters."
              >
                Agent Name
              </FieldLabel>
              <Input
                id="agent-name"
                className="h-11 rounded-md bg-[var(--input-bg)] desk:h-9"
                disabled={formDisabled}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Barça Bulletin"
                value={name}
              />
              {name.trim().length > 30 ? (
                <p className="text-sm leading-relaxed text-destructive" role="alert">
                  Agent name must be 30 characters or fewer.
                </p>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel
                htmlFor="agent-beat"
                help="Explain the exact news this agent should track and what it should skip — be as detailed as possible."
              >
                Beat
              </FieldLabel>
              <Textarea
                id="agent-beat"
                className="min-h-44 flex-1 resize-none rounded-md bg-[var(--input-bg)] text-base desk:text-sm"
                disabled={formDisabled}
                onChange={(event) => setBeat(event.target.value)}
                placeholder="e.g. FC Barcelona first-team news: transfers in and out, contract talks, injuries and recoveries, matchday lineups and results, and manager or board decisions. Rival clubs only when a story directly affects Barça. Skip basketball and other sections, women's and academy teams, and fan or gaming content."
                value={beat}
              />
            </div>

            {canOverrideHandle && xLinkState.linked ? (
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="extract-voice-from">Extract Voice From</FieldLabel>
                <Input
                  id="extract-voice-from"
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
              <FieldLabel help="Type or paste usernames — separate several with spaces, commas, or new lines. This agent watches these accounts for news.">
                X Accounts ({handles.length}/{MAX_TRACKED})
              </FieldLabel>
              <ChipsField
                chipClassName="rounded-md bg-[var(--chip-x-bg)]"
                chipLabel={(handle) => `@${handle}`}
                chips={handles}
                className="min-h-36 flex-1 rounded-md border-dashed bg-[var(--input-bg)]"
                hideInput={atHandleLimit}
                inputDisabled={formDisabled || atHandleLimit}
                inputAriaLabel="X accounts"
                onBlur={commitHandleDraft}
                onChange={setHandleDraft}
                onKeyDown={onTrackedKeyDown}
                onPaste={onTrackedPaste}
                onRemove={(handle) =>
                  setHandles((current) => current.filter((value) => value !== handle))
                }
                onSubmit={commitHandleDraft}
                placeholder="e.g. FabrizioRomano, DavidOrnstein, Glongari, talkfcb_, fcbarcelona, BarcaUniversal, BarcaTimes, fcbarcelonaes, Barca_Buzz, TotalBarca, BarcaWorld_, laligaen, MundoDeportivo, sport, managingbarca, barcacentre, Gerardanyol, siegersayss, AlbertRoge, footmercato"
                removeDisabled={formDisabled}
                removeLabel={(handle) => `Remove @${handle}`}
                value={handleDraft}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <FieldLabel help="Type or paste site addresses — a homepage, a section, or any article link works. This agent watches these sites for news; setup runs automatically after the agent is created.">
                News Websites ({websites.length}/{MAX_WEBSITES})
              </FieldLabel>
              <ChipsField
                chipClassName="rounded-md bg-[var(--chip-web-bg)]"
                chipLabel={(site) => site}
                chips={websites}
                className="min-h-36 flex-1 rounded-md border-dashed bg-[var(--input-bg)]"
                hideInput={atWebsiteLimit}
                inputDisabled={formDisabled || atWebsiteLimit}
                inputAriaLabel="News websites"
                inputMode="url"
                onBlur={commitWebsiteDraft}
                onChange={setWebsiteDraft}
                onKeyDown={onWebsiteKeyDown}
                onPaste={onWebsitePaste}
                onRemove={(site) =>
                  setWebsites((current) => current.filter((value) => value !== site))
                }
                onSubmit={commitWebsiteDraft}
                placeholder="e.g. mundodeportivo.com, theathletic.com/football/club/barcelona/"
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
