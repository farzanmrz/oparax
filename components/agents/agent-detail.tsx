"use client";

// F2 — Agent detail client island.
// Renders: editable ConfigForm + Save settings, Run saved agent button,
// and the latest run's items (StoryCard per item with Post / Redraft actions).

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import type { AgentConfig } from "@/lib/chat/config";
import type { PreviewStory } from "@/lib/scan/types";
import type { Agent, Run, RunItem } from "@/lib/types";
import { ConfigForm } from "./config-form";
import { ScanPreview } from "./scan-preview";

// ---------------------------------------------------------------------------
// Prop types — server passes these from DB rows
// ---------------------------------------------------------------------------

type AgentRow = Agent;

type RunRow = Pick<
  Run,
  | "id"
  | "status"
  | "started_at"
  | "completed_at"
  | "cost_usd"
  | "x_search_count"
  | "item_count"
  | "error_message"
>;

type ItemRow = Pick<
  RunItem,
  | "id"
  | "run_id"
  | "story_title"
  | "story_summary"
  | "source_urls"
  | "primary_tweet_url"
  | "drafted_text"
  | "final_text"
  | "status"
  | "x_tweet_url"
  | "error_message"
>;

export interface AgentDetailProps {
  agent: AgentRow;
  config: AgentConfig;
  latestRun: RunRow | null;
  latestRunItems: ItemRow[];
  xConnected: boolean;
}

// ---------------------------------------------------------------------------
// Map a DB run_item row to PreviewStory shape (for ScanPreview / StoryCard)
// ---------------------------------------------------------------------------
function itemToStory(item: ItemRow): PreviewStory {
  return {
    title: item.story_title ?? "",
    summary: item.story_summary ?? "",
    sourceUrls: item.source_urls ?? [],
    primaryTweetUrl: item.primary_tweet_url ?? "",
    dedupeKey: item.id, // use item id as stable key on the detail page
    draft: item.final_text ?? item.drafted_text ?? "",
    sources: [], // detail page reads from DB which doesn't store structured sources
  };
}

// ---------------------------------------------------------------------------
// AgentDetail
// ---------------------------------------------------------------------------

type TabValue = "settings" | "run";

