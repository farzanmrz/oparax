"use client";

// app/agents/[id]/setup/sources-card.tsx
//
// Setup's left card: tracked X handles. Add/remove are the only real writes here — wired to
// T3's `addTrackedHandle`/`removeTrackedHandle` (`../actions`), same `useTransition` +
// inline-error pattern as `desk-controls.tsx`'s pause/resume. Everything else on this card
// is grey-scaffolded (owner rule, task-8-brief.md): per-source auto-post, the "Auto-post
// all" master, and the news-websites input have no backing column yet.

import { PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { addTrackedHandle, removeTrackedHandle } from "../actions";

function initialsFor(handle: string): string {
  return handle.slice(0, 2).toUpperCase();
}

/** The "Soon" badge — reused for every grey-scaffolded control on this card. */
function SoonBadge() {
  return (
    <Badge className="border-warning/30 bg-warning/10 text-warning" variant="outline">
      Soon
    </Badge>
  );
}

export function SourcesCard({
  deskId,
  deskLive,
  trackedHandles,
}: {
  readonly deskId: string;
  /** Desk-level truth only — never fabricated per-handle connectivity. Real per-account
   *  health arrives with the worker's telemetry, a later slice. */
  readonly deskLive: boolean;
  readonly trackedHandles: readonly string[];
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const handle = input.trim();
    if (!handle) return;
    setError(null);
    startTransition(async () => {
      const result = await addTrackedHandle(deskId, handle);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInput("");
    });
  }

  function handleRemove(handle: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeTrackedHandle(deskId, handle);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Sources</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Auto-post all</span>
          <SoonBadge />
          <Switch
            aria-label="Auto-post all sources — coming soon"
            checked={false}
            className="cursor-not-allowed opacity-70"
            disabled
            title="Auto-post all sources — coming soon"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground">𝕏 X accounts</h3>
          {trackedHandles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts tracked yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {trackedHandles.map((handle) => (
                <div
                  className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-muted/50"
                  key={handle}
                >
                  <Avatar size="sm">
                    <AvatarFallback>{initialsFor(handle)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate font-mono text-sm">@{handle}</span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 text-xs",
                      deskLive ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        deskLive ? "bg-success" : "bg-muted-foreground/50",
                      )}
                    />
                    {deskLive ? "Watching" : "Paused"}
                  </span>
                  <Switch
                    aria-label={`Auto-post @${handle} — coming soon`}
                    checked={false}
                    className="cursor-not-allowed opacity-70"
                    disabled
                    title="Auto-post this source — coming soon"
                  />
                  <Button
                    aria-label={`Stop tracking @${handle}`}
                    disabled={isPending}
                    onClick={() => handleRemove(handle)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5">
            <PlusIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-7 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              disabled={isPending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Add an X account — type a handle, press Enter"
              value={input}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground">News websites</h3>
            <SoonBadge />
          </div>
          <Input className="opacity-60" disabled placeholder="Track a news website — example.com" />
        </div>
      </CardContent>
    </Card>
  );
}
