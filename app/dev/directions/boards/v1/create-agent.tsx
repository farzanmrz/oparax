"use client";

import { CheckCircle2Icon, InfoIcon, Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_TRACKED = 25;

type CreateFixture = {
  linked: boolean;
  handle: string | null;
  name: string;
  beat: string;
  handles: string[];
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

function Field({
  label,
  help,
  badge,
  dimmed,
  children,
}: {
  readonly label: string;
  readonly help?: string;
  readonly badge?: ReactNode;
  readonly dimmed?: boolean;
  readonly children: ReactNode;
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

function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <div className="border-border border-b pb-3">
      <h2 className="font-semibold text-base">{children}</h2>
    </div>
  );
}

function ConnectedAccount({ handle }: { readonly handle: string }) {
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-lg border border-input bg-input/20 px-3 text-sm">
      <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />
      <span className="truncate font-medium">@{handle}</span>
      <span className="text-muted-foreground">Connected</span>
    </div>
  );
}

function CreateForm({
  fixture,
  viewport,
}: {
  readonly fixture: CreateFixture;
  readonly viewport: "mobile" | "web";
}) {
  const [name, setName] = useState(fixture.name);
  const [beat, setBeat] = useState(fixture.beat);
  const [handles, setHandles] = useState(fixture.handles);
  const [handleDraft, setHandleDraft] = useState("");
  const formDisabled = fixture.pending || !fixture.linked;

  function commitHandles() {
    const incoming = handleDraft
      .split(/[\s,]+/)
      .map((value) => value.replace(/^@/, "").trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    setHandles((current) => {
      const next = [...current];
      for (const handle of incoming) {
        if (next.length >= MAX_TRACKED) break;
        if (!next.some((value) => value.toLowerCase() === handle.toLowerCase())) next.push(handle);
      }
      return next;
    });
    setHandleDraft("");
  }

  const identityFields = (
    <div className="flex flex-col gap-5">
      <Field
        help="Connect the X account Oparax will use to learn your voice and publish approved drafts."
        label="Your X account"
      >
        {fixture.linked && fixture.handle ? (
          <ConnectedAccount handle={fixture.handle} />
        ) : (
          <div className="flex items-center">
            <Button type="button" variant="outline">
              Connect X
            </Button>
          </div>
        )}
      </Field>
      <Field
        help="Shown in the agent picker. If left blank, Oparax creates a name from the Beat."
        label="Agent name"
      >
        <Input
          disabled={formDisabled}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Arsenal watch"
          value={name}
        />
      </Field>
      <Field help="Define what counts as relevant and what this agent should ignore." label="Beat">
        <Textarea
          className={cn("min-h-36 resize-none", viewport === "mobile" && "text-base")}
          disabled={formDisabled}
          onChange={(event) => setBeat(event.target.value)}
          placeholder="e.g. Arsenal team news, transfers and match reaction. Skip gaming and personal posts."
          value={beat}
        />
      </Field>
    </div>
  );

  const sourceFields = (
    <div className="flex flex-col gap-5">
      <Field
        help="The X accounts this agent watches. Paste several handles at once."
        label={`Tracked X accounts (${handles.length}/${MAX_TRACKED})`}
      >
        <ChipsField
          chipLabel={(handle) => `@${handle}`}
          chips={handles}
          className="min-h-36"
          inputDisabled={formDisabled || handles.length >= MAX_TRACKED}
          onBlur={commitHandles}
          onChange={setHandleDraft}
          onKeyDown={(event) => {
            if (event.key === ",") {
              event.preventDefault();
              commitHandles();
            }
          }}
          onRemove={(handle) =>
            setHandles((current) => current.filter((value) => value !== handle))
          }
          onSubmit={commitHandles}
          placeholder="Paste handles — comma-separated, @ optional"
          removeDisabled={formDisabled}
          removeLabel={(handle) => `Remove @${handle}`}
          value={handleDraft}
        />
      </Field>
      <Field
        badge={<Badge variant="secondary">Coming soon</Badge>}
        dimmed
        help="Website monitoring is not available yet. X accounts are the live source today."
        label="Websites"
      >
        <Input disabled placeholder="example.com" />
      </Field>
    </div>
  );

  const action = (
    <div className="flex w-full flex-col gap-2">
      <Button
        className="w-full"
        disabled={!fixture.linked || fixture.pending || beat.trim().length === 0}
        size="lg"
        type="button"
      >
        {fixture.pending ? <Loader2Icon className="animate-spin" /> : null}
        {fixture.pending ? "Creating agent…" : "Create agent"}
      </Button>
      {fixture.error ? (
        <p className="text-destructive text-sm" role="alert">
          {fixture.error}
        </p>
      ) : null}
    </div>
  );

  if (viewport === "mobile") {
    return (
      <div className="flex w-full flex-col gap-6 py-5">
        <h1 className="font-semibold text-2xl tracking-tight">Create agent</h1>
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-4 p-4">
            <SectionTitle>Identity</SectionTitle>
            {identityFields}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-4 p-4">
            <SectionTitle>Sources</SectionTitle>
            {sourceFields}
          </CardContent>
        </Card>
        {action}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-7 py-7">
      <h1 className="font-semibold text-2xl tracking-tight">Create agent</h1>
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-stretch gap-6">
        <Card className="h-full shadow-none">
          <CardContent className="flex h-full flex-col gap-5 p-6">
            <SectionTitle>Identity</SectionTitle>
            {identityFields}
          </CardContent>
        </Card>
        <Card className="h-full shadow-none">
          <CardContent className="flex h-full flex-col gap-5 p-6">
            <SectionTitle>Sources</SectionTitle>
            {sourceFields}
          </CardContent>
        </Card>
      </div>
      {action}
    </div>
  );
}

const STATES: ReadonlyArray<{ id: string; note: string; fixture: CreateFixture }> = [
  {
    id: "unlinked",
    note: "(a) Connect X first — the public form appears only after OAuth",
    fixture: {
      linked: false,
      handle: null,
      name: "",
      beat: "",
      handles: [],
      pending: false,
      error: null,
    },
  },
  {
    id: "empty",
    note: "(b) Connected — Identity and Sources are ready to fill",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "",
      beat: "",
      handles: [],
      pending: false,
      error: null,
    },
  },
  {
    id: "filled",
    note: "(c) Filled — critical Beat and tracked-source chips remain scannable",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing and match reaction. Skip gaming and personal posts.",
      handles: ["David_Ornstein", "CharlesWatts_", "JamesMcNicholas", "afcstuff"],
      pending: false,
      error: null,
    },
  },
  {
    id: "submitting",
    note: "(d) Submitting — one commit action, then the browser replaces to Feed",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing and match reaction.",
      handles: ["David_Ornstein", "CharlesWatts_", "JamesMcNicholas"],
      pending: true,
      error: null,
    },
  },
  {
    id: "error",
    note: "(e) Creation failed — inline error preserves the completed form",
    fixture: {
      linked: true,
      handle: "ReshadRahman",
      name: "Arsenal watch",
      beat: "Arsenal team news, transfer sourcing and match reaction.",
      handles: ["David_Ornstein", "CharlesWatts_"],
      pending: false,
      error: "Could not create your agent. Please try again.",
    },
  },
];

export default function V1CreateAgentBoard({ viewport }: { readonly viewport: "mobile" | "web" }) {
  return (
    <div className="flex w-full flex-col gap-12">
      {STATES.map((state) => (
        <PageFrame
          chrome="deskless"
          headerVariant="v1"
          key={state.id}
          note={state.note}
          viewport={viewport}
        >
          <CreateForm fixture={state.fixture} viewport={viewport} />
        </PageFrame>
      ))}
    </div>
  );
}
