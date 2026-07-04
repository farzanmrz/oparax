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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

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

  return (
    <div className="flex h-[75dvh] flex-col gap-4">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6">
          {agent.data.messages.map((message) => (
            <AgentMessage key={message.id} message={message} />
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {agent.error ? (
        <p className="text-destructive text-sm">Request failed: {agent.error.message}</p>
      ) : null}

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea disabled={isBusy} placeholder="Send a message…" />
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
