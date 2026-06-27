"use client";

// Chat-first create surface — the iterate loop.
// Ties together: useChat (AI SDK v6), the live ConfigCard (derived from the transcript),
// ChatMessageRow (rich scan/draft results), guiding buttons (NL shortcuts via sendMessage),
// the floating composer, and chat-session persistence + resume (chat_sessions table).
//
// Config is DERIVED, not stored: it's replayed from the assistant's runScan + updateConfig
// + draft tool inputs (configFromMessages), so it survives session resume and updates live
// without a separate state setter. The reporter changes it by chatting; the form is gone
// (the ConfigCard is the legible view — full field editing is deferred to edit-by-chat).

import { useChat } from "@ai-sdk/react";
import type { DynamicToolUIPart, UIMessage } from "ai";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfigCard } from "@/components/agents/config-card";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Spinner } from "@/components/ui/spinner";
import type { AgentConfig } from "@/lib/chat/config";
import { DEFAULT_CONFIG } from "@/lib/chat/config";
import { isValidHandle, normalizeHandle } from "@/lib/scan/handles";
import type {
  DraftToolResult,
  PreviewStory,
  RawStory,
  ScanMetrics,
  ScanToolResult,
} from "@/lib/scan/types";
import { SendGlyph } from "./chat-glyphs";
import { ChatMessageRow, ThinkingRow } from "./chat-message-row";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentSession {
  sessionId: string;
  title: string;
  updatedAt: string;
}

// NL critiques the guiding buttons inject through the normal chat input. They are pure
// sendMessage shortcuts (no custom composer / streaming path) — the model routes each to
// the right tool: retrieval critiques → runScan, voice critiques → draft.
// Scan-phase tweaks (retrieval) and draft-phase tweaks (voice) — pure NL shortcuts injected
// through the normal chat input; the model routes each to runScan or draft.
const SCAN_PROMPTS = ["Cast a wider net", "Only confirmed news, less rumor", "Skip retweets"];
const DRAFT_PROMPTS = ["Make them punchier", "Drop the hashtags", "More formal"];

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
// Deep-merge helper for AgentConfig patches derived from tool inputs
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
// Tool-part identity + config derivation.
//
// Config is captured from THREE tool inputs: runScan (find), updateConfig (a config-only
// patch, no scan), and draft (the voice/examples). Replaying them in order reconstructs the
// live config — for the card, for Save, and after a session resume.
// ---------------------------------------------------------------------------
function isToolPartNamed(
  part: UIMessage["parts"][number],
  name: string,
): part is DynamicToolUIPart {
  return (
    part.type === `tool-${name}` ||
    (part.type === "dynamic-tool" && (part as DynamicToolUIPart).toolName === name)
  );
}

function normalizeHandles(value: unknown): string[] {
  return (Array.isArray(value) ? (value as string[]) : [])
    .map(normalizeHandle)
    .filter(isValidHandle);
}

// Copy the config scalars shared by all three tool inputs onto a patch. Empty strings don't
// clobber an existing value, and example tweets only override when non-empty — a tool's
// default [] (e.g. a voice-only re-draft) must not wipe the reporter's pasted examples.
function copyConfigScalars(input: Record<string, unknown>, patch: Record<string, unknown>): void {
  if (typeof input.name === "string" && input.name) patch.name = input.name;
  if (typeof input.scanningInstructions === "string" && input.scanningInstructions)
    patch.scanningInstructions = input.scanningInstructions;
  if (typeof input.draftingInstructions === "string" && input.draftingInstructions)
    patch.draftingInstructions = input.draftingInstructions;
  if (Array.isArray(input.exampleTweets) && input.exampleTweets.length > 0)
    patch.exampleTweets = input.exampleTweets;
}