export function AgentDetail({
  agent,
  config: initialConfig,
  latestRun,
  latestRunItems,
  xConnected,
}: AgentDetailProps) {
  const router = useRouter();

  // ----- settings tab state -----
  const [config, setConfig] = useState<AgentConfig>(initialConfig);
  const [savingSettings, setSavingSettings] = useState(false);

  // ----- run tab state -----
  const [running, setRunning] = useState(false);

  // Per-item posting / redrafting state
  const [postingId, setPostingId] = useState<string | null>(null);
  const [redraftingId, setRedraftingId] = useState<string | null>(null);

  // Optimistic post state: item id → tweet url
  const [postedUrls, setPostedUrls] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const item of latestRunItems) {
      if (item.x_tweet_url) seed[item.id] = item.x_tweet_url;
    }
    return seed;
  });

  // Optimistic redraft text: item id → new text
  const [redraftedTexts, setRedraftedTexts] = useState<Record<string, string>>({});

  // Active tab
  const [activeTab, setActiveTab] = useState<TabValue>("run");

  // ----- save settings -----
  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(json.error ?? "Failed to save settings.");
        return;
      }
      toast.success("Settings saved.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  }, [agent.id, config]);

  // ----- run agent -----
  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        toast.error(text || "Failed to start run.");
        return;
      }
      // Drain the response stream to completion so onFinish persists the run.
      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      // Refresh server data (new run + items now in DB).
      router.refresh();
      toast.success("Run finished — see the latest run below.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }, [agent.id, router]);

  // ----- post item -----
  const handlePost = useCallback(
    async (itemId: string) => {
      if (postingId || redraftingId) return;
      setPostingId(itemId);
      try {
        const finalText = redraftedTexts[itemId] ?? undefined;
        const res = await fetch(`/api/agents/run-items/${itemId}/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            finalText !== undefined
              ? {
                  finalText,
                }
              : {},
          ),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          toast.error(json.error ?? "Failed to post.");
          return;
        }
        const { url } = (await res.json()) as {
          id: string;
          url: string;
        };
        setPostedUrls((prev) => ({
          ...prev,
          [itemId]: url,
        }));
        toast.success("Posted to X.");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setPostingId(null);
      }
    },
    [postingId, redraftingId, redraftedTexts],
  );

  // ----- redraft item -----
  const handleRedraft = useCallback(
    async (itemId: string) => {
      if (postingId || redraftingId) return;
      setRedraftingId(itemId);
      try {
        const res = await fetch(`/api/agents/run-items/${itemId}/redraft`, {
          method: "POST",
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          toast.error(json.error ?? "Failed to redraft.");
          return;
        }
        const { text } = (await res.json()) as {
          text: string;
          weightedLength: number;
        };
        setRedraftedTexts((prev) => ({
          ...prev,
          [itemId]: text,
        }));
        toast.success("Redrafted.");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setRedraftingId(null);
      }
    },
    [postingId, redraftingId],
  );

  // ----- build stories list for ScanPreview -----
  const stories: PreviewStory[] = latestRunItems.map((item) => {
    const base = itemToStory(item);
    // Apply optimistic redraft text if available
    const draft = redraftedTexts[item.id] ?? base.draft;
    return {
      ...base,
      draft,
    };
  });

  // Indices for ScanPreview's per-item posting/redrafting
  const postingIndex =
    postingId !== null ? latestRunItems.findIndex((i) => i.id === postingId) : null;
  const redraftingIndex =
    redraftingId !== null ? latestRunItems.findIndex((i) => i.id === redraftingId) : null;

  // Determine which items are already posted (optimistic or from DB)
  const isPosted = (item: ItemRow) => Boolean(postedUrls[item.id] ?? item.x_tweet_url);

  return (
    <div>
      {/* Tab switcher */}
      <div className="ws-tabs">
        <button
          type="button"
          className={`ws-tab${activeTab === "run" ? " is-active" : ""}`}
          onClick={() => setActiveTab("run")}
        >
          Latest run
        </button>
        <button
          type="button"
          className={`ws-tab${activeTab === "settings" ? " is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {/* ---- Latest run tab ---- */}
      {activeTab === "run" && (
        <div
          style={{
            marginTop: 20,
          }}
        >
          {/* Run agent button */}
          <div
            style={{
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              className={`btn btn-primary${running ? " loading" : ""}`}
              onClick={handleRun}
              disabled={running || !xConnected}
            >
              <span className="ld" aria-hidden="true" />
              {running ? (
                <>
                  <Spinner className="size-4" />
                  Running…
                </>
              ) : (
                "Run saved agent"
              )}
            </button>
            {!xConnected && (
              <span
                style={{
                  marginLeft: 12,
                  font: "400 0.8125rem/1 var(--font-sans)",
                  color: "var(--faint)",
                }}
              >
                Connect X to run
              </span>
            )}
          </div>

          {/* Latest run results */}
          {latestRun && (
            <div>
              {/* Run meta */}
              <p
                style={{
                  margin: "0 0 14px",
                  font: "400 0.8125rem/1 var(--font-sans)",
                  color: "var(--faint)",
                }}
              >
                Last run:{" "}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(latestRun.started_at))}
                {" · "}
                <span
                  style={{
                    color:
                      latestRun.status === "completed"
                        ? "var(--live)"
                        : latestRun.status === "failed"
                          ? "var(--err)"
                          : "var(--faint)",
                  }}
                >
                  {latestRun.status}
                </span>
                {latestRun.item_count != null && ` · ${latestRun.item_count} items`}
                {latestRun.cost_usd != null && ` · $${latestRun.cost_usd.toFixed(4)}`}
              </p>

              {latestRun.error_message && (
                <p
                  style={{
                    margin: "0 0 14px",
                    font: "400 0.875rem/1.5 var(--font-sans)",
                    color: "var(--err)",
                  }}
                >
                  {latestRun.error_message}
                </p>
              )}

              {/* Stories */}
              {stories.length > 0 ? (
                <ScanPreview
                  stories={stories}
                  perItem={{
                    onPost: (i) => {
                      const item = latestRunItems[i];
                      if (item && !isPosted(item)) handlePost(item.id);
                    },
                    onRedraft: (i) => {
                      const item = latestRunItems[i];
                      if (item) handleRedraft(item.id);
                    },
                    posting: postingIndex,
                    redrafting: redraftingIndex,
                  }}
                  // Render posted items' Post button as disabled via the StoryCard
                  // by checking isPosted in the onPost wrapper above.
                />
              ) : (
                latestRun.status === "completed" && (
                  <p
                    style={{
                      margin: 0,
                      font: "400 0.9375rem/1.5 var(--font-sans)",
                      color: "var(--muted)",
                    }}
                  >
                    No stories found in this run.
                  </p>
                )
              )}

              {/* Posted links */}
              {Object.keys(postedUrls).length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {latestRunItems
                    .filter((item) => postedUrls[item.id])
                    .map((item) => (
                      <a
                        key={item.id}
                        href={postedUrls[item.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ws-link"
                      >
                        View on X: {item.story_title}
                      </a>
                    ))}
                </div>
              )}
            </div>
          )}

          {!latestRun && !running && (
            <p
              style={{
                margin: 0,
                font: "400 0.9375rem/1.5 var(--font-sans)",
                color: "var(--muted)",
              }}
            >
              No runs yet. Click "Run saved agent" to scan X and draft stories.
            </p>
          )}
        </div>
      )}

      {/* ---- Settings tab ---- */}
      {activeTab === "settings" && (
        <div>
          <ConfigForm value={config} onChange={setConfig} />
          <div
            style={{
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className={`btn btn-primary${savingSettings ? " loading" : ""}`}
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              <span className="ld" aria-hidden="true" />
              {savingSettings ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
