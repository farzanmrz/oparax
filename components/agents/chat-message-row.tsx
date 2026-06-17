"use client";

// ChatMessageRow — renders a single UIMessage in the card-less chat shell.
// Assistant rows: OparaxAvatar + Reasoning dropdown (AI Elements) + text parts
//   + result outputs (verifyHandles / validateSites chips, runScan grid+drafts).
// User rows: bubble + UserAvatar (right-aligned).
//
// Reasoning: the AI Elements Reasoning brain+dropdown. The expandable content
//   holds the reasoning markdown PLUS a compact list of tool-call indicators so
//   the user can see which tools ran this turn. Only the LAST message is treated
//   as streaming (per-message), so older messages settle to "Thought for a few
//   seconds" instead of flipping back to "Thinking…".

import type { DynamicToolUIPart, UIMessage } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { OparaxAvatar, UserAvatar } from "@/components/agents/chat-avatars";
import { WrenchGlyph } from "@/components/agents/chat-glyphs";
import { ScanNewsGrid } from "@/components/agents/scan-news-card";
import { DraftCard } from "@/components/agents/draft-card";
import { VerifyChips, SiteChips } from "@/components/agents/result-chips";
import type { VerifyHandlesResult } from "@/lib/x/verify";
import type { SiteValidationResult } from "@/lib/sites/validate";
import type { PreviewStory, ScanMetrics } from "@/lib/scan/types";

interface RunScanOutput {
  stories: PreviewStory[];
  metrics?: ScanMetrics | null;
}

export interface ChatMessageRowProps {
  message: UIMessage;
  userName: string;
  userAvatarUrl?: string | null;
  isStreaming: boolean;
  isLast: boolean;
  xConnected: boolean;
  draftEdits: Record<string, string>;
  onDraftChange: (dedupeKey: string, text: string) => void;
  addToolOutput: (arg: { toolCallId: string; tool: string; output: unknown }) => void;
  sendMessage: (msg: { text: string }) => void;
}

// ---------------------------------------------------------------------------
// Humanized labels for tool-call indicators shown inside the reasoning dropdown.
// ---------------------------------------------------------------------------
const TOOL_LABELS: Record<string, string> = {
  setAgentConfig: "Saved settings",
  verifyHandles: "Verified handles",
  validateSites: "Checked sites",
  discoverHandles: "Searched X for accounts",
  discoverSites: "Searched the web for sites",
  fetchExampleTweets: "Read example posts",
  fetchMyRecentPosts: "Pulled your recent posts",
  runScan: "Scanned sources",
};

// ---------------------------------------------------------------------------
// Helpers to cast DynamicToolUIPart cleanly
// ---------------------------------------------------------------------------
function isToolPart(part: UIMessage["parts"][number]): part is DynamicToolUIPart {
  return (
    typeof part.type === "string" && (part.type === "dynamic-tool" || part.type.startsWith("tool-"))
  );
}

