"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolOrDynamicToolName, isToolUIPart } from "ai";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OnboardingData, OnboardingUIMessage } from "@/lib/onboarding/types";

// The five people the lab was tuned on, so each case is one click.
const PEOPLE = [
  { label: "Liam", handle: "ottleyai", beat: "AI developments and practical tools" },
  {
    label: "Nihan",
    handle: "CodebyNihan",
    beat: "New AI tools, product launches and updates worth sharing",
  },
  {
    label: "Reshad",
    handle: "ReshadRahman",
    beat: "FC Barcelona men's first team and football transfer news",
  },
  { label: "Farzan", handle: "farzanmrz", beat: "AI startups and big companies" },
  { label: "Kush", handle: "kushbhuwalka", beat: "AI and tech news" },
];

// A tool's output carries `seen`, the exact text the model read; that is what the step shows.
function seenOf(output: unknown): string | null {
  if (output && typeof output === "object" && "seen" in output && typeof output.seen === "string")
    return output.seen;
  return null;
}

export function OnboardingClient() {
  const [handle, setHandle] = useState("");
  const [beat, setBeat] = useState("");
  const { messages, sendMessage, status, setMessages, stop } = useChat<OnboardingUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/onboarding" }),
  });
  const busy = status === "submitted" || status === "streaming";

  const run = (h: string, b: string) => {
    setMessages([]);
    sendMessage({ text: `@${h}: ${b}` }, { body: { handle: h, beat: b } });
  };

  const parts = messages.flatMap((m) => (m.role === "assistant" ? m.parts : []));
  const statusPart = parts.findLast((p) => p.type === "data-status");
  const resultPart = parts.find((p) => p.type === "data-result");
  const result = resultPart?.type === "data-result" ? resultPart.data : null;

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col gap-4 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl">Onboarding</h1>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map((p) => (
            <Button
              key={p.handle}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setHandle(p.handle);
                setBeat(p.beat);
                run(p.handle, p.beat);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 desk:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (handle.trim() && beat.trim()) run(handle.trim().replace(/^@/, ""), beat.trim());
          }}
        >
          <Input
            className="desk:w-44"
            placeholder="X handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={busy}
          />
          <Input
            placeholder="Beat, in one sentence"
            value={beat}
            onChange={(e) => setBeat(e.target.value)}
            disabled={busy}
          />
          {busy ? (
            <Button type="button" variant="secondary" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit">Build</Button>
          )}
        </form>
        {busy && statusPart?.type === "data-status" && (
          <Shimmer className="text-muted-foreground text-sm">{statusPart.data.message}</Shimmer>
        )}
      </header>

      <Conversation className="rounded-md border">
        <ConversationContent>
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className="w-full">
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text")
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  if (part.type === "reasoning")
                    return (
                      <Reasoning key={key} isStreaming={busy && i === m.parts.length - 1}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  if (part.type === "data-status")
                    return (
                      <p key={key} className="font-mono text-muted-foreground text-xs">
                        {part.data.message}
                      </p>
                    );
                  if (isToolUIPart(part)) {
                    const seen = seenOf(part.output);
                    return (
                      <Tool key={key}>
                        {part.type === "dynamic-tool" ? (
                          <ToolHeader
                            type={part.type}
                            state={part.state}
                            toolName={part.toolName}
                          />
                        ) : (
                          <ToolHeader
                            type={part.type}
                            state={part.state}
                            title={getToolOrDynamicToolName(part)}
                          />
                        )}
                        <ToolContent>
                          <ToolInput input={part.input} />
                          <ToolOutput
                            output={
                              seen === null ? (
                                part.output
                              ) : (
                                <pre className="whitespace-pre-wrap p-3 font-mono text-xs">
                                  {seen}
                                </pre>
                              )
                            }
                            errorText={part.errorText}
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {result && <Result result={result} />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </main>
  );
}

function Result({ result }: { result: OnboardingData["result"] }) {
  const f = result.final;
  return (
    <section className="space-y-4 rounded-md border p-4 text-sm">
      <p className="font-mono text-muted-foreground text-xs">
        {result.turns} turns, ${result.costUsd.toFixed(3)}
        {result.error ? `, error: ${result.error}` : ""}
      </p>
      {f && (
        <>
          <p>{f.summary}</p>
          <div>
            <h2 className="font-heading font-semibold">Sources</h2>
            <ul className="mt-1 space-y-1">
              {f.picks.map((p) => (
                <li key={p.id}>
                  {p.band === "strong" ? "✓ " : ""}
                  <span className="font-medium">{p.name}</span>, {p.focus}
                  <span className="text-muted-foreground">
                    {" "}
                    ({p.direction ?? "overall"}, {(p.directionScore ?? p.score ?? 0).toFixed(2)})
                  </span>
                </li>
              ))}
              {f.added.map((a) => (
                <li key={a.url}>
                  + <span className="font-medium">{a.name}</span>, {a.focus}
                  <span className="text-muted-foreground">
                    {" "}
                    (added for {a.direction}, {a.url})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading font-semibold">X accounts, not monitored yet</h2>
            <ul className="mt-1 space-y-1">
              {f.accounts.map((a) => (
                <li key={a.handle ?? a.name}>
                  <span className="font-mono">{a.handle ?? a.name}</span>
                  <span className="text-muted-foreground">: {a.why}</span>
                </li>
              ))}
            </ul>
          </div>
          {f.uncovered.length > 0 && (
            <p className="text-muted-foreground">Uncovered: {f.uncovered.join(", ")}</p>
          )}
        </>
      )}
    </section>
  );
}
