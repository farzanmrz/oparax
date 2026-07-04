"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
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
          <OparaxMark className="size-10 text-muted-foreground" />
          <div className="space-y-1.5">
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
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => (
          <AgentMessagePart key={partKey(part, index)} part={part} />
        ))}
      </MessageContent>
    </Message>
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