// runScan input → config patch. PARTIAL: only fields present in the input are emitted, so a
// re-scan that omits sources doesn't clobber earlier updateConfig choices. D3: X-enabled comes
// from the explicit searchX flag (not handle count), so a handle-free X scan still saves search_x.
function runScanInputToConfigPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  copyConfigScalars(input, patch);
  const x: Record<string, unknown> = {};
  if (typeof input.searchX === "boolean") x.enabled = input.searchX;
  if (Array.isArray(input.handles)) x.handles = normalizeHandles(input.handles);
  const web: Record<string, unknown> = {};
  if (typeof input.searchWeb === "boolean") web.enabled = input.searchWeb;
  if (Array.isArray(input.preferredDomains)) web.preferredDomains = input.preferredDomains;
  const sources: Record<string, unknown> = {};
  if (Object.keys(x).length > 0) sources.x = x;
  if (Object.keys(web).length > 0) sources.web = web;
  if (Object.keys(sources).length > 0) patch.sources = sources;
  return patch;
}

// updateConfig input is already a partial AgentConfig shape — map it through, sanitizing
// handles. deepMerge folds partial sources (x/web) onto the running config.
function updateConfigInputToPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  copyConfigScalars(input, patch);
  const src = input.sources;
  if (src && typeof src === "object") {
    const s = src as Record<string, Record<string, unknown> | undefined>;
    const sources: Record<string, unknown> = {};
    if (s.x && typeof s.x === "object") {
      const x: Record<string, unknown> = {};
      if (typeof s.x.enabled === "boolean") x.enabled = s.x.enabled;
      if (Array.isArray(s.x.handles)) x.handles = normalizeHandles(s.x.handles);
      sources.x = x;
    }
    if (s.web && typeof s.web === "object") {
      const web: Record<string, unknown> = {};
      if (typeof s.web.enabled === "boolean") web.enabled = s.web.enabled;
      if (Array.isArray(s.web.preferredDomains)) web.preferredDomains = s.web.preferredDomains;
      sources.web = web;
    }
    if (Object.keys(sources).length > 0) patch.sources = sources;
  }
  return patch;
}

// draft input carries the voice the reporter is tuning.
function draftInputToPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  copyConfigScalars(input, patch);
  return patch;
}

function configFromMessages(messages: UIMessage[]): AgentConfig {
  let acc: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (!("input" in part) || !part.input) continue;
      const input = part.input as Record<string, unknown>;
      if (isToolPartNamed(part, "runScan")) {
        acc = deepMerge(acc, runScanInputToConfigPatch(input));
      } else if (isToolPartNamed(part, "updateConfig")) {
        acc = deepMerge(acc, updateConfigInputToPatch(input));
      } else if (isToolPartNamed(part, "draft")) {
        acc = deepMerge(acc, draftInputToPatch(input));
      }
    }
  }
  return acc as unknown as AgentConfig;
}

// ---------------------------------------------------------------------------
// Latest result: walk the transcript backward for the most recent SETTLED scan/draft part —
// INCLUDING an empty one. An empty re-scan must surface as an empty SCAN phase (so the
// widen-the-net pills show), not silently revert to the prior draft (which would let the user
// Save stale content). The KIND drives the phase: "scan" (items → tune retrieval) vs "draft"
// (posts → tune voice + Save). Counts can be 0; callers gate Save / "Draft these" on length.
// ---------------------------------------------------------------------------
type LatestResult =
  | { kind: "scan"; items: RawStory[]; metrics: ScanMetrics | null }
  | { kind: "draft"; stories: PreviewStory[]; metrics: ScanMetrics | null };

function partOutput(part: UIMessage["parts"][number]): unknown {
  return (part as DynamicToolUIPart).state === "output-available" && "output" in part
    ? (part as DynamicToolUIPart).output
    : undefined;
}

function extractLatest(messages: UIMessage[]): LatestResult | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      if (isToolPartNamed(part, "draft")) {
        const r = partOutput(part) as DraftToolResult | undefined;
        if (r) return { kind: "draft", stories: r.stories ?? [], metrics: r.metrics ?? null };
      } else if (isToolPartNamed(part, "runScan")) {
        const r = partOutput(part) as ScanToolResult | undefined;
        if (r) return { kind: "scan", items: r.items ?? [], metrics: r.metrics ?? null };
      }
    }
  }
  return null;
}

