"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
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
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { OparaxMark } from "@/components/logo";

// Starter prompts shown in the empty state; each routes through the same
// agent.send path the prompt input uses.
const STARTER_PROMPTS = [
  "Set up a desk covering AI industry news",
  "I cover US politics — build my agent",
  "Watch crypto markets and draft posts in my voice",
];

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

  // Presentation-only: starter prompts routed through the same guarded send
  // the prompt input uses.
  const handleSuggestion = (suggestion: string) => {
    if (isBusy) return;
    void agent.send({ message: suggestion });
  };

  const isEmpty = agent.data.messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-1 py-6">
          {isEmpty ? (
            <ConversationEmptyState
              description="Describe the beat you cover, the sources that matter, and the voice you post in — your agent takes it from there."
              icon={
                <span className="flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <OparaxMark className="size-7 text-primary" />
                </span>
              }
              title="Brief your new agent"
            >
              <Suggestions className="mt-2 justify-center">
                {STARTER_PROMPTS.map((prompt) => (
                  <Suggestion key={prompt} onClick={handleSuggestion} suggestion={prompt} />
                ))}
              </Suggestions>
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
        <p className="mx-auto w-full max-w-3xl shrink-0 px-1 pb-2 text-sm text-destructive">
          Request failed: {agent.error.message}
        </p>
      ) : null}

      <div className="mx-auto w-full max-w-3xl shrink-0 px-1 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              disabled={isBusy}
              placeholder="Describe the beat your agent should cover…"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <span className="px-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Oparax desk agent
              </span>
            </PromptInputTools>
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
  const isStreaming = message.parts.some(
    (part) => "state" in part && part.state === "streaming",
  );
  const showActions = message.role === "assistant" && text.length > 0 && !isStreaming;

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => (
          <AgentMessagePart key={partKey(part, index)} part={part} />
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

function AgentMessagePart({ part }: { readonly part: EveMessagePart }) {
  switch (part.type) {
    case "text":
      return (
        <MessageResponse caret="block" isAnimating={part.state === "streaming"}>
          {part.text}
        </MessageResponse>
      );
    case "reasoning":
      // Mirrors the AI Elements chatbot example: auto-opens while the model is
      // reasoning, collapses to a "Thought for…" trigger when done.
      return (
        <Reasoning isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "dynamic-tool":
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

function partKey(part: EveMessagePart, index: number): string {
  return part.type === "dynamic-tool" ? part.toolCallId : `${part.type}:${index}`;
}
