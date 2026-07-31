"use client";

// kit mapping:
// - PageFrame from "@/app/dev/directions/chrome"
// - Input, Textarea, Button, Badge, Separator from "@/components/ui/*"
// - ChipsField from "@/components/chips-field"
// -> bespoke: <FieldLabel>, <SectionGroup>, <SectionRow>

import { CheckIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MOCK_HANDLES = ["arsenal", "FabrizioRomano", "David_Ornstein"];

function FieldLabel({
  children,
  help,
  badge,
}: {
  children: React.ReactNode;
  help?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {help && <InfoIcon className="size-3.5 text-muted-foreground/70" />}
      {badge}
    </div>
  );
}

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card overflow-hidden">{children}</div>;
}

function SectionRow({ children, border = true }: { children: React.ReactNode; border?: boolean }) {
  return <div className={`p-4 sm:p-6 ${border ? "border-b border-border" : ""}`}>{children}</div>;
}

export default function CreateAgentBoard({ viewport }: { viewport: "mobile" | "web" }) {
  const renderState = (
    note: string,
    state: "unlinked" | "empty" | "filled" | "submitting" | "error",
  ) => {
    const isLinked = state !== "unlinked";
    const isFilled = state === "filled" || state === "submitting" || state === "error";
    const isSubmitting = state === "submitting";

    return (
      <PageFrame viewport={viewport} chrome="deskless" note={note}>
        <div className="py-6 sm:py-10 flex flex-col gap-8 max-w-2xl mx-auto w-full">
          <header className="shrink-0">
            <h1 className="truncate font-semibold text-2xl tracking-tight">Create agent</h1>
          </header>

          <form
            className="flex w-full flex-col gap-6 sm:gap-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-col gap-3">
              <h2 className="font-medium text-foreground text-sm">Identity</h2>
              {isLinked ? (
                <div className="flex min-h-9 items-center gap-2 px-1 text-sm">
                  <CheckIcon className="size-4 text-primary" />
                  <span className="font-medium">@farzan</span>
                  <span className="text-muted-foreground">connected</span>
                </div>
              ) : (
                <Button className="w-fit" variant="outline" type="button">
                  Connect X
                </Button>
              )}
            </div>

            <fieldset
              disabled={!isLinked || isSubmitting}
              className="flex flex-col gap-6 sm:gap-8 disabled:opacity-70"
            >
              <SectionGroup>
                <SectionRow>
                  <FieldLabel help="Shown in the agent switcher">Agent name</FieldLabel>
                  <Input
                    placeholder="e.g. Barça watch"
                    defaultValue={isFilled ? "Arsenal watch" : ""}
                  />
                </SectionRow>

                <SectionRow border={false}>
                  <FieldLabel help="The topic this agent watches">Beat</FieldLabel>
                  <Textarea
                    placeholder="e.g. US AI regulation. Skip product launches."
                    rows={4}
                    defaultValue={
                      isFilled ? "Arsenal team news, transfers, and match reactions." : ""
                    }
                  />
                </SectionRow>
              </SectionGroup>

              <SectionGroup>
                <SectionRow>
                  <FieldLabel help="Paste several at once">
                    Tracked X accounts ({isFilled ? "3" : "0"}/25)
                  </FieldLabel>
                  <ChipsField
                    chips={isFilled ? MOCK_HANDLES : []}
                    chipLabel={(h) => `@${h}`}
                    value=""
                    onChange={() => {}}
                    onRemove={() => {}}
                    onSubmit={() => {}}
                    inputDisabled={false}
                    removeDisabled={false}
                    placeholder="Paste handles..."
                    removeLabel={() => "Remove"}
                    className="min-h-24"
                  />
                </SectionRow>
                <SectionRow border={false}>
                  <div className="opacity-50">
                    <FieldLabel badge={<Badge variant="secondary">Coming soon</Badge>}>
                      Websites (0/5)
                    </FieldLabel>
                    <ChipsField
                      chips={[]}
                      chipLabel={(s) => s}
                      value=""
                      onChange={() => {}}
                      onRemove={() => {}}
                      onSubmit={() => {}}
                      inputDisabled={true}
                      disabled={true}
                      removeDisabled={true}
                      placeholder="example.com"
                      removeLabel={() => ""}
                    />
                  </div>
                </SectionRow>
              </SectionGroup>
            </fieldset>

            <div className="flex flex-col items-start gap-3 pt-4">
              {state === "error" && (
                <p className="text-destructive text-sm" role="alert">
                  Could not create your agent. Please try again.
                </p>
              )}
              {isSubmitting && (
                <p className="text-muted-foreground text-sm">
                  Agent creating... you'll be redirected to the feed.
                </p>
              )}
              <Button
                size="lg"
                className="w-full sm:w-auto sm:min-w-64"
                disabled={!isLinked || isSubmitting}
              >
                {isSubmitting && <Loader2Icon className="mr-2 animate-spin size-4" />}
                Create agent
              </Button>
            </div>
          </form>
        </div>
      </PageFrame>
    );
  };

  return (
    <div className="flex flex-col gap-12 py-12 items-center">
      {renderState("(a) X not linked — Connect X gate visible, submit blocked", "unlinked")}
      {renderState("(b) linked, form empty", "empty")}
      {renderState("(c) filled, ready", "filled")}
      {renderState("(d) submitting — pending, the feed handoff legible", "submitting")}
      {renderState("(e) server error inline", "error")}
    </div>
  );
}
