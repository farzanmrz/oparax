"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { OparaxMark } from "@/components/logo";

/**
 * Chat over the repo's eve agent, laid out to mirror the AI Elements chatbot
 * example: one full-height Conversation (empty state lives inside it) with a
 * structured PromptInput (body + footer toolbar) pinned below. Talks to the
 * same-origin /eve/v1/* routes mounted by withEve(); one session per mount,
 * no persistence. The eve wiring (useEveAgent, send, stop) is unchanged.
 */
export function AgentChat({
  onDirtyChange,
}: {
  /** Fired whenever the conversation gains/loses content, so a parent can guard
   *  unsaved progress. Additive only — does not alter the eve send wiring. */
  readonly onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  // Report dirtiness (has the desk received any messages yet?) to an optional
  // parent guard. Observation only — the send handlers below are untouched.
  const messageCount = agent.data.messages.length;
  useEffect(() => {
    onDirtyChange?.(messageCount > 0);
  }, [messageCount, onDirtyChange]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || isBusy) return;

    await agent.send({ message: text });
  };

  const isEmpty = agent.data.messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="w-full gap-6 px-1 py-4">
          {isEmpty ? (
            <ConversationEmptyState
              description=""
              icon={
                <span className="flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <OparaxMark className="size-7 text-primary" />
                </span>
              }
              title="Set up your news desk"
            >
              {/* Single welcome block (replaces the old starter-prompt chips) —
                  phrased as Oparax greeting the reporter, not a feature list. */}
              <div className="mt-3 max-w-lg space-y-3 rounded-lg border bg-card/40 p-4 text-left text-muted-foreground text-sm leading-relaxed">
                <p>
                  Hey, I&apos;m <span className="font-medium text-foreground">Oparax</span> — your
                  AI news desk. I can watch up to 20 X accounts and any websites you trust, gather
                  what they publish into distinct news items with every source cited, and draft
                  posts in your voice, sized for your account.
                </p>
                <p>
                  Tell me your beat and we&apos;ll get started — brief me everything at once, or
                  we&apos;ll walk through it step by step.
                </p>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {agent.data.messages.map((message) => (
                <AgentMessage key={message.id} message={message} />
              ))}
              {agent.status === "submitted" ? (
                <Message from="assistant">
                  <MessageContent>
                    <Shimmer className="text-sm">Thinking…</Shimmer>
                  </MessageContent>
                </Message>
              ) : null}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {agent.error ? (
        <p className="w-full shrink-0 px-1 pb-2 text-sm text-destructive">
          Request failed: {agent.error.message}
        </p>
      ) : null}

      <div className="w-full shrink-0 px-1 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              disabled={isBusy}
              placeholder="Describe the beat your agent should cover…"
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit onStop={agent.stop} status={agent.status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function AgentMessage({ message }: { readonly message: EveMessage }) {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
  const isStreaming = message.parts.some((part) => "state" in part && part.state === "streaming");
  const showActions = message.role === "assistant" && text.length > 0 && !isStreaming;

  return (
    <Message from={message.role}>
      {/* Assistant content is full-width so tool/JSX blocks aren't scrunched to
          the left; user bubbles keep their content-fit width. */}
      <MessageContent className={message.role === "assistant" ? "w-full" : undefined}>
        {/* Render reasoning, tool calls, and text INLINE in the order the model
            produced them — so a "let me verify…" line reads before its tool, not
            after a grouped chain-of-thought that ran ahead of it. */}
        {message.parts.map((part, index) => (
          <MessagePart key={partKey(part.type, index)} part={part} role={message.role} />
        ))}
        {showActions ? (
          <MessageActions className="-ml-1.5 text-muted-foreground">
            <CopyMessageAction text={text} />
          </MessageActions>
        ) : null}
      </MessageContent>
    </Message>
  );
}

/** Presentation-only copy-to-clipboard action for assistant replies. */
function CopyMessageAction({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context); silently ignore.
    }
  };

  return (
    <MessageAction label="Copy message" onClick={handleCopy} tooltip="Copy">
      {copied ? <CheckIcon className="size-3.5 text-primary" /> : <CopyIcon className="size-3.5" />}
    </MessageAction>
  );
}

// Stable key for a reasoning/text part. eve message parts only ever append
// (never reorder or splice mid-stream), so a positional key is safe here — the
// helper keeps that index out of the JSX so it reads as intentional, not a slip.
function partKey(prefix: string, index: number): string {
  return `${prefix}:${index}`;
}

// One message part, rendered in document order with the stock ai-elements kit.
// Two deliberate deviations, each rooted in an observed ask: the reporter's own
// text shows exactly as typed/pasted (markdown would collapse newlines), and the
// current_time tool call is hidden (pure plumbing).
function MessagePart({ part, role }: { readonly part: EveMessagePart; readonly role: string }) {
  switch (part.type) {
    case "text":
      if (role === "user") {
        return <div className="whitespace-pre-wrap break-words text-sm">{part.text}</div>;
      }
      return (
        <MessageResponse caret="block" isAnimating={part.state === "streaming"}>
          {part.text}
        </MessageResponse>
      );
    case "reasoning":
      // Stock behavior: auto-opens while the model reasons, collapses to a
      // "Thought for…" trigger when done.
      return (
        <Reasoning isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "dynamic-tool":
      if (part.toolName === "current_time") {
        return null;
      }
      return (
        <Tool>
          <ToolHeader
            state={part.state}
            title={part.toolName}
            toolName={part.toolName}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={part.input} />
            <ToolOutput errorText={part.errorText} output={part.output} />
          </ToolContent>
        </Tool>
      );
    default:
      return null;
  }
}
