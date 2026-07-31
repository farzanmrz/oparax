"use client";

// kit mapping:
// Full-page viewport and shared chrome -> PageFrame.
// Text entry -> Input, Textarea, and the settled ChipsField.
// Status and availability labels -> Badge.
// OAuth and commit actions -> Button with lucide-react icons.
// Internal grouping rules -> Separator.
// Confirmed X identity -> bespoke (proposed pattern: Connected identity row).
// One bordered field group with internal divisions -> bespoke (proposed pattern: Divided brief).

import { AlertCircleIcon, CheckIcon, LinkIcon, Loader2Icon } from "lucide-react";
import type { ClipboardEvent, JSX, ReactNode } from "react";
import { useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Viewport = "mobile" | "web";
type FormMode = "unlinked" | "empty" | "filled" | "submitting" | "error";

const FILLED_HANDLES = ["David_Ornstein", "FabrizioRomano", "gunnerblog", "afcstuff"];

function FieldLabel({
  badge,
  children,
  htmlFor,
}: {
  readonly badge?: ReactNode;
  readonly children: ReactNode;
  readonly htmlFor?: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="text-sm font-medium" htmlFor={htmlFor}>
        {children}
      </Label>
      {badge}
    </div>
  );
}

function CreateForm({
  mode,
  viewport,
}: {
  readonly mode: FormMode;
  readonly viewport: Viewport;
}): JSX.Element {
  const linked = mode !== "unlinked";
  const filled = mode === "filled" || mode === "submitting" || mode === "error";
  const submitting = mode === "submitting";
  const [name, setName] = useState(filled ? "Arsenal watch" : "");
  const [beat, setBeat] = useState(
    filled
      ? "Arsenal first-team news, credible transfer reporting, injuries, and match reaction. Skip gaming and personal posts."
      : "",
  );
  const [handles, setHandles] = useState<string[]>(filled ? FILLED_HANDLES : []);
  const [handleDraft, setHandleDraft] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [extractFrom, setExtractFrom] = useState(linked ? "reshadrahman" : "");

  function addHandles(raw: string): void {
    const incoming = raw
      .split(/[\s,]+/)
      .map((value) => value.trim().replace(/^@/, ""))
      .filter(Boolean);
    if (incoming.length > 0) {
      setHandles((current) => Array.from(new Set([...current, ...incoming])).slice(0, 25));
    }
    setHandleDraft("");
  }

  function commitHandle(): void {
    addHandles(handleDraft);
  }

  function pasteHandles(event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData("text");
    if (!/[\s,]/.test(pasted)) return;
    event.preventDefault();
    addHandles(pasted);
  }

  const canSubmit = linked && beat.trim().length > 0 && !submitting;
  const sectionPadding = viewport === "mobile" ? "p-4" : "p-6";

  return (
    <div className={cn("py-7", viewport === "web" && "py-10")}>
      <h1 className="text-2xl font-semibold tracking-tight">Create agent</h1>

      <form
        className={cn("mt-7", viewport === "web" && "max-w-3xl")}
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset className="space-y-6" disabled={submitting}>
          <section className="space-y-2.5">
            <FieldLabel>Your X account</FieldLabel>
            {linked ? (
              <div className="flex min-h-11 max-w-md items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30">
                <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="truncate font-medium">@reshadrahman</span>
                <span className="text-muted-foreground">connected</span>
              </div>
            ) : (
              <>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Oparax reads your recent posts to learn how you write. Connect the account drafts
                  will be written for.
                </p>
                <Button className="min-h-11" type="button" variant="outline">
                  <LinkIcon aria-hidden="true" />
                  Connect X
                </Button>
              </>
            )}
          </section>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <section className={cn("space-y-2", sectionPadding)}>
              <FieldLabel htmlFor={`${mode}-beat`}>Beat</FieldLabel>
              <Textarea
                aria-required="true"
                className={cn(
                  "resize-y text-base",
                  viewport === "mobile" ? "min-h-32" : "min-h-36",
                )}
                id={`${mode}-beat`}
                onChange={(event) => setBeat(event.target.value)}
                placeholder="Arsenal first-team news, transfers, injuries, and match reaction. Skip gaming and personal posts."
                required
                value={beat}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Be specific about what counts as a story and what should stay out.
              </p>
            </section>

            <Separator />

            <section className={cn("space-y-2", sectionPadding)}>
              <FieldLabel>Tracked X accounts ({handles.length}/25)</FieldLabel>
              <ChipsField
                chipLabel={(handle) => `@${handle}`}
                chips={handles}
                className={viewport === "mobile" ? "min-h-24" : "min-h-28"}
                inputDisabled={handles.length >= 25 || submitting}
                onBlur={commitHandle}
                onChange={setHandleDraft}
                onPaste={pasteHandles}
                onRemove={(handle) =>
                  setHandles((current) => current.filter((item) => item !== handle))
                }
                onSubmit={commitHandle}
                placeholder="Paste handles — commas, spaces, and line breaks work"
                removeDisabled={submitting}
                removeLabel={(handle) => `Remove @${handle}`}
                value={handleDraft}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                These are the sources the agent watches for stories on your beat.
              </p>
            </section>

            <Separator />

            <section className={cn("space-y-5", sectionPadding)}>
              <div className="space-y-2">
                <FieldLabel htmlFor={`${mode}-name`}>Agent name</FieldLabel>
                <Input
                  className="min-h-11"
                  id={`${mode}-name`}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Optional — defaults to a short name from your beat"
                  value={name}
                />
              </div>

              <div className={cn("space-y-2", !linked && "opacity-50")}>
                <FieldLabel
                  badge={<Badge variant="secondary">Owner only</Badge>}
                  htmlFor={`${mode}-extract-from`}
                >
                  Extract voice from
                </FieldLabel>
                <Input
                  className="min-h-11"
                  disabled={!linked}
                  id={`${mode}-extract-from`}
                  onChange={(event) => setExtractFrom(event.target.value)}
                  placeholder={linked ? "Handle without the @" : "Connect X first"}
                  value={extractFrom}
                />
              </div>
            </section>

            <Separator />

            <section className={cn("space-y-2 opacity-50", sectionPadding)}>
              <FieldLabel badge={<Badge variant="secondary">Coming soon</Badge>}>
                Websites
              </FieldLabel>
              <ChipsField
                chipLabel={(website) => website}
                chips={[]}
                disabled
                inputDisabled
                onChange={setWebsiteDraft}
                onRemove={() => undefined}
                onSubmit={() => setWebsiteDraft("")}
                placeholder="example.com"
                removeDisabled
                removeLabel={(website) => `Remove ${website}`}
                value={websiteDraft}
              />
            </section>
          </div>
        </fieldset>

        {mode === "error" ? (
          <div className="mt-4 flex items-start gap-2 text-destructive text-sm" role="alert">
            <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Couldn’t create the agent. Your entries are still here — try again.</span>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-6 flex gap-4",
            viewport === "mobile" ? "flex-col" : "items-center justify-between",
          )}
        >
          <Button
            className={cn("min-h-11", viewport === "mobile" && "w-full")}
            disabled={!canSubmit}
            size="lg"
            type="submit"
          >
            {submitting ? <Loader2Icon aria-hidden="true" className="animate-spin" /> : null}
            Create agent
          </Button>
          <p className="max-w-md text-xs leading-5 text-muted-foreground">
            {submitting
              ? "Creating the agent and opening your Feed. Voice learning starts there."
              : "Next, your Feed opens while the agent learns your voice. You can safely leave and come back."}
          </p>
        </div>
      </form>
    </div>
  );
}

const STATES: ReadonlyArray<{ mode: FormMode; note: string }> = [
  {
    mode: "unlinked",
    note: "(a) X not linked — standalone connection gate; submit blocked",
  },
  {
    mode: "empty",
    note: "(b) linked, form empty — confirmed identity contracts into a row",
  },
  {
    mode: "filled",
    note: "(c) filled and ready — several tracked-handle chips; submit enabled",
  },
  {
    mode: "submitting",
    note: "(d) submitting — controls freeze; Feed handoff stays legible",
  },
  {
    mode: "error",
    note: "(e) server error — inline recovery copy; entered values remain",
  },
];

export default function CreateAgentDirection({
  viewport,
}: {
  readonly viewport: Viewport;
}): JSX.Element {
  return (
    <div className="space-y-12 py-8">
      {STATES.map((state) => (
        <PageFrame chrome="deskless" key={state.mode} note={state.note} viewport={viewport}>
          <CreateForm mode={state.mode} viewport={viewport} />
        </PageFrame>
      ))}
    </div>
  );
}
