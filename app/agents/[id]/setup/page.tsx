import { notFound } from "next/navigation";
import { loadSpendWindows } from "@/lib/agent/spend-query";
import { getSlackLinkState } from "@/lib/slack/link-state";
import { createClient } from "@/lib/supabase/server";
import { ConnectionsCard, NotificationsCard, SourcesCard } from "./sources-card";
import { SpendCard } from "./spend-card";

/**
 * Setup tab (T8, de-greyed by T3). Two-column grid: Sources (left) and, stacked on the
 * right, Connections / Notifications / Spend. Every control on this page is now real —
 * Sources' websites field + auto-post toggles, Connections' per-desk Slack link state
 * (`getSlackLinkState`) + Send-test/disconnect + the email row's Send-test, and the
 * Notifications matrix (client-state only — no schema slot reserved for it this slice, see
 * task-22-report.md). All the interactive pieces live in `sources-card.tsx`, the tab's one
 * Client Component boundary; this file stays a Server Component so it can `await` Supabase
 * directly.
 */
export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [deskResult, spendWindows, slackLinkState] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, status, tracked_handles, websites, auto_post_master, auto_post_sources")
      .eq("id", id)
      .maybeSingle(),
    loadSpendWindows(supabase),
    getSlackLinkState(id),
  ]);

  // RLS scopes ownership, so a foreign id and an absent id are indistinguishable — both a
  // correct 404 (same reasoning as the desk layout's own fetch).
  if (deskResult.error || !deskResult.data) notFound();
  const desk = deskResult.data;

  const emailAddress = process.env.NOTIFY_EMAIL_TO ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <SourcesCard
        autoPostMaster={desk.auto_post_master}
        autoPostSources={parseAutoPostSources(desk.auto_post_sources)}
        deskId={desk.id}
        deskLive={desk.status === "active"}
        trackedHandles={desk.tracked_handles}
        websites={parseWebsites(desk.websites)}
      />
      <div className="flex flex-col gap-6">
        <ConnectionsCard deskId={desk.id} emailAddress={emailAddress} slack={slackLinkState} />
        <NotificationsCard />
        <SpendCard windows={spendWindows} />
      </div>
    </div>
  );
}

function parseWebsites(json: unknown): string[] {
  return Array.isArray(json)
    ? json.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function parseAutoPostSources(json: unknown): { x: boolean; website: boolean } {
  const obj =
    typeof json === "object" && json !== null && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  return { x: obj.x === true, website: obj.website === true };
}
