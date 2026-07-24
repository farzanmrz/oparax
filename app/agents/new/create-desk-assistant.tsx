"use client";

// app/agents/new/create-desk-assistant.tsx
//
// The create-desk form's assistant: a compact chat panel, vendored from
// components/ai-elements (Conversation/Message/PromptInput/MessageResponse), that helps
// the reporter turn a fuzzy or garbled beat (a rushed line, a dictation mangling) into
// something clear and specific, and confirms the form's other fields in passing. It never
// submits the form itself — when the assistant's `save_agent` tool result comes back, this
// component hands the clarified values to the form via `onApply`; the reporter still
// reviews the now-populated fields and clicks the form's own "Create desk" button. Talks
// to /api/chat (unchanged) via useChat. Client-only, browser-side: no lib/agent/**
// import here on purpose — the form stays a client component with no server-only imports.

import { useChat } from "@ai-sdk/react";
import { SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export type CreateDeskAssistantValues = {
  name: string;
  beat: string;
  trackedHandles: string[];
  reporterHandle: string;
};

/** Runtime-narrow save_agent's `{ ok, config }` tool result into the form's field shape.
 *  Deliberately not shared with lib/agent/tools.ts's schema — this file stays free of any
 *  server-only import, so it re-checks the shape by hand instead of importing a zod type. */
function readSaveAgentValues(output: unknown): CreateDeskAssistantValues | null {
  if (typeof output !== "object" || output === null) return null;
  const config = (output as { config?: unknown }).config;
  if (typeof config !== "object" || config === null) return null;
  const c = config as Record<string, unknown>;
  if (
    typeof c.name === "string" &&
    typeof c.beat === "string" &&
    Array.isArray(c.trackedHandles) &&
    c.trackedHandles.every((h) => typeof h === "string") &&
    typeof c.reporterHandle === "string"
  ) {
    return {
      name: c.name,
      beat: c.beat,
      trackedHandles: c.trackedHandles as string[],
      reporterHandle: c.reporterHandle,
    };
  }
  return null;
}

export function CreateDeskAssistant({
  onApply,
}: {
  readonly onApply: (values: CreateDeskAssistantValues) => void;
}) {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  // Every save_agent call is applied to the form at most once, even across re-renders —
  // the tool part stays in `messages` forever once it lands.
  const appliedToolCallIds = useRef(new Set<string>());

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-save_agent" || part.state !== "output-available") continue;
        if (appliedToolCallIds.current.has(part.toolCallId)) continue;
        const values = readSaveAgentValues(part.output);
        if (!values) continue;
        appliedToolCallIds.current.add(part.toolCallId);
        onApply(values);
      }
    }
  }, [messages, onApply]);

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  }

  return (
    <div className="flex h-80 flex-col overflow-hidden rounded-xl border border-border bg-card/40">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Tell me about the beat, even a rough or dictated version — I'll help you sharpen it, then send it to the form."
              icon={<SparklesIcon className="size-5" />}
              title="Describe your beat"
            />
          ) : null}
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse
                        // biome-ignore lint/suspicious/noArrayIndexKey: parts stream in append-only order and never reorder once rendered
                        key={`${message.id}-${i}`}
                      >
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-border border-t p-2">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. a rough beat, or dictated notes"
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="text-muted-foreground text-xs">
              Helps with the beat — the form is what actually creates the desk.
            </span>
            <PromptInputSubmit disabled={!input.trim()} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
