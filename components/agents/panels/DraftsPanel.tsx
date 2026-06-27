"use client";

// Drafts worklist: a reverse-chronological list of stories across the agent's
// recent runs. Each run is a group with a header (date · status · N items ·
// cost · "scheduled" for cron runs); its drafted stories render beneath as
// StoryCards keyed by run_item id. Post/Redraft act on any drafted, non-posted
// item; posted/failed items show their DB-backed terminal state (which survives
// refresh). Items are keyed by id (not index) because indices drift once stories
// span multiple run groups, and ScanPreview's index contract is shared with the
// create flow.

import { ConnectXBar } from "@/components/agents/connect-x-bar";
import { StoryCard } from "@/components/agents/story-card";
import { Spinner } from "@/components/ui/spinner";
import type { PreviewStory } from "@/lib/scan/types";
import type { DetailItemRow as ItemRow, DetailRunRow as RunRow } from "@/lib/types";
import { usd } from "@/lib/usage/format";

export interface DraftsPanelProps {
  agentId: string;
  running: boolean;
  xConnected: boolean;
  needsConnect: boolean;
  onRun: () => void;
  runs: RunRow[];
  items: ItemRow[];
  // itemId-keyed handlers (indices drift across run groups).
  onPost: (itemId: string, finalText?: string) => void;
  onRedraft: (itemId: string) => void;
  postingId: string | null;
  redraftingId: string | null;
  // Optimistic per-item state, keyed by item id.
  redraftedTexts: Record<string, string>;
  postedUrls: Record<string, string>;
}

const headerFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

// Map a DB run_item row to the PreviewStory shape StoryCard renders.
function itemToStory(item: ItemRow, draftOverride?: string): PreviewStory {
  return {
    title: item.story_title ?? "",
    summary: item.story_summary ?? "",
    sourceUrls: item.source_urls ?? [],
    primaryTweetUrl: item.primary_tweet_url ?? "",
    dedupeKey: item.id,
    draft: draftOverride ?? item.final_text ?? item.drafted_text ?? "",
    sources: [],
  };
}

export function DraftsPanel({
  agentId,
  running,
  xConnected,
  needsConnect,
  onRun,
  runs,
  items,
  onPost,
  onRedraft,
  postingId,
  redraftingId,
  redraftedTexts,
  postedUrls,
}: DraftsPanelProps) {
  // Group items by run_id (preserves the created_at desc order from the query).
  const itemsByRun = new Map<string, ItemRow[]>();
  for (const item of items) {
    const bucket = itemsByRun.get(item.run_id);
    if (bucket) bucket.push(item);
    else itemsByRun.set(item.run_id, [item]);
  }

  return (
    <div style={{ marginTop: 20 }}>
      {(needsConnect || !xConnected) && (
        <ConnectXBar
          message={
            needsConnect
              ? "Connect your X account to post this draft."
              : "Connect X to post drafts (creating, running, and drafting all work without it)."
          }
          nextPath={`/dashboard/agents/${agentId}`}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${running ? " loading" : ""}`}
          onClick={onRun}
          disabled={running}
        >
          <span className="ld" aria-hidden="true" />
          {running ? (
            <>
              <Spinner className="size-4" />
              Scanning your beat…
            </>
          ) : (
            "Run saved agent"
          )}
        </button>
      </div>

      {/* Run-in-progress state (no runs yet during the very first scan). */}
      {running && runs.length === 0 && (
        <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
          Scanning your beat…
        </p>
      )}

      {/* No-runs empty state. */}
      {!running && runs.length === 0 && (
        <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
          No runs yet. Click "Run saved agent" to scan your beat and draft stories.
        </p>
      )}

      {/* Reverse-chronological run groups. */}
      {runs.map((run) => {
        const runItems = itemsByRun.get(run.id) ?? [];
        return (
          <div key={run.id} style={{ marginBottom: 28 }}>
            <p
              style={{
                margin: "0 0 14px",
                font: "400 0.8125rem/1 var(--font-sans)",
                color: "var(--faint)",
              }}
            >
              {headerFmt.format(new Date(run.started_at))}
              {" · "}
              <span
                style={{
                  color:
                    run.status === "completed"
                      ? "var(--live)"
                      : run.status === "failed"
                        ? "var(--err)"
                        : "var(--faint)",
                }}
              >
                {run.status}
              </span>
              {run.item_count != null && ` · ${run.item_count} items`}
              {run.cost_usd != null && ` · ${usd(run.cost_usd)}`}
              {run.source === "cron" && " · scheduled"}
            </p>

            {run.error_message && (
              <p
                style={{
                  margin: "0 0 14px",
                  font: "400 0.875rem/1.5 var(--font-sans)",
                  color: "var(--err)",
                }}
              >
                {run.error_message}
              </p>
            )}

            {runItems.length > 0 ? (
              <div className="ws-stories">
                {runItems.map((item) => {
                  const redraftText = redraftedTexts[item.id];
                  const story = itemToStory(item, redraftText);
                  const optimisticUrl = postedUrls[item.id];
                  const posted =
                    Boolean(optimisticUrl ?? item.x_tweet_url) || item.status === "posted";
                  const postedVia =
                    item.posted_via === "auto" || item.posted_via === "manual"
                      ? item.posted_via
                      : null;
                  const failedError = item.status === "failed" ? item.error_message : null;
                  // Failed items keep Post + Redraft so the user can recover (the redraft
                  // route resets status → 'drafted'); 'posting' is transient and acts on neither.
                  const canAct = (item.status === "drafted" || item.status === "failed") && !posted;
                  return (
                    <StoryCard
                      key={item.id}
                      story={story}
                      onPost={canAct ? () => onPost(item.id, redraftText) : undefined}
                      onRedraft={canAct ? () => onRedraft(item.id) : undefined}
                      posting={postingId === item.id}
                      redrafting={redraftingId === item.id}
                      posted={posted}
                      postedUrl={optimisticUrl ?? item.x_tweet_url}
                      postedAt={item.posted_at}
                      postedVia={postedVia}
                      failedError={failedError}
                      xConnected={xConnected}
                    />
                  );
                })}
              </div>
            ) : (
              run.status === "completed" && (
                <p
                  style={{
                    margin: 0,
                    font: "400 0.9375rem/1.5 var(--font-sans)",
                    color: "var(--muted)",
                  }}
                >
                  No stories matched — loosen your scanning instructions or widen the window in
                  Sources.
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
