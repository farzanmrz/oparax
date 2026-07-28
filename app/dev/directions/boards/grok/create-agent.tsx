// kit mapping:
// page frame -> PageFrame (@/app/dev/directions/chrome) chrome="deskless"
// page title -> h1 one line only (no subline, no hairline)
// mobile form -> one Card + Separator dividers -> bespoke (named pattern: divided-form-card)
// web form -> 2–3 group Cards stacked one measure -> bespoke (named pattern: measure-group-stack)
// field labels -> bespoke FieldLabel (sentence case, optional help + badge)
// Agent name / Beat / Extract from -> Input, Textarea (ui)
// Tracked X + Websites -> ChipsField (settled)
// Coming soon / Owner only -> Badge
// Connect X -> Button outline standalone -> bespoke (named pattern: standalone-connect-gate)
// connected -> CheckIcon + input-look row (allowed completed state only)
// submit -> Button + Loader2Icon
// inline error -> role=alert text-destructive
// handoff line -> muted xs under CTA
// annotations -> PageFrame note only

"use client";

import { CheckIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_TRACKED = 25;
const MAX_WEBSITES = 10;

type FormFixture = {
  linked: boolean;
  handle: string | null;
  name: string;
  beat: string;
  handles: string[];
  handleDraft: string;
  websites: string[];
  websiteDraft: string;
  extractFrom: string;
  showOwnerOverride: boolean;
  pending: boolean;
  error: string | null;
};

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
      <span className="font-medium text-foreground text-sm">{children}</span>
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

function XAccountControl({ fixture }: { readonly fixture: FormFixture }) {
  if (fixture.linked && fixture.handle) {
    return (
      <div className="flex min-h-9 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm dark:bg-input/30">
        <CheckIcon aria-hidden className="size-4 shrink-0 text-primary" />
        <span className="truncate font-medium">@{fixture.handle}</span>
        <span className="text-muted-foreground">connected</span>
      </div>
    );
  }
  // standalone-connect-gate — never boxed in an input-shaped border
  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline">
        Connect X
      </Button>
      <p className="text-muted-foreground text-xs text-pretty">
        Required to create. Your fields stay after the OAuth round trip.
      </p>
    </div>
  );
}

