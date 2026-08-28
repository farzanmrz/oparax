import { notFound } from "next/navigation";
import { fetchFeedCounts, fetchFeedPage } from "@/lib/agent/feed-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FeedAutoRefresh } from "./feed-auto-refresh";
import { FeedEmptyState, type FeedReadiness } from "./feed-item";
import { FeedList } from "./feed-list";

// Mirrors app/agents/[id]/sources/page.tsx's maxDuration. Server actions run under this
// segment's lifetime.
export const maxDuration = 800;

export default async function FeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // Ownership is intentionally awaited before any service-role work. Layout guards protect
  // rendering, but do not prove this server component has not already started an admin read.
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("status, tracked_handles")
    .eq("id", id)
    .maybeSingle();
  if (agentError || !agent) notFound();
  const admin = createAdminClient();
  const [page, counts] = await Promise.all([fetchFeedPage(admin, id), fetchFeedCounts(admin, id)]);
  const hasSources = (agent.tracked_handles?.length ?? 0) > 0;
  let readiness: FeedReadiness = { kind: "ready" };
  if (agent.status !== "active") readiness = { kind: "paused" };
  else if (!hasSources) readiness = { kind: "no_sources" };
  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-[var(--page-rhythm-mobile)] py-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)] desk:py-[var(--page-rhythm-web)]">
      <FeedAutoRefresh />
      {counts.totalStories === 0 ? (
        <FeedEmptyState deskId={id} readiness={readiness} />
      ) : (
        <FeedList
          agentId={id}
          fetchedAt={Date.now()}
          initialCursor={page.nextCursor}
          initialItems={page.items}
        />
      )}
    </div>
  );
}
