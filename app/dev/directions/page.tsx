"use client";

// Direction-council review harness (plan-phase scratch, working tree only — never committed).
// Three switchers — model family · page · viewport — rendering the selected lane module.
// Presentation only: it never edits lane modules.

import { type ComponentType, useState } from "react";
import { cn } from "@/lib/utils";
import AgyCreateAgent from "./boards/agy/create-agent";
import AgyFeedPreReady from "./boards/agy/feed-pre-ready";
import ClaudeCreateAgent from "./boards/claude/create-agent";
import ClaudeFeedPreReady from "./boards/claude/feed-pre-ready";
import CodexCreateAgent from "./boards/codex/create-agent";
import CodexFeedPreReady from "./boards/codex/feed-pre-ready";
import GrokCreateAgent from "./boards/grok/create-agent";
import GrokFeedPreReady from "./boards/grok/feed-pre-ready";
import V1CreateAgent from "./boards/v1/create-agent";
import V1FeedPreReady from "./boards/v1/feed-pre-ready";

type Viewport = "mobile" | "web";
type BoardModule = ComponentType<{ viewport: Viewport }>;

const FAMILIES = ["claude", "codex", "grok", "agy", "v1"] as const;
const PAGES = ["create-agent", "feed-pre-ready"] as const;
const VIEWPORTS: Viewport[] = ["mobile", "web"];

const BOARDS: Record<(typeof FAMILIES)[number], Record<(typeof PAGES)[number], BoardModule>> = {
  agy: { "create-agent": AgyCreateAgent, "feed-pre-ready": AgyFeedPreReady },
  claude: { "create-agent": ClaudeCreateAgent, "feed-pre-ready": ClaudeFeedPreReady },
  codex: { "create-agent": CodexCreateAgent, "feed-pre-ready": CodexFeedPreReady },
  grok: { "create-agent": GrokCreateAgent, "feed-pre-ready": GrokFeedPreReady },
  v1: { "create-agent": V1CreateAgent, "feed-pre-ready": V1FeedPreReady },
};

function Switcher<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: readonly T[];
  readonly value: T;
  readonly onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        {options.map((option) => (
          <button
            className={cn(
              "rounded px-2.5 py-1 text-xs transition-colors",
              option === value
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DirectionsHarness() {
  const [family, setFamily] = useState<(typeof FAMILIES)[number]>("claude");
  const [page, setPage] = useState<(typeof PAGES)[number]>("create-agent");
  const [viewport, setViewport] = useState<Viewport>("mobile");

  const Board = BOARDS[family][page];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-x-5 gap-y-2 border-border border-b bg-card px-4 py-2.5">
        <span className="font-semibold text-sm">Direction boards — slice 79</span>
        <Switcher label="model" onChange={setFamily} options={FAMILIES} value={family} />
        <Switcher label="page" onChange={setPage} options={PAGES} value={page} />
        <Switcher label="viewport" onChange={setViewport} options={VIEWPORTS} value={viewport} />
      </div>

      {/* Modules frame themselves now (PageFrame, chrome.tsx): one framed FULL PAGE per
          state, annotation outside the frame. The harness only provides the canvas. */}
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-10 px-4 py-6">
        <Board viewport={viewport} />
      </div>
    </div>
  );
}
