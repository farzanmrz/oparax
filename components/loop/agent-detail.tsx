"use client";

import { ChevronRight, Play, RefreshCw, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
// Imports
import { useEffect, useMemo, useState } from "react";
import { HandleInput } from "@/components/handle-input";
import { XIcon } from "@/components/icons";
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles";
import type { ScanMetrics, ScanStreamEvent } from "@/lib/scan/stream";
import { cn } from "@/lib/utils";

// Lazy-load the source tweet embed: it pulls in the whole react-tweet client
// runtime but only renders when a run exists, so defer it off the initial
// bundle. CompactTweet shows its own TweetSkeleton while loading.
const CompactTweet = dynamic(
  () => import("@/components/loop/compact-tweet").then((m) => m.CompactTweet),
  {
    ssr: false,
  },
);

type ToolCallOutput = {
  id: string;
  name: string;
  input: string;
};

export interface AgentDetailAgent {
  id: string;
  name: string;
  monitored_handles: string[];
  monitoring_description: string;
  drafting_instructions: string;
  status: "active" | "paused" | "inactive";
}

export interface AgentDetailItem {
  id: string;
  story_title: string;
  story_summary: string;
  source_urls: string[];
  primary_tweet_url: string;
  drafted_text: string;
  final_text: string | null;
  status: "drafted" | "posted" | "failed";
  x_tweet_url: string | null;
  error_message: string | null;
}

export interface AgentDetailRun {
  id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  cost_usd: number | null;
  x_search_count: number | null;
  item_count: number | null;
  error_message: string | null;
  input_drafting_instructions: string;
  items: AgentDetailItem[];
}

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

function formatCost(costUsd: number | null): string {
  return costUsd === null ? "Cost unavailable" : `$${costUsd.toFixed(6)}`;
}

// react-tweet takes a numeric tweet id, but we store full status URLs
// (https://x.com/<user>/status/<id>). Pull the trailing id out.
function getTweetId(url: string): string | null {
  const match = url.match(/status(?:es)?\/(\d+)/);
  return match ? match[1] : null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function settingsFingerprint({
  handles,
  monitoringDescription,
  draftingInstructions,
}: {
  handles: string[];
  monitoringDescription: string;
  draftingInstructions: string;
}) {
  return JSON.stringify({
    handles,
    monitoringDescription,
    draftingInstructions,
  });
}

/**
 * Agent detail workbench: update prompts/handles, run saved scans, redraft
 * individual items only after draft instructions change, and post manually.
 * @param props.agent - saved agent settings
 * @param props.runs - run history with items
 * @param props.xConnected - whether posting is available
 * @returns the interactive detail surface
 */
export function AgentDetail({
  agent,
  runs,
  xConnected,
}: {
  agent: AgentDetailAgent;
  runs: AgentDetailRun[];
  xConnected: boolean;
}) {
  const router = useRouter();
  const [handles, setHandles] = useState(agent.monitored_handles);
  const [monitoringDescription, setMonitoringDescription] = useState(agent.monitoring_description);
  const [draftingInstructions, setDraftingInstructions] = useState(agent.drafting_instructions);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallOutput[]>([]);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState<ScanMetrics | null>(null);
  const [latestStoryCount, setLatestStoryCount] = useState<number | null>(null);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [itemStatus, setItemStatus] = useState<Record<string, AgentDetailItem["status"]>>({});
  const [tweetUrls, setTweetUrls] = useState<Record<string, string | null>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>({});
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [expandedRunIds, setExpandedRunIds] = useState<string[]>(() =>
    runs[0]?.id
      ? [
          runs[0].id,
        ]
      : [],
  );

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    const nextStatuses: Record<string, AgentDetailItem["status"]> = {};
    const nextTweetUrls: Record<string, string | null> = {};
    const nextErrors: Record<string, string | null> = {};

    for (const run of runs) {
      for (const item of run.items) {
        nextDrafts[item.id] = item.final_text || item.drafted_text;
        nextStatuses[item.id] = item.status;
        nextTweetUrls[item.id] = item.x_tweet_url;
        nextErrors[item.id] = item.error_message;
      }
    }

    setDraftTexts(nextDrafts);
    setItemStatus(nextStatuses);
    setTweetUrls(nextTweetUrls);
    setItemErrors(nextErrors);
    setExpandedRunIds((current) =>
      current.length === 0 && runs[0]?.id
        ? [
            runs[0].id,
          ]
        : current,
    );
  }, [
    runs,
  ]);

  const initialFingerprint = settingsFingerprint({
    handles: agent.monitored_handles,
    monitoringDescription: agent.monitoring_description,
    draftingInstructions: agent.drafting_instructions,
  });
  const currentFingerprint = settingsFingerprint({
    handles,
    monitoringDescription,
    draftingInstructions,
  });
  const settingsDirty = currentFingerprint !== initialFingerprint;
  const totalCost = runs.reduce((sum, run) => sum + (run.cost_usd ?? 0), 0);
  const totalItems = runs.reduce((sum, run) => sum + run.items.length, 0);
  const postedItems = useMemo(
    () =>
      runs.reduce(
        (sum, run) =>
          sum +
          run.items.filter((item) => {
            const status = itemStatus[item.id] ?? item.status;
            return status === "posted";
          }).length,
        0,
      ),
    [
      itemStatus,
      runs,
    ],
  );
  const canRun =
    agent.status !== "inactive" &&
    !running &&
    handles.length > 0 &&
    monitoringDescription.trim().length > 0 &&
    draftingInstructions.trim().length > 0;
  const hasRunOutput =
    running || reasoning || toolCalls.length > 0 || latestMetrics !== null || runMessage !== null;

  function markSettingsChanged() {
    setSettingsError(null);
    setSettingsSaved(false);
  }

  function toggleRun(runId: string) {
    setExpandedRunIds((current) =>
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [
            ...current,
            runId,
          ],
    );
  }

  async function saveSettings({ refresh = true } = {}) {
    if (savingSettings) return false;
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agent.name,
          handles,
          monitoringDescription,
          draftingInstructions,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save agent.");
      }
      setSettingsSaved(true);
      if (refresh) router.refresh();
      return true;
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Failed to save agent.");
      return false;
    } finally {
      setSavingSettings(false);
    }
  }

  function applyRunEvent(event: ScanStreamEvent | null): boolean {
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
      case "preview_complete":
        return false;
      case "persisted":
        setLatestMetrics(event.metrics);
        setLatestStoryCount(event.storyCount);
        setRunMessage(`Saved ${event.storyCount} item${event.storyCount === 1 ? "" : "s"}.`);
        setRunning(false);
        setExpandedRunIds((current) =>
          current.includes(event.runId)
            ? current
            : [
                event.runId,
                ...current,
              ],
        );
        router.refresh();
        return true;
      case "error":
        setRunError(event.message);
        setRunning(false);
        router.refresh();
        return true;
    }
  }

  async function runAgent() {
    if (!canRun) return;
    if (settingsDirty) {
      const saved = await saveSettings({
        refresh: false,
      });
      if (!saved) return;
    }

    setRunning(true);
    setRunError(null);
    setRunMessage("Running agent.");
    setReasoning("");
    setToolCalls([]);
    setLatestMetrics(null);
    setLatestStoryCount(null);
    setIsReasoningOpen(true);
    setIsToolsOpen(false);

    try {
      const response = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Agent run failed.");
      }
      if (!response.body) throw new Error("Agent run returned no stream.");

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
          if (applyRunEvent(parseScanEvent(line))) sawTerminalEvent = true;
        }
      }
      pendingLine += decoder.decode();
      if (pendingLine.trim() && applyRunEvent(parseScanEvent(pendingLine))) {
        sawTerminalEvent = true;
      }
      if (!sawTerminalEvent) {
        throw new Error("Agent run ended before saving output.");
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Agent run failed.");
      setRunning(false);
    }
  }

  async function redraftItem(item: AgentDetailItem, canRedraftRun: boolean) {
    if (!canRedraftRun) return;
    if (settingsDirty) {
      const saved = await saveSettings({
        refresh: false,
      });
      if (!saved) return;
    }

    setPendingItem(item.id);
    setItemErrors((prev) => ({
      ...prev,
      [item.id]: null,
    }));
    try {
      const response = await fetch(`/api/agents/run-items/${item.id}/redraft`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
      };
      if (!response.ok || !data.text) {
        throw new Error(data.error || "Failed to redraft.");
      }
      setDraftTexts((prev) => ({
        ...prev,
        [item.id]: data.text ?? "",
      }));
      setItemStatus((prev) => ({
        ...prev,
        [item.id]: "drafted",
      }));
      setTweetUrls((prev) => ({
        ...prev,
        [item.id]: null,
      }));
      router.refresh();
    } catch (error) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: error instanceof Error ? error.message : "Failed to redraft.",
      }));
    } finally {
      setPendingItem(null);
    }
  }

  async function postItem(item: AgentDetailItem) {
    if (!xConnected) return;
    const finalText = draftTexts[item.id] ?? item.final_text ?? item.drafted_text;
    setPendingItem(item.id);
    setItemErrors((prev) => ({
      ...prev,
      [item.id]: null,
    }));

    try {
      const response = await fetch(`/api/agents/run-items/${item.id}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalText,
        }),
      });
      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to post.");
      }
      setItemStatus((prev) => ({
        ...prev,
        [item.id]: "posted",
      }));
      setTweetUrls((prev) => ({
        ...prev,
        [item.id]: data.url ?? null,
      }));
      router.refresh();
    } catch (error) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: error instanceof Error ? error.message : "Failed to post.",
      }));
    } finally {
      setPendingItem(null);
    }
  }

  function addHandle(handle: string) {
    markSettingsChanged();
    setHandles((prev) => [
      ...prev,
      handle,
    ]);
  }

  function removeHandle(index: number) {
    markSettingsChanged();
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function renderRunOutput() {
    if (!hasRunOutput) return null;

    return (
      <div className="ws-run">
        <button
          type="button"
          aria-expanded={isReasoningOpen}
          onClick={() => setIsReasoningOpen((open) => !open)}
          className="ws-run-head"
        >
          <span aria-hidden="true" className={cn("dot", running ? "blink" : "green")} />
          <span>
            Reasoning
            {latestMetrics && (
              <span className="ws-run-meta">
                ({toolCalls.length} tool call
                {toolCalls.length === 1 ? "" : "s"} · {formatCost(latestMetrics.costUsd)} ·{" "}
                {latestStoryCount ?? 0} item{latestStoryCount === 1 ? "" : "s"})
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

            {runMessage && !running && <p className="ws-item-note">{runMessage}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ws-create">
      <div className="ws-stats">
        <div className="ws-stat">
          <b>{runs.length}</b>
          <span>scans</span>
        </div>
        <div className="ws-stat">
          <b>{totalItems}</b>
          <span>drafts</span>
        </div>
        <div className="ws-stat">
          <b>{postedItems}</b>
          <span>posted</span>
        </div>
        <div className="ws-stat">
          <b>{formatCost(totalCost)}</b>
          <span>total cost</span>
        </div>
      </div>

      <div className="desk-card">
        <div className="card-chrome">
          <XIcon width={14} height={14} />
          Oparax Agent
        </div>

        <div className="card-body">
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

          <div className="ffield-row">
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="agent-scan-instructions">
                Scanning instructions
              </label>
              <textarea
                id="agent-scan-instructions"
                className="ws-textarea"
                value={monitoringDescription}
                onChange={(event) => {
                  markSettingsChanged();
                  setMonitoringDescription(event.target.value);
                }}
                rows={8}
              />
            </div>
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="agent-drafting-instructions">
                Drafting instructions
              </label>
              <textarea
                id="agent-drafting-instructions"
                className="ws-textarea"
                value={draftingInstructions}
                onChange={(event) => {
                  markSettingsChanged();
                  setDraftingInstructions(event.target.value);
                }}
                rows={8}
              />
            </div>
          </div>

          <div className="ws-settings-actions">
            <button
              type="button"
              className={cn("btn btn-secondary", savingSettings && "loading")}
              disabled={!settingsDirty}
              onClick={() => void saveSettings()}
            >
              <span className="ld" />
              <Save aria-hidden="true" size={15} />
              Save settings
            </button>
            <button
              type="button"
              className={cn("btn btn-primary", running && "loading")}
              disabled={!canRun && !running}
              onClick={runAgent}
            >
              <span className="ld" />
              <Play aria-hidden="true" size={15} />
              {running ? "Running" : "Run Agent"}
            </button>
            {settingsSaved && <span className="ws-saved-note">Saved.</span>}
          </div>

          {agent.status === "inactive" && (
            <div className="ferr show">
              This agent is inactive because X is disconnected. Reconnect X to post and run it
              again.
            </div>
          )}
          {settingsError && <div className="ferr show">{settingsError}</div>}
          {runError && <div className="ferr show">{runError}</div>}
          {renderRunOutput()}
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="ws-runs">
          <div className="ws-runs-empty">
            No scans yet. Run the agent to create scanned items and drafts.
          </div>
        </div>
      ) : (
        <div className="ws-runs">
          {runs.map((run) => {
            const isExpanded = expandedRunIds.includes(run.id);
            const canRedraftRun =
              draftingInstructions.trim() !== run.input_drafting_instructions.trim();

            return (
              <section key={run.id} className="ws-run-row">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleRun(run.id)}
                  className="ws-run-toggle"
                >
                  <ChevronRight
                    aria-hidden="true"
                    size={16}
                    className={cn("chev", isExpanded && "open")}
                  />
                  <span className="ws-run-date">{formatDate(run.started_at)}</span>
                  <span className="ws-run-stat">
                    {run.items.length} item{run.items.length === 1 ? "" : "s"}
                  </span>
                  <span className="ws-run-stat">{formatCost(run.cost_usd)}</span>
                  {run.x_search_count !== null && (
                    <span className="ws-run-stat">{run.x_search_count} x_search</span>
                  )}
                  {run.status === "failed" && <span className="ws-run-fail">Failed</span>}
                </button>

                {isExpanded && (
                  <div className="ws-run-items">
                    {run.error_message && <div className="ferr show">{run.error_message}</div>}
                    {run.items.map((item) => {
                      const status = itemStatus[item.id] ?? item.status;
                      const tweetUrl = tweetUrls[item.id] ?? item.x_tweet_url;
                      const draftText = draftTexts[item.id] ?? item.final_text ?? item.drafted_text;
                      const itemPending = pendingItem === item.id;
                      const isPosted = status === "posted";
                      const primaryTweetId = getTweetId(
                        item.primary_tweet_url || item.source_urls[0] || "",
                      );

                      const statusLabel =
                        status === "posted" ? "Posted" : status === "failed" ? "Failed" : "Draft";

                      return (
                        <div key={item.id} className="ws-item">
                          <div className="ws-item-head">
                            <p className="ws-item-title">{item.story_summary}</p>
                            <span className="ws-item-status" data-status={status}>
                              <span className="dot" />
                              {statusLabel}
                            </span>
                          </div>

                          <label className="flabel" htmlFor={`draft-${item.id}`}>
                            Draft in your voice
                          </label>
                          <textarea
                            id={`draft-${item.id}`}
                            className="ws-textarea"
                            value={draftText}
                            onChange={(event) =>
                              setDraftTexts((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            rows={4}
                            disabled={isPosted}
                            style={{
                              minHeight: 110,
                              opacity: isPosted ? 0.8 : 1,
                            }}
                          />

                          <div className="ws-item-actions">
                            <button
                              type="button"
                              className={cn("btn btn-secondary btn-sm", itemPending && "loading")}
                              disabled={itemPending || isPosted || !canRedraftRun}
                              onClick={() => void redraftItem(item, canRedraftRun)}
                            >
                              <span className="ld" />
                              <RefreshCw aria-hidden="true" size={14} />
                              Redraft
                            </button>
                            <button
                              type="button"
                              className={cn("btn btn-primary btn-sm", itemPending && "loading")}
                              disabled={itemPending || !xConnected || isPosted}
                              onClick={() => void postItem(item)}
                            >
                              <span className="ld" />
                              <Send aria-hidden="true" size={14} />
                              Post to X
                            </button>
                            {tweetUrl && (
                              <a
                                href={tweetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ws-link"
                              >
                                View post
                              </a>
                            )}
                            {!xConnected && (
                              <span className="ws-item-note">
                                Connect X in Settings to post drafts.
                              </span>
                            )}
                          </div>

                          {itemErrors[item.id] && (
                            <div className="ferr show">{itemErrors[item.id]}</div>
                          )}

                          {primaryTweetId ? (
                            <div className="ws-item-source">
                              <span className="ws-item-source-label">Source</span>
                              <CompactTweet
                                id={primaryTweetId}
                                apiUrl={`/api/tweet/${primaryTweetId}`}
                              />
                            </div>
                          ) : (
                            item.source_urls.length > 0 && (
                              <div className="ws-item-source">
                                <span className="ws-item-source-label">
                                  {item.source_urls.length === 1 ? "Source" : "Sources"}
                                </span>
                                <div className="ws-sources">
                                  {item.source_urls.map((url, index) => (
                                    <a
                                      key={url}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ws-link"
                                      style={{
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      <b className="arr">↗</b>Source {index + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
