"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useEveAgent } from "eve/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import type { DeskConfig } from "@/eve/agent/lib/desk-config";
import { type SaveAgentResult, saveAgent } from "./actions";
import { SaveAgentCard } from "./save-agent-card";

/**
 * Chat over the repo's eve agent, laid out to mirror the AI Elements chatbot
 * example: one full-height Conversation (empty state lives inside it) with a
 * structured PromptInput (body + footer toolbar) pinned below. Talks to the
 * same-origin /eve/v1/* routes mounted by withEve(); one session per mount.
 * The conversation itself is ephemeral — the desk persists only through the
 * Save card's server action (insert first, then approve the eve call).
 */
export function AgentChat({
  onDirtyChange,
}: {
  /** Fired whenever the conversation gains/loses content, so a parent can guard
   *  unsaved progress. Additive only — does not alter the eve send wiring. */
  readonly onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  const agent = useEveAgent();
  const router = useRouter();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  // The save_agent approval pause: the reporter's Save inserts the desk (as
  // themselves) via the server action FIRST, then approves this eve call and
  // navigates; "Not yet" denies. `saved` gates the parent dirty guard so it
  // drops before we navigate.
  const [saveState, setSaveState] = useState<{
    saving: boolean;
    saved: boolean;
    error: string | null;
  }>({ saving: false, saved: false, error: null });

  // Approval ids the reporter denied by clicking "Not yet". eve never marks
  // policy auto-denials client-side (approval.isAutomatic stays unset in
  // 0.22.1's reducer), so this set is the only way to tell a reporter's deny
  // (render "Not saved") from the policy's (render nothing). A ref, not
  // state: the stream event that answers the approval re-renders anyway.
  const userDenied = useRef(new Set<string>());

  // While a Save card is pending the turn is parked — and eve resolves typed
  // text against the approval's options first, so a plain "yes" would approve
  // save_agent WITHOUT the insert (the model would believe in a desk that was
  // never persisted). The card's buttons are the only safe affordance; the
  // composer locks until it's answered.
  const hasPendingSave = agent.data.messages.some((message) =>
    message.parts.some(
      (part) =>
        part.type === "dynamic-tool" &&
        part.toolName === "save_agent" &&
        part.state === "approval-requested",
    ),
  );

  // Report dirtiness (unsaved conversation) to an optional parent guard.
  // Observation only — the eve send wiring below is untouched.
  const messageCount = agent.data.messages.length;
  useEffect(() => {
    onDirtyChange?.(messageCount > 0 && !saveState.saved);
  }, [messageCount, saveState.saved, onDirtyChange]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || isBusy || hasPendingSave) return;

    await agent.send({ message: text });
  };

  const handleSave = async (config: DeskConfig, approvalId: string) => {
    if (saveState.saving || saveState.saved) return; // a second insert would duplicate the desk
    setSaveState({ saving: true, saved: false, error: null });

    let result: SaveAgentResult;
    try {
      result = await saveAgent({
        config,
        sessionId: agent.session?.sessionId ?? null,
        transcript: agent.data.messages,
      });
    } catch {
      // Transport failure — the action never completed; keep the card retryable.
      setSaveState({
        saving: false,
        saved: false,
        error: "Could not reach the server — check your connection and try again.",
      });
      return;
    }
    if (result.error !== undefined) {
      // The row was not created — leave the approval pending so Save is retryable.
      setSaveState({ saving: false, saved: false, error: result.error });
      return;
    }
    // Row created: the desk exists whatever happens next, so mark saved (drops
    // the dirty guard, and Save can never re-enable into a duplicate insert),
    // then approve the eve call so execute() runs as the model's proof of the
    // save. The approve is best-effort — if it fails, the parked session just
    // expires while the reporter lands on their saved desk.
    setSaveState({ saving: false, saved: true, error: null });
    try {
      await agent.send({ inputResponses: [{ requestId: approvalId, optionId: "approve" }] });
    } catch {
      // Desk already persisted; nothing to recover.
    }
    router.push(`/agents/${result.id}`);
  };

  const handleDeny = async (approvalId: string) => {
    userDenied.current.add(approvalId);
    // Also clears any stale save error so the model's next card mounts clean.
    setSaveState({ saving: false, saved: false, error: null });
    try {
      await agent.send({ inputResponses: [{ requestId: approvalId, optionId: "deny" }] });
    } catch {
      userDenied.current.delete(approvalId);
      setSaveState({ saving: false, saved: false, error: "Couldn't send that — try again." });
    }
  };

  const save: SaveHandlers = {
    saving: saveState.saving,
    error: saveState.error,
    onSave: handleSave,
    onDeny: handleDeny,
    isUserDenied: (approvalId) => userDenied.current.has(approvalId),
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
                  AI news desk. I can watch up to 20 X accounts on your beat, gather what they
                  publish into distinct news items with every source cited, and draft posts in your
                  voice, sized for your account.
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
                <AgentMessage key={message.id} message={message} save={save} />
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
              disabled={isBusy || hasPendingSave}
              placeholder={
                hasPendingSave
                  ? "Answer the Save card above to continue…"
                  : "Describe the beat your agent should cover…"
              }
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              disabled={hasPendingSave}
              onStop={agent.stop}
              status={agent.status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

// The save flow the chat threads down to the one save_agent part. Bundled so
// AgentMessage/MessagePart (both module-level) can forward it without a wide
// prop list; the approvalId is bound where the part is rendered.
type SaveHandlers = {
  readonly saving: boolean;
  readonly error: string | null;
  readonly onSave: (config: DeskConfig, approvalId: string) => void;
  readonly onDeny: (approvalId: string) => void;
  /** Did the reporter (not the approval policy) deny this approval id? */
  readonly isUserDenied: (approvalId: string) => boolean;
};

function AgentMessage({
  message,
  save,
}: {
  readonly message: EveMessage;
  readonly save: SaveHandlers;
}) {
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
          <MessagePart
            key={partKey(part.type, index)}
            part={part}
            role={message.role}
            save={save}
          />
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
function MessagePart({
  part,
  role,
  save,
}: {
  readonly part: EveMessagePart;
  readonly role: string;
  readonly save: SaveHandlers;
}) {
  switch (part.type) {
    case "text":
      if (role === "user") {
        return <div className="whitespace-pre-wrap break-words text-sm">{part.text}</div>;
      }
      return (
        // caret only WHILE streaming: streamdown keeps the caret's ::after class
        // (with a dangling CSS var) on finished messages, which can materialize
        // as a stray trailing glyph — no caret prop at rest, no pseudo-element.
        <MessageResponse
          caret={part.state === "streaming" ? "block" : undefined}
          isAnimating={part.state === "streaming"}
        >
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
      if (part.toolName === "save_agent") {
        // A denial the reporter never clicked is the approval policy's (a
        // cadence that slipped past validate_cadence) — a model-facing
        // exchange, nothing for the reporter to act on. eve 0.22.1 never sets
        // approval.isAutomatic client-side, so our own deny bookkeeping is the
        // only reliable discriminator.
        const denied =
          (part.state === "approval-responded" || part.state === "output-denied") &&
          part.approval?.approved === false;
        if (denied && !(part.approval && save.isUserDenied(part.approval.id))) {
          return null;
        }
        return (
          <SaveAgentCard
            error={save.error}
            onDeny={() => part.approval && save.onDeny(part.approval.id)}
            onSave={(config) => part.approval && save.onSave(config, part.approval.id)}
            part={part}
            saving={save.saving}
          />
        );
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
