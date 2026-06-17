"use client";

// E3 — Chat-first create surface (Phase 2 shell rebuild).
// Ties together: useChat (AI SDK v6), AgentConfig state, ChatMessageRow,
// ConfigForm for the form tab, and the floating composer.
// All wiring (deepMerge, extractRunScanOutput, onToolCall, handleSave,
// handleDraftChange, scanFingerprintRef, isStreaming, ConfigForm form tab)
// is preserved verbatim.
//
// Phase 5: chat-session persistence + resume (chat_sessions table).

import { useChat } from "@ai-sdk/react";
import type { DynamicToolUIPart, UIMessage } from "ai";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startXConnect } from "@/lib/x/link-identity";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import type { AgentConfig } from "@/lib/chat/config";
import { DEFAULT_CONFIG } from "@/lib/chat/config";
import type { PreviewStory, ScanMetrics } from "@/lib/scan/types";
import { ChatIcon, FormIcon, PlusGlyph, SendGlyph } from "./chat-glyphs";
import { ChatMessageRow, ThinkingRow } from "./chat-message-row";
import { ConfigForm } from "./config-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentSession {
  sessionId: string;
  title: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Relative-time helper (inline, no dependency)
// ---------------------------------------------------------------------------
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ---------------------------------------------------------------------------
// Deep-merge helper for AgentConfig patches from setAgentConfig tool
// ---------------------------------------------------------------------------
function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result = {
    ...base,
  };
  for (const key of Object.keys(patch)) {
    const pVal = patch[key];
    const bVal = base[key];
    if (
      pVal !== null &&
      typeof pVal === "object" &&
      !Array.isArray(pVal) &&
      bVal !== null &&
      typeof bVal === "object" &&
      !Array.isArray(bVal)
    ) {
      result[key] = deepMerge(bVal as Record<string, unknown>, pVal as Record<string, unknown>);
    } else if (pVal !== undefined) {
      result[key] = pVal;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Reconstruct AgentConfig from a resumed session's messages by replaying the
// setAgentConfig tool inputs. Resumed sessions don't re-fire onToolCall, so the
// config would otherwise start empty and saving a restored scan would fail or
// save stale settings.
// ---------------------------------------------------------------------------
function configFromMessages(messages: UIMessage[]): AgentConfig {
  let acc: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      const isSetConfig =
        part.type === "tool-setAgentConfig" ||
        (part.type === "dynamic-tool" && (part as DynamicToolUIPart).toolName === "setAgentConfig");
      if (isSetConfig && "input" in part && part.input) {
        acc = deepMerge(acc, part.input as Record<string, unknown>);
      }
    }
  }
  return acc as unknown as AgentConfig;
}

// ---------------------------------------------------------------------------
// runScan output shape
// ---------------------------------------------------------------------------
interface RunScanOutput {
  stories: PreviewStory[];
  metrics?: ScanMetrics | null;
}

// ---------------------------------------------------------------------------
// Extract the latest runScan result from the message list.
// The AI SDK v6 tool part uses `toolName` / `state` / `output` directly
// (no nested `toolInvocation` wrapper).
// ---------------------------------------------------------------------------
function extractRunScanOutput(messages: UIMessage[]): RunScanOutput | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      // DynamicToolUIPart has type that starts with "tool-" OR is "dynamic-tool"
      if (
        (part.type === "dynamic-tool" ||
          (typeof part.type === "string" && part.type.startsWith("tool-"))) &&
        "toolName" in part &&
        (part as DynamicToolUIPart).toolName === "runScan" &&
        "state" in part &&
        (part as DynamicToolUIPart).state === "output-available" &&
        "output" in part
      ) {
        const r = (part as DynamicToolUIPart).output as RunScanOutput;
        return {
          stories: r?.stories ?? [],
          metrics: r?.metrics ?? null,
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Greeting message — used for fresh sessions
// ---------------------------------------------------------------------------
const GREETING_MESSAGE: UIMessage = {
  id: "greeting",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hi, I'm Oparax. I'll set up a news agent that watches your beat and drafts posts in your voice. What should I keep an eye on?",
    },
  ],
};

