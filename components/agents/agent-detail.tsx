"use client";

// F2 — Agent detail client island: thin 3-tab shell.
// Owns the shared post/redraft/run state + handlers and delegates rendering to the
// panels (Drafts | Schedule & autonomy | Sources) under ./panels/. Items/runs are
// keyed by run_item id (not index) because the Drafts worklist spans multiple runs.

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { AgentConfig } from "@/lib/chat/config";
import type { Agent, DetailItemRow as ItemRow, DetailRunRow as RunRow } from "@/lib/types";
import { DraftsPanel } from "./panels/DraftsPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { SourcesPanel } from "./panels/SourcesPanel";

export interface AgentDetailProps {
  agent: Agent;
  config: AgentConfig;
  runs: RunRow[];
  items: ItemRow[];
  xConnected: boolean;
}

// ---------------------------------------------------------------------------
// AgentDetail
// ---------------------------------------------------------------------------

type TabValue = "drafts" | "schedule" | "sources";

export function AgentDetail({
  agent,
  config: initialConfig,
  runs,
  items,
  xConnected,
}: AgentDetailProps) {
  const router = useRouter();

  // ----- settings tab state -----
  const [config, setConfig] = useState<AgentConfig>(initialConfig);
  const [savingSettings, setSavingSettings] = useState(false);

  // ----- run state -----
  const [running, setRunning] = useState(false);

  // Per-item posting / redrafting state, keyed by run_item id.
  const [postingId, setPostingId] = useState<string | null>(null);
  const [redraftingId, setRedraftingId] = useState<string | null>(null);

  // Optimistic post state: item id → tweet url (seeded from DB-posted items).
  const [postedUrls, setPostedUrls] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const item of items) {
      if (item.x_tweet_url) seed[item.id] = item.x_tweet_url;
    }
    return seed;
  });

  // Optimistic redraft text: item id → new text.
  const [redraftedTexts, setRedraftedTexts] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<TabValue>("drafts");
  const [needsConnect, setNeedsConnect] = useState(false);

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
      // Read the stream for live progress. Completion is server-driven (consumeStream),
      // so disconnecting here has no correctness consequence — this is purely UX.
      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      // Refresh server data (new run + items now in DB).
      router.refresh();
      toast.success("Run finished — see the drafts below.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }, [agent.id, router]);

  // ----- post item (itemId-keyed; routes to connect when X is missing) -----
  const handlePost = useCallback(
    async (itemId: string, finalTextArg?: string) => {
      if (postingId || redraftingId) return;
      if (!xConnected) {
        setNeedsConnect(true);
        return;
      }
      setPostingId(itemId);
      try {
        const finalText = finalTextArg ?? redraftedTexts[itemId] ?? undefined;
        const res = await fetch(`/api/agents/run-items/${itemId}/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(finalText !== undefined ? { finalText } : {}),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
          };
          if (json.code === "no_x_connection") setNeedsConnect(true);
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
    [postingId, redraftingId, redraftedTexts, xConnected],
  );

  // ----- redraft item (itemId-keyed) -----
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

  return (
    <div>
      <div className="ws-tabs">
        <button
          type="button"
          className={`ws-tab${activeTab === "drafts" ? " is-active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </button>
        <button
          type="button"
          className={`ws-tab${activeTab === "schedule" ? " is-active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule &amp; autonomy
        </button>
        <button
          type="button"
          className={`ws-tab${activeTab === "sources" ? " is-active" : ""}`}
          onClick={() => setActiveTab("sources")}
        >
          Sources
        </button>
      </div>

      {activeTab === "drafts" && (
        <DraftsPanel
          agentId={agent.id}
          running={running}
          xConnected={xConnected}
          needsConnect={needsConnect}
          onRun={handleRun}
          runs={runs}
          items={items}
          onPost={handlePost}
          onRedraft={handleRedraft}
          postingId={postingId}
          redraftingId={redraftingId}
          redraftedTexts={redraftedTexts}
          postedUrls={postedUrls}
        />
      )}

      {activeTab === "schedule" && <SchedulePanel agent={agent} />}

      {activeTab === "sources" && (
        <SourcesPanel
          config={config}
          onChange={setConfig}
          onSave={handleSaveSettings}
          saving={savingSettings}
        />
      )}
    </div>
  );
}
