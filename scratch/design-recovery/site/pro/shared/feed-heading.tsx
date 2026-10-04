"use client";

import { Layers, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { feed } from "../content";
import type { FeedMode } from "../types";

// Direct/Clustered sits beside the page's feed heading in every direction (owner, September 30).
export function FeedModeSwitch({
  mode,
  onMode,
  className,
}: {
  mode: FeedMode;
  onMode: (mode: FeedMode) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => {
        if (value === "direct" || value === "clustered") onMode(value);
      }}
      aria-label={feed.modeLabel}
      spacing={0}
      className={cn("rounded-lg border border-border bg-secondary p-1", className)}
    >
      <ToggleGroupItem
        value="direct"
        className="h-9 gap-1.5 rounded-md! px-3.5 text-sm data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(9_15_29/0.12)] max-desk:h-11"
      >
        <Rows3 className="size-4" aria-hidden="true" />
        {feed.direct}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="clustered"
        className="h-9 gap-1.5 rounded-md! px-3.5 text-sm data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(9_15_29/0.12)] max-desk:h-11"
      >
        <Layers className="size-4" aria-hidden="true" />
        {feed.clustered}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function FeedHeading({
  mode,
  onMode,
  className,
  children,
}: {
  mode: FeedMode;
  onMode: (mode: FeedMode) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{feed.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{feed.agent}</p>
      </div>
      <FeedModeSwitch mode={mode} onMode={onMode} />
      {children}
    </header>
  );
}