// ---------------------------------------------------------------------------
// AgentChat
// ---------------------------------------------------------------------------
type TabValue = "chat" | "form";

export function AgentChat({
  xConnected,
  userAvatarUrl,
  initialMessages,
  sessionId: sessionIdProp,
  recentSessions = [],
}: {
  xConnected: boolean;
  userAvatarUrl?: string | null;
  initialMessages?: UIMessage[];
  sessionId?: string;
  recentSessions?: RecentSession[];
}) {
  const router = useRouter();

  // Stable session id: prefer the resumed-session prop, else generate once on mount.
  const sessionIdRef = useRef<string>(
    sessionIdProp ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)),
  );

  const [config, setConfig] = useState<AgentConfig>(() =>
    initialMessages && initialMessages.length > 0
      ? configFromMessages(initialMessages)
      : DEFAULT_CONFIG,
  );
  const [activeTab, setActiveTab] = useState<TabValue>("chat");
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");

  // Recent sessions dropdown state
  const [recentOpen, setRecentOpen] = useState(false);
  const recentBtnRef = useRef<HTMLButtonElement>(null);
  const recentMenuRef = useRef<HTMLDivElement>(null);

  // Close recent dropdown on outside click
  useEffect(() => {
    if (!recentOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        recentBtnRef.current?.contains(e.target as Node) ||
        recentMenuRef.current?.contains(e.target as Node)
      )
        return;
      setRecentOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [recentOpen]);

  // Controlled draft edits indexed by dedupeKey
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});

  // Determine initial seed messages.
  // If a resumed session has messages (length > 0), use those. Otherwise use the greeting.
  const seedMessages: UIMessage[] =
    initialMessages && initialMessages.length > 0 ? initialMessages : [GREETING_MESSAGE];

  // ---------------------------------------------------------------------------
  // useChat — AI SDK v6 React binding
  // `addToolOutput` is the v6 name; `addToolResult` is the deprecated alias.
  // `onToolCall` must be synchronous — we do NOT await inside it.
  // ---------------------------------------------------------------------------
  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agents/chat",
      body: { sessionId: sessionIdRef.current },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: seedMessages,

    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "setAgentConfig") {
        setConfig(
          (prev) =>
            deepMerge(
              prev as Record<string, unknown>,
              toolCall.input as Record<string, unknown>,
            ) as unknown as AgentConfig,
        );
        // addToolOutput is the v6 client-side tool result setter.
        // Cast needed: default UIMessage has no typed tools, so TOOL resolves to never.
        (addToolOutput as (arg: { toolCallId: string; tool: string; output: unknown }) => void)({
          toolCallId: toolCall.toolCallId,
          tool: "setAgentConfig",
          output: {
            ok: true,
          },
        });
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Chat-session persistence
  // Save after each completed turn (status → "ready") when messages changed.
  // De-duped by tracking last-saved message count in a ref.
  // ---------------------------------------------------------------------------
  const lastSavedLengthRef = useRef<number>(seedMessages.length);

  useEffect(() => {
    // Only save when idle, there are more than just the seed (greeting or resumed),
    // and something new was added since the last save.
    if (status !== "ready") return;
    if (messages.length <= 1) return; // only greeting — nothing to persist
    if (messages.length === lastSavedLengthRef.current) return; // no change

    lastSavedLengthRef.current = messages.length;

    // Fire-and-forget — never throw into the chat
    fetch("/api/agents/chat-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        messages,
      }),
    }).catch((err: unknown) => {
      console.warn("chat-session save failed", err);
    });
  }, [status, messages]);

  // ---------------------------------------------------------------------------
  // Derived: latest runScan result from messages
  // ---------------------------------------------------------------------------
  const scanResult = useMemo(() => extractRunScanOutput(messages), [messages]);

  // Clear stale draft edits and selection when a NEW scan result arrives (different story set).
  // Keyed by a fingerprint of the current scan: first dedupeKey + total count.
  const scanFingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    if (!scanResult || scanResult.stories.length === 0) return;
    const fingerprint = `${scanResult.stories[0]?.dedupeKey ?? ""}:${scanResult.stories.length}`;
    if (scanFingerprintRef.current !== null && scanFingerprintRef.current !== fingerprint) {
      setDraftEdits({});
    }
    scanFingerprintRef.current = fingerprint;
  }, [scanResult]);

  // ---------------------------------------------------------------------------
  // Auto-scroll to bottom on new messages / streaming
  // ---------------------------------------------------------------------------
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  // ---------------------------------------------------------------------------
  // handleSave
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!scanResult) {
      toast.error("No scan results to save. Run a scan first.");
      return;
    }

    const storiesWithEdits: PreviewStory[] = scanResult.stories.map((s) => ({
      ...s,
      draft: draftEdits[s.dedupeKey] ?? s.draft,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/agents/save-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config,
          stories: storiesWithEdits,
          metrics: scanResult.metrics,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(json.error ?? "Failed to save agent.");
        return;
      }

      const { id } = (await res.json()) as {
        id: string;
      };
      router.push(`/dashboard/agents/${id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [config, draftEdits, router, scanResult]);

  const handleDraftChange = useCallback((dedupeKey: string, text: string) => {
    setDraftEdits((prev) => ({
      ...prev,
      [dedupeKey]: text,
    }));
  }, []);

  // Connect X mid-chat: force-save the session first so the conversation survives
  // the OAuth redirect, then return to THIS session (?session=) once connected.
  const handleConnectX = useCallback(async () => {
    try {
      await fetch("/api/agents/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, messages }),
      });
    } catch {
      // Non-blocking — the save effect will retry on the next idle turn.
    }
    startXConnect(`/dashboard/agents/new?session=${sessionIdRef.current}`).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not start X connection.");
    });
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";

  // ---------------------------------------------------------------------------
  // Shared chat content
  // ---------------------------------------------------------------------------
  const sharedAddToolOutput = addToolOutput as (arg: {
    toolCallId: string;
    tool: string;
    output: unknown;
  }) => void;

  const messageList = (
    <>
      {messages.map((message, index) => (
        <ChatMessageRow
          key={message.id}
          message={message}
          userName="You"
          userAvatarUrl={userAvatarUrl}
          isStreaming={isStreaming}
          isLast={index === messages.length - 1}
          xConnected={xConnected}
          draftEdits={draftEdits}
          onDraftChange={handleDraftChange}
          addToolOutput={sharedAddToolOutput}
          sendMessage={sendMessage}
        />
      ))}
      {/* Streaming indicator — show when streaming and last message is from user */}
      {isStreaming && messages.at(-1)?.role === "user" && <ThinkingRow />}
      {/* API error display */}
      {error && <div className="agent-chat-error">{error.message}</div>}
      {/* Auto-scroll anchor — always at bottom of message list */}
      <div ref={scrollAnchorRef} aria-hidden="true" />
    </>
  );

  // Posting happens per-item on the agent page after saving (no bulk-post in the
  // create flow yet), so the only honest create-flow action is Save agent.
  const actionBar = scanResult && scanResult.stories.length > 0 && (
    <div className="agent-actionbar-wrap">
      <div className="agent-actionbar">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Spinner className="size-4" /> : "Save agent"}
        </button>
      </div>
    </div>
  );

  const composer = (
    <div className="agent-composer-wrap">
      <form
        className="agent-composer"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || isStreaming) return;
          sendMessage({ text: t });
          setText("");
        }}
      >
        <textarea
          className="agent-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const t = text.trim();
              if (!t || isStreaming) return;
              sendMessage({ text: t });
              setText("");
            }
          }}
          placeholder="Message Oparax…"
          rows={1}
          disabled={isStreaming}
        />
        <div className="agent-composer-actions">
          <button
            type="button"
            className="agent-composer-plus"
            disabled
            aria-label="Add (coming soon)"
          >
            <PlusGlyph />
          </button>
          <button
            type="submit"
            className="agent-composer-send"
            disabled={isStreaming || !text.trim()}
            aria-label="Send"
          >
            {isStreaming ? <Spinner className="size-4" /> : <SendGlyph />}
          </button>
        </div>
      </form>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Recent sessions dropdown
  // ---------------------------------------------------------------------------
  const recentDropdown = (
    <div style={{ position: "relative" }}>
      <button
        ref={recentBtnRef}
        type="button"
        onClick={() => setRecentOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 11px",
          border: "1px solid var(--line)",
          borderRadius: 7,
          background: recentOpen ? "var(--inset)" : "transparent",
          color: "var(--faint)",
          font: "400 0.8125rem/1 var(--font-sans)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        aria-label="Recent conversations"
        aria-expanded={recentOpen}
        aria-haspopup="menu"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M6.5 3.5v3l2 1.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Recent
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transform: recentOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      {recentOpen && (
        <div
          ref={recentMenuRef}
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 240,
            maxWidth: 320,
            background: "oklch(0.18 0 0)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px oklch(0 0 0 / 0.5)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* New chat link */}
          <a
            href="/dashboard/agents/new"
            role="menuitem"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              color: "var(--fg)",
              font: "500 0.8125rem/1.3 var(--font-sans)",
              textDecoration: "none",
              borderBottom: "1px solid var(--line)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--inset)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 1v10M1 6h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New chat
          </a>

          {/* Session list (or empty state) */}
          {recentSessions.length === 0 ? (
            <div
              style={{
                padding: "10px 14px",
                color: "var(--faint)",
                font: "400 0.8125rem/1.4 var(--font-sans)",
              }}
            >
              No saved conversations yet. They appear here after your first reply.
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {recentSessions.map((s) => (
                <a
                  key={s.sessionId}
                  href={`/dashboard/agents/new?session=${encodeURIComponent(s.sessionId)}`}
                  role="menuitem"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 14px",
                    color: "var(--fg)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "var(--inset)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }}
                  onClick={() => setRecentOpen(false)}
                >
                  <span
                    style={{
                      font: "400 0.8125rem/1.3 var(--font-sans)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      font: "400 0.75rem/1 var(--font-sans)",
                      color: "var(--faint)",
                      flexShrink: 0,
                    }}
                  >
                    {relativeTime(s.updatedAt)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="agent-surface agent-surface-fullbleed">
      {/* Heading row: "New agent" + Recent dropdown + Chat/Form segmented toggle */}
      <div className="agent-head">
        <h1 className="agent-head-title">New agent</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {recentDropdown}
          <div className="agent-toggle" role="tablist" aria-label="Setup mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "chat"}
              className={`agent-toggle-btn${activeTab === "chat" ? " is-active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <ChatIcon /> Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "form"}
              className={`agent-toggle-btn${activeTab === "form" ? " is-active" : ""}`}
              onClick={() => setActiveTab("form")}
            >
              <FormIcon /> Form
            </button>
          </div>
        </div>
      </div>

      {/* Form view — unchanged */}
      {activeTab === "form" ? (
        <div
          style={{
            paddingTop: 16,
            overflowY: "auto",
          }}
        >
          <ConfigForm value={config} onChange={setConfig} />
        </div>
      ) : (
        /* Wide (sole) layout — single column, full-bleed bg */
        <div className="agent-wide">
          <div className="agent-chat-scroll">
            <div className="agent-chat-col">{messageList}</div>
            {actionBar}
            {!xConnected && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  maxWidth: 760,
                  margin: "0 auto 10px",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid oklch(0.6 0.19 262 / 0.25)",
                  background: "oklch(0.6 0.19 262 / 0.06)",
                }}
              >
                <span
                  style={{
                    color: "var(--faint)",
                    font: "400 0.8125rem/1.35 var(--font-sans)",
                  }}
                >
                  Connect your X account to post drafts and use your own posts as writing samples.
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleConnectX}
                  style={{ flexShrink: 0 }}
                >
                  Connect X
                </button>
              </div>
            )}
            {composer}
          </div>
        </div>
      )}
    </div>
  );
}
