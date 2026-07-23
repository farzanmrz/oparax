"use client";

// app/agents/new/create-desk-form.tsx
//
// The create-desk screen: a form (Beat, Tracked X accounts, Your X handle, plus the
// grey-scaffolded Websites + Draft instructions fields) alongside a live preview panel that
// binds only to live form state — tracked-handle count and the first/second handle — per the
// locked design digest (.feature/design/design-digest.md §5). No scan or model call runs from
// this screen; the checklist and drafted/drafting cards are illustrative, matching the mock's
// own static panel.

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useState, useTransition } from "react";
import { OparaxMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDesk } from "./actions";

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

/** Uppercase micro-label, matching the design's field-label treatment (§7: 10–11.5px/700,
 *  uppercase-by-content) — a Tailwind utility, not a custom token. */
function FieldLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export function CreateDeskForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [beat, setBeat] = useState("");
  const [handles, setHandles] = useState<string[]>([]);
  const [handleDraft, setHandleDraft] = useState("");
  const [reporterHandle, setReporterHandle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function addHandle() {
    const next = normalizeHandle(handleDraft);
    if (!next) return;
    setHandles((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setHandleDraft("");
  }

  function removeHandle(handle: string) {
    setHandles((prev) => prev.filter((h) => h !== handle));
  }

  function handleChipKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addHandle();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createDesk({ beat, trackedHandles: handles, reporterHandle });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.push(`/agents/${result.id}/voice`);
    });
  }

  const canSubmit = beat.trim().length > 0 && reporterHandle.trim().length > 0 && !isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <OparaxMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            New desk
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Create desk · preview runs through to a draft
          </h1>
        </div>
        <Button aria-label="Close" asChild size="icon-sm" variant="ghost">
          <Link href="/agents">
            <XIcon />
          </Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Beat</FieldLabel>
              <Textarea
                onChange={(e) => setBeat(e.target.value)}
                placeholder="US AI regulation — agencies, hearings, enforcement. Skip product launches."
                rows={3}
                value={beat}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Tracked X accounts</FieldLabel>
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
              <Input
                onChange={(e) => setHandleDraft(e.target.value)}
                onKeyDown={handleChipKeyDown}
                placeholder="@…"
                value={handleDraft}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Your X handle — for the voice guide</FieldLabel>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  onChange={(e) => setReporterHandle(e.target.value)}
                  placeholder="mirakwrites"
                  value={reporterHandle}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/70 p-3 opacity-55">
              <div className="flex items-center gap-2">
                <FieldLabel>Websites</FieldLabel>
                <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
                  Coming soon
                </Badge>
              </div>
              <Input disabled placeholder="https:// …" />
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/70 p-3 opacity-55">
              <div className="flex items-center gap-2">
                <FieldLabel>Draft instructions</FieldLabel>
                <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
                  Coming soon
                </Badge>
              </div>
              <Textarea disabled placeholder='e.g. "never speculate on outcomes"' rows={2} />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button className="mt-1 w-full" disabled={!canSubmit} size="lg" type="submit">
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Create desk
            </Button>
          </form>

          <CreateDeskPreview
            firstHandle={handles[0]}
            secondHandle={handles[1]}
            sourceCount={handles.length}
          />
        </div>
      </div>
    </div>
  );
}

function CreateDeskPreview({
  sourceCount,
  firstHandle,
  secondHandle,
}: {
  readonly sourceCount: number;
  readonly firstHandle: string | undefined;
  readonly secondHandle: string | undefined;
}) {
  const checklist = [
    `connected to ${sourceCount} sources`,
    `${sourceCount} posts found`,
    "drafted in your voice",
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
        <p className="text-[11px] font-bold tracking-wide text-warning uppercase">
          Live preview — real pipeline
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Runs as you type — proof of a post in your voice before you commit.
      </p>

      <ul className="flex flex-col gap-1.5">
        {checklist.map((item) => (
          <li className="flex items-center gap-2 text-sm text-foreground" key={item}>
            <CheckIcon className="size-3.5 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </ul>

      {firstHandle ? (
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">@{firstHandle} · 12:41</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            New filing signals a shift in enforcement posture — sources describe internal
            disagreement over how far the agency is willing to go. More being confirmed.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span
              className="cursor-not-allowed rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground"
              title="Posting is disabled in preview"
            >
              Post to X
            </span>
            <span className="font-mono text-xs text-muted-foreground">198 / 280</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">why this draft ›</p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
          Add a tracked X account to preview a draft.
        </p>
      )}

      {secondHandle ? (
        <div className="rounded-lg border border-border bg-background p-3">
          <span className="font-mono text-xs text-muted-foreground">@{secondHandle} · 11:20</span>
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="h-3 w-full animate-pulse rounded bg-muted" />
            <span className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">drafting…</p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Posting is disabled in preview — enabled once the desk exists.
      </p>
    </div>
  );
}
