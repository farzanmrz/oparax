"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
import {
  Conversation,
  ConversationContent,
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
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
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
  "What's breaking on my beat right now?",
  "Brief me on the biggest story of the last hour",
  "Draft a post in my voice about the latest development",
];

/**
 * Minimal chat over the repo's eve agent, adapted from eve's scaffold web
 * template (agent-chat + agent-message, trimmed to text/reasoning/tool parts).
 * Talks to the same-origin /eve/v1/* routes mounted by withEve(); one session
 * per mount, no persistence.
 */
export function AgentChat() {
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

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
    <div className="flex h-full min-h-0 flex-col gap-3">
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <OparaxMark className="size-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Desk online
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-balance">
              What&apos;s moving on your beat?
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">
              Ask your desk to scan the wire, brief you on a developing story, or draft a post in
              your voice.
            </p>
          </div>
          <Suggestions className="justify-center">
            {STARTER_PROMPTS.map((prompt) => (
              <Suggestion key={prompt} onClick={handleSuggestion} suggestion={prompt} />
            ))}
          </Suggestions>
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-0 py-4">
            {agent.data.messages.map((message) => (
              <AgentMessage key={message.id} message={message} />
            ))}
            {agent.status === "submitted" ? (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-sm">Scanning the wire…</Shimmer>
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {agent.error ? (
        <p className="text-destructive text-sm">Request failed: {agent.error.message}</p>
      ) : null}

      <PromptInput onSubmit={handleSubmit} className="shrink-0">
        <PromptInputTextarea disabled={isBusy} placeholder="Ask your news desk…" />
        <PromptInputSubmit onStop={agent.stop} status={agent.status} />
      </PromptInput>
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
      return (
        <Reasoning defaultOpen isStreaming={part.state === "streaming"}>
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
