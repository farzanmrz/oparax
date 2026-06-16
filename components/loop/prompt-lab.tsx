"use client";

import { ChevronRight, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
// Imports
import { useEffect, useRef, useState } from "react";
import { HandleInput } from "@/components/handle-input";
import { XIcon } from "@/components/icons";
import { DEFAULT_DRAFTING_INSTRUCTIONS } from "@/lib/draft/defaults";
import { DEFAULT_HANDLES, DEFAULT_RUN_NAME, DEFAULT_SCAN_USER_PROMPT } from "@/lib/scan/defaults";
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles";
import type { PreviewStory, ScanMetrics, ScanStreamEvent } from "@/lib/scan/stream";
import { cn } from "@/lib/utils";

type ToolCallOutput = {
  id: string;
  name: string;
  input: string;
};

type HelpTopicName = "scan" | "draft";
type HelpTopic = HelpTopicName | null;
type SaveStatus = "idle" | "saving" | "saved" | "error";

const HELP_COPY: Record<
  HelpTopicName,
  {
    title: string;
    body: string;
  }
> = {
  scan: {
    title: "Scanning instructions",
    body: "Use this to define what the agent should monitor, how strict it should be about story quality, and which kinds of posts should be ignored during the scan.",
  },
  draft: {
    title: "Drafting instructions",
    body: "Use this to describe the voice, formatting, angle, and posting style the agent should apply when it turns each scanned story into an X-ready draft.",
  },
};
const UNSAVED_WARNING = "Your prompt lab changes will be lost if you leave this page.";

/**
 * Parse one NDJSON line into a scan event, or null if invalid.
 * @param line - one NDJSON line
 * @returns the parsed event, or null
 */
function parseScanEvent(line: string): ScanStreamEvent | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      typeof (
        parsed as {
          type: unknown;
        }
      ).type === "string"
    ) {
      return parsed as ScanStreamEvent;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Build a stable client-side key for one story in the current scan result.
 * @param story - the preview story
 * @param index - the story's current result index
 * @returns a key unique within the current scan
 */
function getStoryKey(story: PreviewStory, index: number): string {
  return `${story.dedupeKey}:${index}`;
}

/**
 * Format a scan cost for the status line.
 * @param costUsd - server-reported cost, or null when unavailable
 * @returns a compact cost label
 */
function formatScanCost(costUsd: number | null): string {
  return costUsd === null ? "Cost unavailable" : `Cost $${costUsd.toFixed(6)}`;
}

function getAgentFingerprint({
  handles,
  scanInstructions,
  draftingInstructions,
}: {
  handles: string[];
  scanInstructions: string;
  draftingInstructions: string;
}): string {
  return JSON.stringify({
    handles,
    scanInstructions,
    draftingInstructions,
  });
}

/**
 * Prompt-lab: prefilled operator inputs drive one agent run. The current API
 * still streams scan output; the UI is shaped for the combined scan+draft flow.
 * @returns the prompt-lab UI
 */
export function PromptLab() {
  // Router to navigate to the agents list after a successful save.
  const router = useRouter();

  // Operator inputs (prefilled, editable). System prompts are in code.
  const [name, setName] = useState(DEFAULT_RUN_NAME);
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES);
  const [scanUserPrompt, setScanUserPrompt] = useState(DEFAULT_SCAN_USER_PROMPT);
  const [draftingInstructions, setDraftingInstructions] = useState(DEFAULT_DRAFTING_INSTRUCTIONS);

  // Agent run state.
  const [scanStatus, setScanStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [reasoning, setReasoning] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallOutput[]>([]);
  const [scanCost, setScanCost] = useState<number | null>(null);
  const [scanMetrics, setScanMetrics] = useState<ScanMetrics | null>(null);
  const [stories, setStories] = useState<PreviewStory[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedStoryKeys, setSelectedStoryKeys] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);

  // Page interaction state.
  const [helpTopic, setHelpTopic] = useState<HelpTopic>(null);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastRunFingerprint, setLastRunFingerprint] = useState<string | null>(null);
  const runFingerprintRef = useRef("");
  const allowHistoryNavigationRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    allowHistoryNavigationRef.current = false;
    window.history.pushState(
      {
        promptLabUnsavedGuard: true,
      },
      "",
      window.location.href,
    );

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowHistoryNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target || target.download) return;

      const rawHref = target.getAttribute("href");
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:")
      ) {
        return;
      }

      const destination = new URL(target.href, window.location.href);
      const current = new URL(window.location.href);
      const isSamePage =
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search;
      if (isSamePage) return;

      if (!window.confirm(UNSAVED_WARNING)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      allowHistoryNavigationRef.current = true;
      setHasUnsavedChanges(false);
    }

    function handlePopState() {
      if (allowHistoryNavigationRef.current) return;

      if (window.confirm(UNSAVED_WARNING)) {
        allowHistoryNavigationRef.current = true;
        setHasUnsavedChanges(false);
        window.setTimeout(() => window.history.back(), 0);
        return;
      }

      window.history.pushState(
        {
          promptLabUnsavedGuard: true,
        },
        "",
        window.location.href,
      );
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [
    hasUnsavedChanges,
  ]);

  function markDirty() {
    setHasUnsavedChanges(true);
    setSaveError(null);
    setSaveStatus((status) => (status === "saving" ? status : "idle"));
  }

  function addHandle(handle: string) {
    markDirty();
    setHandles((prev) => [
      ...prev,
      handle,
    ]);
  }

  function removeHandle(index: number) {
    markDirty();
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleStory(story: PreviewStory, index: number) {
    const key = getStoryKey(story, index);
    setSelectedStoryKeys((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [
            ...prev,
            key,
          ],
    );
  }

  // Apply one stream event to scan state; returns true for terminal events.
  function applyScanEvent(event: ScanStreamEvent | null): boolean {
    if (!event) return false;
    switch (event.type) {
      case "reasoning_delta":
        setIsReasoningOpen(true);
        setReasoning((prev) => prev + event.text);
        return false;
      case "tool_call_started":
        setIsReasoningOpen(true);
        setIsToolsOpen(true);
        setToolCalls((prev) => [
          ...prev,
          {
            id: event.id,
            name: event.name,
            input: "",
          },
        ]);
        return false;
      case "tool_call_input_delta":
        setIsReasoningOpen(true);
        setIsToolsOpen(true);
        setToolCalls((prev) =>
          prev.some((toolCall) => toolCall.id === event.id)
            ? prev.map((toolCall) =>
                toolCall.id === event.id
                  ? {
                      ...toolCall,
                      input: toolCall.input + event.text,
                    }
                  : toolCall,
              )
            : [
                ...prev,
                {
                  id: event.id,
                  name: "tool_call",
                  input: event.text,
                },
              ],
        );
        return false;
      case "tool_call_completed":
        setToolCalls((prev) =>
          prev.some((toolCall) => toolCall.id === event.id)
            ? prev.map((toolCall) =>
                toolCall.id === event.id
                  ? {
                      ...toolCall,
                      input: event.input,
                    }
                  : toolCall,
              )
            : [
                ...prev,
                {
                  id: event.id,
                  name: "tool_call",
                  input: event.input,
                },
              ],
        );
        return false;
      case "persisted":
        return false;
      case "preview_complete":
        setStories(event.stories);
        setScanCost(event.metrics.costUsd);
        setScanMetrics(event.metrics);
        setScanStatus("done");
        setLastRunFingerprint(runFingerprintRef.current);
        return true;
      case "error":
        setScanError(event.message);
        setScanStatus("error");
        return true;
    }
  }

  // Run the agent from the current handles + scan/draft instructions.
  async function runAgent() {
    if (scanStatus === "running") return;

    const runFingerprint = getAgentFingerprint({
      handles,
      scanInstructions: scanUserPrompt,
      draftingInstructions,
    });
    if (lastRunFingerprint === runFingerprint) return;
    if (handles.length === 0) {
      setScanError("Add at least one handle to monitor.");
      return;
    }
    if (!name.trim()) {
      setNameError("Agent name is required.");
      return;
    }
    if (!scanUserPrompt.trim() || !draftingInstructions.trim()) {
      setScanError("Add scanning and drafting instructions before running.");
      return;
    }

    markDirty();
    runFingerprintRef.current = runFingerprint;
    setScanStatus("running");
    setIsReasoningOpen(true);
    setIsToolsOpen(false);
    setReasoning("");
    setToolCalls([]);
    setScanCost(null);
    setScanMetrics(null);
    setStories([]);
    setSelectedStoryKeys([]);
    setScanError(null);
    setNameError(null);

    try {
      const response = await fetch("/api/agents/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          handles,
          userPrompt: scanUserPrompt,
          draftingInstructions,
        }),
      });
      if (!response.ok) {
        const message = (await response.text()) || "Agent run failed.";
        if (response.status === 409) {
          setNameError(message);
          setScanStatus("idle");
          return;
        }
        throw new Error(message);
      }
      if (!response.body) {
        throw new Error("Agent run returned no stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pendingLine = "";
      let sawTerminalEvent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pendingLine += decoder.decode(value, {
          stream: true,
        });
        const lines = pendingLine.split("\n");
        pendingLine = lines.pop() ?? "";
        for (const line of lines) {
          if (applyScanEvent(parseScanEvent(line))) sawTerminalEvent = true;
        }
      }
      pendingLine += decoder.decode();
      if (pendingLine.trim() && applyScanEvent(parseScanEvent(pendingLine))) {
        sawTerminalEvent = true;
      }
      if (!sawTerminalEvent) {
        throw new Error("Agent run ended before returning output.");
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Agent run failed.");
      setScanStatus("error");
    }
  }

  async function saveAgent() {
    if (saveStatus === "saving") return;

    setSaveStatus("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/agents/save-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          handles,
          monitoringDescription: scanUserPrompt,
          draftingInstructions,
          stories,
          metrics: scanMetrics,
        }),
      });
      const data = (await response.json()) as {
        id?: string;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 409) {
          setNameError(data.error || "An agent with this name already exists.");
          setSaveStatus("idle");
          return;
        }
        throw new Error(data.error || "Failed to save agent.");
      }
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      router.push(data.id ? `/dashboard/agents/${data.id}` : "/dashboard/agents");
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  const storyEntries = stories.map((story, index) => ({
    story,
    index,
    key: getStoryKey(story, index),
  }));
  const selectedStorySet = new Set(selectedStoryKeys);
  const currentRunFingerprint = getAgentFingerprint({
    handles,
    scanInstructions: scanUserPrompt,
    draftingInstructions,
  });
  const hasRunAgent = lastRunFingerprint !== null;
  const isRunCurrent = hasRunAgent && lastRunFingerprint === currentRunFingerprint;
  const canRunAgent =
    scanStatus !== "running" &&
    handles.length > 0 &&
    name.trim().length > 0 &&
    !nameError &&
    scanUserPrompt.trim().length > 0 &&
    draftingInstructions.trim().length > 0 &&
    !isRunCurrent;
  const runButtonLabel = hasRunAgent ? "Rerun Agent" : "Run Agent";
  const canSaveAgent =
    scanStatus === "done" &&
    stories.length > 0 &&
    isRunCurrent &&
    name.trim().length > 0 &&
    !nameError &&
    handles.length > 0 &&
    saveStatus !== "saving" &&
    saveStatus !== "saved";
  const hasScanOutput =
    scanStatus === "running" || reasoning || toolCalls.length > 0 || scanStatus === "done";

  function renderHelpButton(topic: HelpTopicName) {
    const copy = HELP_COPY[topic];

    return (
      <button
        type="button"
        aria-label={`Show ${copy.title.toLowerCase()} help`}
        onClick={() => setHelpTopic(topic)}
        className="ws-help-btn"
      >
        <HelpCircle aria-hidden="true" size={16} />
      </button>
    );
  }

  function renderHelpDialog() {
    if (!helpTopic) return null;
    const copy = HELP_COPY[helpTopic];

    return (
      <div role="presentation" className="overlay open" onClick={() => setHelpTopic(null)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-lab-help-title"
          className="modal"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="modal-x"
            aria-label="Close"
            onClick={() => setHelpTopic(null)}
          >
            ×
          </button>
          <h2
            id="prompt-lab-help-title"
            style={{
              textAlign: "left",
            }}
          >
            {copy.title}
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              font: "400 0.9375rem/1.55 var(--font-sans)",
              color: "var(--muted)",
            }}
          >
            {copy.body}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{
              marginTop: 18,
            }}
            onClick={() => setHelpTopic(null)}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-create">
      <div className="desk-card">
        <div className="card-chrome">
          <XIcon width={14} height={14} />
          Oparax Agent
        </div>

        <div className="card-body">
          <div className="top-row">
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="prompt-lab-name">
                Agent name
              </label>
              <input
                id="prompt-lab-name"
                className={cn("ws-input", nameError && "invalid")}
                value={name}
                onChange={(event) => {
                  markDirty();
                  setNameError(null);
                  setName(event.target.value);
                }}
              />
              {nameError && <div className="ferr show">{nameError}</div>}
            </div>

            <div className="ffield-wrap">
              <span className="flabel">
                X accounts to monitor{" "}
                <span
                  style={{
                    color: "var(--faint)",
                    fontWeight: 400,
                  }}
                >
                  ({handles.length} of {MONITOR_MAX_HANDLES})
                </span>
              </span>
              <HandleInput
                handles={handles}
                maxHandles={MONITOR_MAX_HANDLES}
                showCount={false}
                onAdd={addHandle}
                onRemove={removeHandle}
              />
            </div>
          </div>

          <div className="ffield-row">
            <div className="ffield-wrap">
              <span className="flabel-row">
                <label className="flabel" htmlFor="prompt-lab-scanning-instructions">
                  Scanning instructions
                </label>
                {renderHelpButton("scan")}
              </span>
              <textarea
                id="prompt-lab-scanning-instructions"
                className="ws-textarea"
                value={scanUserPrompt}
                onChange={(event) => {
                  markDirty();
                  setScanUserPrompt(event.target.value);
                }}
                rows={8}
              />
            </div>

            <div className="ffield-wrap">
              <span className="flabel-row">
                <label className="flabel" htmlFor="prompt-lab-drafting-instructions">
                  Drafting instructions
                </label>
                {renderHelpButton("draft")}
              </span>
              <textarea
                id="prompt-lab-drafting-instructions"
                className="ws-textarea"
                value={draftingInstructions}
                onChange={(event) => {
                  markDirty();
                  setDraftingInstructions(event.target.value);
                }}
                rows={8}
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={runAgent}
              disabled={!canRunAgent && scanStatus !== "running"}
              className={cn(
                "btn",
                isRunCurrent ? "btn-secondary" : "btn-primary",
                scanStatus === "running" && "loading",
              )}
            >
              <span className="ld" />
              {scanStatus === "running" ? "Running" : runButtonLabel}
            </button>
          </div>

          {hasScanOutput && (
            <div className="ws-run">
              <button
                type="button"
                aria-expanded={isReasoningOpen}
                onClick={() => setIsReasoningOpen((open) => !open)}
                className="ws-run-head"
              >
                <span
                  aria-hidden="true"
                  className={cn("dot", scanStatus === "running" ? "blink" : "green")}
                />
                <span>
                  Reasoning
                  {scanStatus === "done" && (
                    <span className="ws-run-meta">
                      ({toolCalls.length} tool call
                      {toolCalls.length === 1 ? "" : "s"} · {formatScanCost(scanCost)} ·{" "}
                      {stories.length} item
                      {stories.length === 1 ? "" : "s"})
                    </span>
                  )}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  size={16}
                  className={cn("ws-run-chevron", isReasoningOpen && "open")}
                />
              </button>

              {isReasoningOpen && (
                <div className="ws-run-body">
                  {reasoning && <p className="ws-run-text">{reasoning}</p>}

                  {toolCalls.length > 0 && (
                    <div>
                      <button
                        type="button"
                        aria-expanded={isToolsOpen}
                        onClick={() => setIsToolsOpen((open) => !open)}
                        className="ws-run-head"
                        style={{
                          font: "600 0.8125rem/1 var(--font-sans)",
                        }}
                      >
                        <span>Calling tools: {toolCalls.length}</span>
                        <ChevronRight
                          aria-hidden="true"
                          size={15}
                          className={cn("ws-run-chevron", isToolsOpen && "open")}
                        />
                      </button>

                      {isToolsOpen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {toolCalls.map((toolCall) => (
                            <p key={toolCall.id} className="ws-tool">
                              <b>{toolCall.name}:</b> {toolCall.input || "Waiting for input."}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {stories.length > 0 && (
            <>
              <div className="draft-divider">
                <span className="chip">
                  <span className="dot blink" />
                  Drafted in your voice
                </span>
              </div>
              <p className="ws-results-note">
                Review each news item and its draft below. Save the agent to post or redraft on X.
              </p>

              <div className="ws-stories" aria-label="Agent results">
                {storyEntries.map(({ story, index, key }) => {
                  const isSelected = selectedStorySet.has(key);

                  return (
                    <div key={key} className="ws-story">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleStory(story, index)}
                        className={cn("ws-story-item", isSelected && "is-selected")}
                      >
                        <p>{story.title}</p>
                        <div className="ws-story-srcs">
                          {story.sourceUrls.length > 0 ? (
                            story.sourceUrls.map((url) => (
                              <span key={url}>
                                <b className="arr">↗</b>
                                {url}
                              </span>
                            ))
                          ) : (
                            <span
                              style={{
                                color: "var(--faint)",
                              }}
                            >
                              No source URLs returned.
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="xpost">
                        <p className="xpost-body">{story.draft}</p>
                        <div className="xpost-foot">
                          <XIcon width={15} height={15} fill="#FFFFFF" />
                          <span className="chars">Draft preview</span>
                          <span className="spacer" />
                          <button type="button" className="btn btn-secondary btn-sm" disabled>
                            Save agent to post
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {scanError && <div className="ferr show">{scanError}</div>}
        </div>
      </div>

      <div className="ws-save">
        <button
          type="button"
          onClick={saveAgent}
          disabled={!canSaveAgent && saveStatus !== "saving"}
          className={cn("btn btn-primary", saveStatus === "saving" && "loading")}
        >
          <span className="ld" />
          {saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : "Save Agent"}
        </button>
        {saveError && (
          <p
            className="ferr show"
            style={{
              margin: 0,
            }}
          >
            {saveError}
          </p>
        )}
      </div>

      {renderHelpDialog()}
    </div>
  );
}
