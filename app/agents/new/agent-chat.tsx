"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  SearchCheckIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { OparaxMark } from "@/components/logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DeskAgentUIMessage } from "@/lib/agent/agent";
import type { DeskConfig } from "@/lib/agent/desk-config";
import { cn } from "@/lib/utils";
import { type SaveAgentResult, saveAgent } from "./actions";
import { SaveAgentCard } from "./save-agent-card";

/**
 * Chat over the repo's desk agent, laid out to mirror the AI Elements chatbot
 * example: one full-height Conversation (empty state lives inside it) with a
 * structured PromptInput (body + footer toolbar) pinned below. Talks to
 * `/api/chat` via `useChat`; one chat session per mount. The conversation
 * itself is ephemeral — the desk persists only through the Save card's
 * server action (insert first, then approve the tool call).
 */
export function AgentChat({
  onDirtyChange,
}: {
  /** Fired whenever the conversation gains/loses content, so a parent can guard
   *  unsaved progress. Additive only — does not alter the send wiring. */
  readonly onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  const { messages, sendMessage, status, error, stop, id, addToolApprovalResponse } =
    useChat<DeskAgentUIMessage>({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });
  const router = useRouter();
  const isBusy = status === "submitted" || status === "streaming";

  // The save_agent approval pause: the reporter's Save inserts the desk (as
  // themselves) via the server action FIRST, then approves this tool call and
  // navigates; "Not yet" denies. `saved` gates the parent dirty guard so it
  // drops before we navigate.
  const [saveState, setSaveState] = useState<{
    saving: boolean;
    saved: boolean;
    error: string | null;
  }>({ saving: false, saved: false, error: null });

  // While a Save card is pending the turn is parked — and the agent resolves
  // typed text against the approval first, so a plain "yes" would approve
  // save_agent WITHOUT the insert (the model would believe in a desk that was
  // never persisted). The card's buttons are the only safe affordance; the
  // composer locks until it's answered.
  const hasPendingSave = messages.some((message) =>
    message.parts.some(
      (part) => part.type === "tool-save_agent" && part.state === "approval-requested",
    ),
  );

  // Report dirtiness (unsaved conversation) to an optional parent guard.
  // Observation only — the send wiring below is untouched.
  const messageCount = messages.length;
  useEffect(() => {
    onDirtyChange?.(messageCount > 0 && !saveState.saved);
  }, [messageCount, saveState.saved, onDirtyChange]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || isBusy || hasPendingSave) return;

    await sendMessage({ text });
  };

  const handleSave = async (config: DeskConfig, approvalId: string) => {
    if (saveState.saving || saveState.saved) return; // a second insert would duplicate the desk
    setSaveState({ saving: true, saved: false, error: null });

    let result: SaveAgentResult;
    try {
      result = await saveAgent({
        config,
        sessionId: id ?? null,
        transcript: messages,
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
    // then approve the tool call so execute() runs as the model's proof of the
    // save. The approve is best-effort — if it fails, the parked session just
    // expires while the reporter lands on their saved desk.
    setSaveState({ saving: false, saved: true, error: null });
    try {
      addToolApprovalResponse({ id: approvalId, approved: true });
    } catch {
      // Desk already persisted; nothing to recover.
    }
    router.push(`/agents/${result.id}`);
  };

  const handleDeny = async (approvalId: string) => {
    // Also clears any stale save error so the model's next card mounts clean.
    setSaveState({ saving: false, saved: false, error: null });
    try {
      addToolApprovalResponse({ id: approvalId, approved: false });
    } catch {
      setSaveState({ saving: false, saved: false, error: "Couldn't send that — try again." });
    }
  };

  const save: SaveHandlers = {
    saving: saveState.saving,
    error: saveState.error,
    onSave: handleSave,
    onDeny: handleDeny,
  };

  const isEmpty = messages.length === 0;

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
              {/* Single welcome block (replaces the old starter-prompt chips) — phrased as Oparax
                  greeting the reporter AND stating everything it needs, so the reporter can brief
                  it all in one message. Mirrors the agent's own first-turn ask (see desk-agent.md
                  "Open by introducing the desk") so the chat can pick up from what's given. */}
              <div className="mt-3 max-w-lg space-y-3 rounded-lg border bg-card/40 p-4 text-left text-muted-foreground text-sm leading-relaxed">
                <p>
                  Hey, I&apos;m <span className="font-medium text-foreground">Oparax</span> — your
                  AI news desk. Tell me your beat and I&apos;ll watch it across X, gather what
                  breaks into distinct news items with every source cited, and draft posts in your
                  voice.
                </p>
                <p>
                  Here&apos;s what I&apos;ll need to set up your desk — send it all in one go, or
                  we&apos;ll go piece by piece:
                </p>
                <ul className="space-y-1.5">
                  <li>
                    <span className="font-medium text-foreground">Beat</span> — what to track, and
                    what counts as a story to you
                  </li>
                  <li>
                    <span className="font-medium text-foreground">X accounts</span> — up to 20
                    handles to watch
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Draft voice</span> — how you want
                    posts to sound
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Scan frequency</span> — how often
                    I should check for updates
                  </li>
                </ul>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message) => (
                <AgentMessage key={message.id} message={message} save={save} />
              ))}
              {status === "submitted" ? (
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

      {error ? (
        <p className="w-full shrink-0 px-1 pb-2 text-sm text-destructive">
          Request failed: {error.message}
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
            <PromptInputSubmit disabled={hasPendingSave} onStop={stop} status={status} />
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
};

function AgentMessage({
  message,
  save,
}: {
  readonly message: DeskAgentUIMessage;
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

// Stable key for a reasoning/text part. AI SDK message parts only ever append
// (never reorder or splice mid-stream), so a positional key is safe here — the
// helper keeps that index out of the JSX so it reads as intentional, not a slip.
function partKey(prefix: string, index: number): string {
  return `${prefix}:${index}`;
}

// One message part, rendered in document order with the stock ai-elements kit.
// One deliberate deviation: the reporter's own text shows exactly as
// typed/pasted (markdown would collapse newlines).
function MessagePart({
  part,
  role,
  save,
}: {
  readonly part: DeskAgentUIMessage["parts"][number];
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
      // Collapsed by default (`defaultOpen={false}` also suppresses the stock
      // auto-open-while-streaming) — the reporter sees a quiet "Thinking…" trigger
      // and expands it only if they want the chain of thought, never a live wall
      // of streamed reasoning.
      return (
        <Reasoning defaultOpen={false} isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "tool-save_agent": {
      // A denial the reporter never clicked is the approval policy's (a
      // scan frequency that violates the rate rail) — a model-facing exchange,
      // nothing for the reporter to act on. v7 sets approval.isAutomatic for
      // exactly this case, so it's the discriminator (render nothing for an
      // automatic/policy deny, the card otherwise).
      const denied =
        (part.state === "approval-responded" || part.state === "output-denied") &&
        part.approval?.approved === false;
      if (denied && part.approval?.isAutomatic) {
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
    case "tool-oparax_x_search":
      return <SearchDisclosure part={part} />;
    default:
      return null;
  }
}

// The X search, rendered as a reasoning-style disclosure instead of the stock boxed Tool card:
// same indent and trigger idiom as <Reasoning> (a muted row with an icon, a label, and a chevron),
// so a scan reads as one of the agent's quiet inline steps, not a separate widget. Collapsed by
// default; expanding reveals the drafted calls (ToolInput) and the raw result (ToolOutput). The
// icon + label track the tool state: a pulsing magnifier + "Searching X" shimmer while it runs,
// then a settled "Searched X" (or a failure) once it lands.
function SearchDisclosure({
  part,
}: {
  readonly part: Extract<DeskAgentUIMessage["parts"][number], { type: "tool-oparax_x_search" }>;
}) {
  const [open, setOpen] = useState(false);
  const running = part.state === "input-streaming" || part.state === "input-available";
  const errored = part.state === "output-error";

  return (
    <Collapsible className="not-prose mb-4" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
        {running ? (
          <SearchIcon className="size-4 animate-pulse" />
        ) : errored ? (
          <SearchXIcon className="size-4 text-destructive" />
        ) : (
          <SearchCheckIcon className="size-4" />
        )}
        {running ? (
          <Shimmer duration={1}>Searching X</Shimmer>
        ) : (
          <span>{errored ? "X search failed" : "Searched X"}</span>
        )}
        <ChevronDownIcon
          className={cn("size-4 transition-transform", open ? "rotate-180" : "rotate-0")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4 text-sm data-[state=closed]:animate-out data-[state=open]:animate-in">
        <ToolInput input={part.input} />
        <ToolOutput errorText={part.errorText} output={part.output} />
      </CollapsibleContent>
    </Collapsible>
  );
}