function FieldBlock({
  label,
  help,
  badge,
  children,
  dimmed,
}: {
  readonly label: string;
  readonly help?: string;
  readonly badge?: ReactNode;
  readonly children: ReactNode;
  readonly dimmed?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", dimmed && "opacity-50")}>
      <FieldLabel badge={badge} help={help}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

function CreateAgentForm({
  fixture,
  viewport,
}: {
  readonly fixture: FormFixture;
  readonly viewport: "mobile" | "web";
}) {
  const [name, setName] = useState(fixture.name);
  const [beat, setBeat] = useState(fixture.beat);
  const [handles, setHandles] = useState(fixture.handles);
  const [handleDraft, setHandleDraft] = useState(fixture.handleDraft);
  const [websites, setWebsites] = useState(fixture.websites);
  const [websiteDraft, setWebsiteDraft] = useState(fixture.websiteDraft);
  const [extractFrom, setExtractFrom] = useState(fixture.extractFrom);

  const atLimit = handles.length >= MAX_TRACKED;
  const canSubmit = fixture.linked && beat.trim().length > 0 && !fixture.pending;

  function commitHandles() {
    const parts = handleDraft
      .split(/[\s,]+/)
      .map((s) => s.replace(/^@/, "").trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setHandles((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (next.length >= MAX_TRACKED) break;
        if (!next.some((h) => h.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
    setHandleDraft("");
  }

  const nameField = (
    <FieldBlock
      help="Shown in the agent switcher. Optional — defaults from your beat."
      label="Agent name"
    >
      <Input
        disabled={fixture.pending}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Arsenal watch"
        value={name}
      />
    </FieldBlock>
  );

  const beatField = (
    <FieldBlock
      help="The topic this agent watches. Be specific — it steers what counts as a story."
      label="Beat"
    >
      <Textarea
        className={cn(viewport === "mobile" && "min-h-28 text-base")}
        disabled={fixture.pending}
        onChange={(e) => setBeat(e.target.value)}
        placeholder="e.g. Arsenal team news, transfers, match reaction. Skip personal content."
        rows={viewport === "mobile" ? 4 : 5}
        value={beat}
      />
    </FieldBlock>
  );

  const handlesField = (
    <FieldBlock
      help="Paste several at once — comma- or space-separated, @ optional."
      label={`Tracked X accounts (${handles.length}/${MAX_TRACKED})`}
    >
      <ChipsField
        chipLabel={(h) => `@${h}`}
        chips={handles}
        className="min-h-24"
        inputDisabled={atLimit || fixture.pending}
        onBlur={commitHandles}
        onChange={setHandleDraft}
        onKeyDown={(e) => {
          if (e.key === ",") {
            e.preventDefault();
            commitHandles();
          }
        }}
        onRemove={(h) => setHandles((prev) => prev.filter((x) => x !== h))}
        onSubmit={commitHandles}
        placeholder={
          atLimit ? `Up to ${MAX_TRACKED} accounts` : "Paste handles — comma-separated, @ optional"
        }
        removeDisabled={fixture.pending}
        removeLabel={(h) => `Remove @${h}`}
        value={handleDraft}
      />
    </FieldBlock>
  );

  const websitesField = (
    <FieldBlock
      badge={<Badge variant="secondary">Coming soon</Badge>}
      dimmed
      help="Not yet available — X accounts are the live source today."
      label={`Websites (${websites.length}/${MAX_WEBSITES})`}
    >
      <ChipsField
        chipLabel={(s) => s}
        chips={websites}
        disabled
        inputDisabled
        onChange={setWebsiteDraft}
        onRemove={(s) => setWebsites((prev) => prev.filter((x) => x !== s))}
        onSubmit={() => undefined}
        placeholder="example.com"
        removeDisabled
        removeLabel={(s) => `Remove ${s}`}
        value={websiteDraft}
      />
    </FieldBlock>
  );

  const extractField =
    fixture.showOwnerOverride && fixture.linked ? (
      <FieldBlock
        badge={<Badge variant="secondary">Owner only</Badge>}
        help="Whose voice this agent writes in. Posts still publish from your connected account."
        label="Extract voice from"
      >
        <Input
          disabled={fixture.pending}
          onChange={(e) => setExtractFrom(e.target.value)}
          placeholder="handle without the @"
          value={extractFrom}
        />
      </FieldBlock>
    ) : null;

  const commit = (
    <div className="flex flex-col items-stretch gap-3 sm:items-start">
      {fixture.error ? (
        <p className="text-destructive text-sm" role="alert">
          {fixture.error}
        </p>
      ) : null}
      <Button
        className="w-full sm:w-auto sm:min-w-56"
        disabled={!canSubmit}
        size="lg"
        type="button"
      >
        {fixture.pending ? <Loader2Icon className="animate-spin" /> : null}
        Create agent
      </Button>
      <p className="text-muted-foreground text-xs text-pretty">
        {fixture.pending
          ? "Opening your feed — voice extraction starts there (~5–6 min)."
          : "You’ll open the feed while voice extracts (~5–6 min). Safe to leave and come back."}
      </p>
    </div>
  );

  // mobile: divided-form-card — one container, separators, Connect X first
  if (viewport === "mobile") {
    return (
      <div className="flex w-full flex-col gap-6 py-4">
        <h1 className="font-semibold text-2xl tracking-tight">Create agent</h1>

        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="flex flex-col gap-3 p-4">
              <FieldLabel help="Connect your X account. Oparax reads your recent posts to learn how you write.">
                Your X account
              </FieldLabel>
              <XAccountControl fixture={fixture} />
              {extractField}
            </div>

            <Separator />

            <div className="flex flex-col gap-4 p-4">
              {nameField}
              {beatField}
            </div>

            <Separator />

            <div className="flex flex-col gap-4 p-4">
              {handlesField}
              {websitesField}
            </div>
          </CardContent>

          <CardFooter className="border-border border-t p-4">{commit}</CardFooter>
        </Card>
      </div>
    );
  }

  // web: measure-group-stack — related groups, single column rhythm
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      <h1 className="font-semibold text-2xl tracking-tight">Create agent</h1>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Your X account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <XAccountControl fixture={fixture} />
          {extractField}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Agent brief</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {nameField}
          {beatField}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {handlesField}
          {websitesField}
        </CardContent>
      </Card>

      {commit}
    </div>
  );
}

const STATES: {
  id: string;
  note: string;
  fixture: FormFixture;
}[] = [
  {
    id: "a",
    note: "(a) X not linked — Connect X gate visible, submit blocked",
    fixture: {
      linked: false,
      handle: null,
      name: "",
      beat: "",
      handles: [],
      handleDraft: "",
      websites: [],
      websiteDraft: "",
      extractFrom: "",
      showOwnerOverride: false,
      pending: false,
      error: null,
    },
  },
  {
    id: "b",
    note: "(b) Linked, form empty — ready to fill",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "",
      beat: "",
      handles: [],
      handleDraft: "",
      websites: [],
      websiteDraft: "",
      extractFrom: "ReshadRahman",
      showOwnerOverride: false,
      pending: false,
      error: null,
    },
  },
  {
    id: "c",
    note: "(c) Filled — chips + beat, ready to create",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing, and match reaction. Skip gaming and personal posts.",
      handles: ["David_Ornstein", "CharlesWatts_", "JamesMcNicholas", "afcstuff"],
      handleDraft: "",
      websites: [],
      websiteDraft: "",
      extractFrom: "ReshadRahman",
      showOwnerOverride: true,
      pending: false,
      error: null,
    },
  },
  {
    id: "d",
    note: "(d) Submitting — spinner + feed handoff copy",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing, and match reaction.",
      handles: ["David_Ornstein", "CharlesWatts_", "JamesMcNicholas"],
      handleDraft: "",
      websites: [],
      websiteDraft: "",
      extractFrom: "ReshadRahman",
      showOwnerOverride: false,
      pending: true,
      error: null,
    },
  },
  {
    id: "e",
    note: "(e) Server error — inline alert, form still editable",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing, and match reaction.",
      handles: ["David_Ornstein", "CharlesWatts_"],
      handleDraft: "",
      websites: [],
      websiteDraft: "",
      extractFrom: "ReshadRahman",
      showOwnerOverride: false,
      pending: false,
      error: "Could not create your agent. Please try again.",
    },
  },
];

export default function CreateAgentBoard({ viewport }: { viewport: "mobile" | "web" }) {
  return (
    <div className="flex w-full flex-col gap-12">
      {STATES.map((s) => (
        <PageFrame chrome="deskless" key={s.id} note={s.note} viewport={viewport}>
          <CreateAgentForm fixture={s.fixture} viewport={viewport} />
        </PageFrame>
      ))}
    </div>
  );
}