/** Renders one message row for the chat shell. */
export function ChatMessageRow({
  message,
  userName,
  userAvatarUrl,
  isStreaming,
  isLast,
  xConnected,
  draftEdits,
  onDraftChange,
  addToolOutput: _addToolOutput,
  sendMessage: _sendMessage,
}: ChatMessageRowProps) {
  const isUser = message.role === "user";

  // ── User message: simple bubble ──────────────────────────────────────────
  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <div className="agent-msg is-user">
        <div className="agent-bubble">
          <div className="agent-bubble-text">{text}</div>
        </div>
        <UserAvatar name={userName} avatarUrl={userAvatarUrl} />
      </div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────────────────
  // 1. Collect reasoning text (if any) — for AI Elements Reasoning dropdown.
  let reasoningText: string | undefined;
  for (const part of message.parts) {
    if (part.type === "reasoning") {
      reasoningText = (part as { text: string }).text;
      break;
    }
  }

  // 2. Per-message streaming: only the LAST message streams. Older messages
  //    settle so their Reasoning shows "Thought for a few seconds".
  const isTurnStreaming = isLast && isStreaming;

  // 3. Collect tool-call parts (for the indicator list inside the dropdown).
  const toolParts = message.parts.filter(isToolPart);

  // 4. Render text parts
  const textParts = message.parts
    .filter((p) => p.type === "text")
    .map((p, i) => (
      <MessageResponse key={`text-${i}`}>{(p as { text: string }).text}</MessageResponse>
    ));

  // 5. Render result outputs (chips + scan grid/drafts). No interactive picker
  //    tools anymore — the flow is text-driven.
  const outputParts = toolParts
    .map((toolPart, idx) => {
      const toolName = toolPart.toolName ?? "";
      const toolState = toolPart.state;
      const partKey = `tool-${toolPart.toolCallId}-${idx}`;

      // ── verifyHandles ───────────────────────────────────────────────────
      if (toolName === "verifyHandles" && toolState === "output-available" && toolPart.output) {
        return <VerifyChips key={partKey} output={toolPart.output as VerifyHandlesResult} />;
      }

      // ── validateSites ───────────────────────────────────────────────────
      if (toolName === "validateSites" && toolState === "output-available" && toolPart.output) {
        return <SiteChips key={partKey} output={toolPart.output as SiteValidationResult[]} />;
      }

      // ── runScan still running ───────────────────────────────────────────
      if (toolName === "runScan" && toolState !== "output-available") {
        return (
          <div
            key={partKey}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "oklch(0.6 0.19 262 / 0.08)",
              border: "1px solid oklch(0.6 0.19 262 / 0.2)",
              color: "var(--faint)",
              font: "500 0.875rem/1 var(--font-sans)",
            }}
          >
            <Spinner className="size-3.5" />
            Scanning your sources…
          </div>
        );
      }

      // ── runScan with output ─────────────────────────────────────────────
      if (toolName === "runScan" && toolState === "output-available" && toolPart.output) {
        const result = toolPart.output as RunScanOutput;
        const stories = result.stories ?? [];
        return (
          <div key={partKey} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScanNewsGrid stories={stories} />
            {stories.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stories.map((story) => (
                  <DraftCard
                    key={story.dedupeKey}
                    story={story}
                    draft={draftEdits[story.dedupeKey] ?? story.draft}
                    onDraftChange={(t) => onDraftChange(story.dedupeKey, t)}
                    xConnected={xConnected}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      // All other tools without explicit rendering → suppress
      return null;
    })
    .filter(Boolean);

  // 6. Tool-call indicator rows for the reasoning dropdown.
  const toolIndicators = toolParts.map((toolPart, idx) => {
    const toolName = toolPart.toolName ?? "";
    const label = TOOL_LABELS[toolName] ?? toolName;
    return (
      <div
        key={`indicator-${toolPart.toolCallId}-${idx}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          font: "400 0.8125rem/1.4 var(--font-sans)",
        }}
      >
        <WrenchGlyph />
        <span>{label}</span>
      </div>
    );
  });

  // Render the Reasoning block whenever there is reasoning text OR a tool call.
  const showReasoning = Boolean(reasoningText) || toolIndicators.length > 0;

  return (
    <div className="agent-msg is-assistant">
      <OparaxAvatar />
      <div className="agent-msg-body">
        {/* 1. AI Elements Reasoning dropdown — reasoning text + tool indicators */}
        {showReasoning && (
          <Reasoning isStreaming={isTurnStreaming}>
            <ReasoningTrigger />
            <CollapsibleContent
              className="mt-4 text-sm text-muted-foreground outline-none data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in"
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {reasoningText && <MessageResponse>{reasoningText}</MessageResponse>}
              {toolIndicators.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {toolIndicators}
                </div>
              )}
            </CollapsibleContent>
          </Reasoning>
        )}

        {/* 2. Text parts (the visible final message) */}
        {textParts}

        {/* 3. Result outputs */}
        {outputParts}
      </div>
    </div>
  );
}

/** Small "Thinking…" indicator rendered while the assistant is generating (before any parts arrive). */
export function ThinkingRow() {
  return (
    <div className="agent-msg is-assistant">
      <OparaxAvatar />
      <div
        className="agent-msg-body"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--faint)",
          paddingTop: 4,
        }}
      >
        <Spinner className="size-4" />
        <span>Thinking…</span>
      </div>
    </div>
  );
}
