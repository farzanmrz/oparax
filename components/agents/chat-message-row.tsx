"use client";

// ChatMessageRow — renders a single UIMessage using stock AI Elements.
// Assistant rows: plain text on the page (no fill) via <Message>/<MessageContent>,
//   with the AI Elements Reasoning dropdown for reasoning text plus the rich tool
//   output — the scan ITEMS list and the per-item draft cards. We deliberately do
//   NOT render stock <Tool> blocks: the items/drafts already render as cards, so a
//   raw-JSON tool block (and the model re-listing the same content as text) is pure
//   duplication. The only on-screen trace of a tool call is its rich card or, while
//   it runs, the "Scanning…/Drafting…" pill.
// User rows: the stock AI Elements bubble (<MessageContent> in is-user mode).
//
// Reasoning: the AI Elements Reasoning brain+dropdown. Only the LAST message is
//   treated as streaming (per-message), so older messages settle to "Thought for
//   a few seconds" instead of flipping back to "Thinking…".

import type { DynamicToolUIPart, UIMessage } from "ai";
import { DraftCard } from "@/components/agents/draft-card";
import { ScanNewsGrid } from "@/components/agents/scan-news-card";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Spinner } from "@/components/ui/spinner";
import type { DraftToolResult, ScanToolResult } from "@/lib/scan/types";

// Muted line for a gated/empty scan or "scan first" draft notice.
const NOTICE_STYLE = {
  margin: 0,
  font: "400 0.875rem/1.5 var(--font-sans)",
  color: "var(--muted)",
} as const;

export interface ChatMessageRowProps {
  message: UIMessage;
  userName: string;
  userAvatarUrl?: string | null;
  isStreaming: boolean;
  isLast: boolean;
  draftEdits: Record<string, string>;
  onDraftChange: (dedupeKey: string, text: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers to cast DynamicToolUIPart cleanly
// ---------------------------------------------------------------------------
function isToolPart(part: UIMessage["parts"][number]): part is DynamicToolUIPart {
  return (
    typeof part.type === "string" && (part.type === "dynamic-tool" || part.type.startsWith("tool-"))
  );
}

/**
 * The tool's name. AI SDK v6 STATIC tool parts carry the name in `type`
 * ("tool-runScan") and leave `toolName` null; only DYNAMIC tool parts populate
 * `toolName`. Deriving from `type` makes both the header label and the
 * rich-output branches resolve the name in every case (the old code read
 * `toolName` only, so static parts showed a blank, nameless "Completed" block).
 */
function toolNameOf(part: DynamicToolUIPart): string {
  if (part.toolName) return part.toolName;
  return typeof part.type === "string" && part.type.startsWith("tool-")
    ? part.type.slice("tool-".length)
    : "";
}

/** Renders one message row for the chat shell. */
export function ChatMessageRow({
  message,
  userName: _userName,
  userAvatarUrl: _userAvatarUrl,
  isStreaming,
  isLast,
  draftEdits,
  onDraftChange,
}: ChatMessageRowProps) {
  const isUser = message.role === "user";

  // ── User message: stock AI Elements bubble ───────────────────────────────
  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <Message from="user">
        <MessageContent>
          <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
        </MessageContent>
      </Message>
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

  // 3. Collect tool-call parts.
  const toolParts = message.parts.filter(isToolPart);

  // 4. Render text parts
  const textParts = message.parts
    .filter((p) => p.type === "text")
    .map((p, i) => {
      // biome-ignore lint/suspicious/noArrayIndexKey: text parts within one message are stable and never reordered.
      return <MessageResponse key={`text-${i}`}>{(p as { text: string }).text}</MessageResponse>;
    });

  // 5. Render rich result outputs for the two phases: the SCAN tool (runScan) renders the
  //    news ITEMS grid; the DRAFT tool (draft) renders one editable post per item. An empty
  //    result carrying a notice (gated scan, "scan first", or an error) renders the notice.
  //    updateConfig has no rich output and no on-screen trace — the live ConfigCard is its
  //    only reflection (we deliberately don't render stock Tool blocks).
  const outputParts = toolParts
    .map((toolPart) => {
      const toolName = toolNameOf(toolPart);
      const toolState = toolPart.state;
      const partKey = `tool-${toolPart.toolCallId}`;
      const isScan = toolName === "runScan";
      const isDraft = toolName === "draft";
      if (!isScan && !isDraft) return null;

      // ── errored — surface the error instead of a perpetual spinner ──────
      if (toolState === "output-error") {
        return (
          <p key={partKey} style={NOTICE_STYLE}>
            {toolPart.errorText ??
              (isDraft ? "Drafting failed — try again." : "The scan failed — try again.")}
          </p>
        );
      }

      // ── still running (genuinely in flight) ────────────────────────────
      if (toolState !== "output-available") {
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
            {isDraft ? "Drafting your posts…" : "Scanning your sources…"}
          </div>
        );
      }

      if (!toolPart.output) return null;

      // ── SCAN phase — news items only (no drafts yet) ───────────────────
      if (isScan) {
        const result = toolPart.output as ScanToolResult;
        const items = result.items ?? [];
        if (items.length === 0) {
          return result.notice ? (
            <p key={partKey} style={NOTICE_STYLE}>
              {result.notice}
            </p>
          ) : null;
        }
        return <ScanNewsGrid key={partKey} items={items} />;
      }

      // ── DRAFT phase — one editable post per item ───────────────────────
      const result = toolPart.output as DraftToolResult;
      const stories = result.stories ?? [];
      if (stories.length === 0) {
        return result.notice ? (
          <p key={partKey} style={NOTICE_STYLE}>
            {result.notice}
          </p>
        ) : null;
      }
      return (
        <div key={partKey} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stories.map((story) => (
            <DraftCard
              key={story.dedupeKey}
              story={story}
              draft={draftEdits[story.dedupeKey] ?? story.draft}
              onDraftChange={(t) => onDraftChange(story.dedupeKey, t)}
            />
          ))}
        </div>
      );
    })
    .filter(Boolean);

  return (
    <Message from="assistant">
      <MessageContent>
        {/* 1. AI Elements Reasoning dropdown — reasoning text only */}
        {reasoningText && (
          <Reasoning isStreaming={isTurnStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* 2. Text parts (the visible final message) */}
        {textParts}

        {/* 3. Rich result outputs — scan items + draft cards */}
        {outputParts}
      </MessageContent>
    </Message>
  );
}

/** Small "Thinking…" indicator rendered while the assistant is generating (before any parts arrive). */
export function ThinkingRow() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--faint)",
          }}
        >
          <Spinner className="size-4" />
          <span>Thinking…</span>
        </div>
      </MessageContent>
    </Message>
  );
}