// True while a scan/draft tool is in flight on the last message. `extractLatest` reports the
// PREVIOUS settled result during a re-scan/re-draft, so the phase sidecar would otherwise show
// the old phase's controls (e.g. voice pills + Save mid re-scan). Suppress those controls until
// the new result settles and the phase is real again.
function hasRunningTool(messages: UIMessage[]): boolean {
  const last = messages.at(-1);
  return (
    last?.role === "assistant" &&
    last.parts.some((part) => {
      if (!isToolPartNamed(part, "runScan") && !isToolPartNamed(part, "draft")) return false;
      // "Running" means genuinely in flight — exclude BOTH terminal states (a settled
      // output-available result, and an output-error) so an errored tool can't pin the
      // sidecar hidden forever.
      const state = (part as DynamicToolUIPart).state;
      return state !== "output-available" && state !== "output-error";
    })
  );
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
      text: "Hi, I'm Oparax. I'll set up a news agent that watches your beat and drafts posts in your voice. What beat should I keep an eye on?",
    },
  ],
};

// ---------------------------------------------------------------------------
// AgentChat
// ---------------------------------------------------------------------------

export function AgentChat({
  userAvatarUrl,
  initialMessages,
  sessionId: sessionIdProp,
  recentSessions = [],
}: {
  // X is only needed to post (not in the create loop) — accepted for API parity, unused here.
  xConnected?: boolean;
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
  const seedMessages: UIMessage[] =
    initialMessages && initialMessages.length > 0 ? initialMessages : [GREETING_MESSAGE];

  // ---------------------------------------------------------------------------
  // useChat — AI SDK v6 React binding. Tools (runScan, draft, updateConfig) execute
  // server-side, so there are no client tools to resolve; config is derived from their
  // inputs (configFromMessages) instead.
  // ---------------------------------------------------------------------------
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agents/chat",
      body: { sessionId: sessionIdRef.current },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: seedMessages,
  });

  // ---------------------------------------------------------------------------
  // Chat-session persistence — save after each completed turn (status → "ready").
  // ---------------------------------------------------------------------------
  const lastSavedLengthRef = useRef<number>(seedMessages.length);

  useEffect(() => {
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
  // Derived: live config (the recipe) + the working set (latest results).
  // ---------------------------------------------------------------------------
  const config = useMemo(() => configFromMessages(messages), [messages]);
  const latest = useMemo(() => extractLatest(messages), [messages]);
  // Phase-derived: scan phase exposes items (tune retrieval + Draft these); draft phase exposes
  // the posts (tune voice + Save). workingDrafts is what Save persists.
  // Save persists workingDrafts — only a NON-EMPTY draft result qualifies, so an empty
  // re-scan (latest.kind === "scan") or an all-failed draft can't be saved as stale content.
  const workingDrafts = latest?.kind === "draft" && latest.stories.length > 0 ? latest : null;

  // Clear stale draft edits when the working set changes (re-scan or re-draft). The fingerprint
  // samples EVERY story (not just the first) so a re-draft that changes any post resets edits;
  // the prior block stays visible above in the transcript.
  const fingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    if (!latest) return;
    const fp =
      latest.kind === "draft"
        ? `draft:${latest.stories.map((s) => `${s.dedupeKey}:${s.draft}`).join("|")}`
        : `scan:${latest.items.map((i) => i.dedupeKey).join("|")}`;
    if (fingerprintRef.current !== null && fingerprintRef.current !== fp) {
      setDraftEdits({});
    }
    fingerprintRef.current = fp;
  }, [latest]);

  // ---------------------------------------------------------------------------
  // Auto-scroll to bottom on new messages / streaming
  // ---------------------------------------------------------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages/status are intentional triggers — the body only reads refs, but we must re-run whenever the transcript grows or streaming state flips.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom > 160) return;
    }
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  // ---------------------------------------------------------------------------
  // handleSave — persists the CONFIG (recipe) + the latest working set as the first run.
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!workingDrafts) {
      toast.error("No drafts to save yet. Draft your posts first.");
      return;
    }

    const storiesWithEdits: PreviewStory[] = workingDrafts.stories.map((s) => ({
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
          metrics: workingDrafts.metrics,
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
  }, [config, draftEdits, router, workingDrafts]);

  const handleDraftChange = useCallback((dedupeKey: string, value: string) => {
    setDraftEdits((prev) => ({
      ...prev,
      [dedupeKey]: value,
    }));
  }, []);

  const isStreaming = status === "submitted" || status === "streaming";

  const send = useCallback(
    (value: string) => {
      const t = value.trim();
      if (!t || isStreaming) return;
      sendMessage({ text: t });
    },
    [isStreaming, sendMessage],
  );

  // ---------------------------------------------------------------------------
  // Shared chat content
  // ---------------------------------------------------------------------------
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
          draftEdits={draftEdits}
          onDraftChange={handleDraftChange}
        />
      ))}
      {isStreaming && messages.at(-1)?.role === "user" && <ThinkingRow />}
      {error && <div className="agent-chat-error">{error.message}</div>}
      <div ref={scrollAnchorRef} aria-hidden="true" />
    </>
  );

  // A scan/draft is in flight → the phase is transitioning. Hide phase controls (and Save) so
  // the sidecar never shows the old phase's pills/Save over a result that's about to change; the
  // inline "Scanning…/Drafting…" pill in the transcript carries the progress. The ConfigCard
  // stays — it's derived live from tool inputs and is always accurate. "submitted" (the user
  // turn is sent but the assistant's tool part hasn't materialized yet) counts as transitioning
  // too, so the prior phase's controls don't flash between send and the tool going in-flight.
  const toolStreaming = isStreaming && (hasRunningTool(messages) || status === "submitted");
  const isScanPhase = latest?.kind === "scan" && !toolStreaming;
  const isDraftPhase = latest?.kind === "draft" && !toolStreaming;
  // "Draft these posts" only makes sense with items in hand; an empty scan shows the
  // widen-the-net pills but not the draft CTA.
  const hasScanItems = latest?.kind === "scan" && latest.items.length > 0;

  // Phase-aware sidecar. SCAN phase: retrieval tweaks + a primary "Draft these posts" to move
  // to the write phase. DRAFT phase: voice tweaks + a "Re-scan" escape + Save. The guiding
  // buttons are pure NL shortcuts (sendMessage) the model routes to runScan or draft.
  const sidecar = (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "4px 0 24px",
      }}
    >
      {isScanPhase && (
        <>
          <Suggestions>
            {SCAN_PROMPTS.map((label) => (
              <Suggestion key={label} suggestion={label} onClick={send} disabled={isStreaming} />
            ))}
          </Suggestions>
          {hasScanItems && (
            <div className="agent-actionbar">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isStreaming}
                onClick={() => send("These items look good — draft posts for them.")}
              >
                Draft these posts
              </button>
            </div>
          )}
        </>
      )}
      {isDraftPhase && (
        <Suggestions>
          {DRAFT_PROMPTS.map((label) => (
            <Suggestion key={label} suggestion={label} onClick={send} disabled={isStreaming} />
          ))}
          <Suggestion suggestion="Re-scan for the latest" onClick={send} disabled={isStreaming} />
        </Suggestions>
      )}
      <ConfigCard config={config} />
      {isDraftPhase && (
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
      )}
    </div>
  );

  const composer = (
    <div className="agent-composer-wrap">
      <form
        className="agent-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText("");
        }}
      >
        <textarea
          className="agent-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Guard isComposing: an IME confirm-Enter (and the first Enter after some
            // autofill/paste paths) reports key "Enter" but must not send.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(text);
              setText("");
            }
          }}
          placeholder="Message Oparax…"
          rows={1}
          disabled={isStreaming}
        />
        <div className="agent-composer-actions">
          <button
            type="submit"
            className="agent-composer-send"
            disabled={isStreaming || !text.trim()}
            aria-label="Send"
          >
            <SendGlyph />
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
    <div className="agent-surface">
      {/* Heading row: "New agent" + Recent dropdown */}
      <div className="agent-head">
        <h1 className="agent-head-title">New agent</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{recentDropdown}</div>
      </div>

      {/* Single-column chat layout */}
      <div className="agent-wide">
        <div className="agent-chat-scroll" ref={scrollContainerRef}>
          <div className="agent-chat-col">{messageList}</div>
          {sidecar}
          {composer}
        </div>
      </div>
    </div>
  );
}
