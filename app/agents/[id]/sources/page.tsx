import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseWebsites, trackedSourceUrl } from "@/lib/websites";
import { SourcesCard, type WebsiteDetail } from "./sources-card";

// Mirrors app/agents/new/page.tsx's maxDuration (see its comment for the 800 rationale): the
// sources-card's website onboarding kicks off discovery + up to 10 sub-sitemap fetches + fetch
// + a Qwen call under `after()`, still bound by this route's lifetime — without this ceiling
// the platform can kill a long run before markPendingSourceFailed executes, leaving a
// permanently-pending chip.
export const maxDuration = 800;

export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: desk, error } = await supabase
    .from("agents")
    .select("id, tracked_handles, websites")
    .eq("id", id)
    .maybeSingle();
  if (error || !desk) notFound();

  // Reporter-facing labels for the website chips ("Mundo Deportivo: mundodeportivo.com/futbol/
  // fc-barcelona"). source_configs is deny-all RLS, so this is the standard ownership-then-
  // service-role read: the RLS desk select above already proved the caller owns this desk.
  // Display-only and non-fatal — a failed read renders chips with their URL fallback.
  const details: Record<string, WebsiteDetail> = {};
  {
    const { data: configs, error: configError } = await createAdminClient()
      .from("source_configs")
      .select("url, domain, display_name, listing_url, feed_url, change_detection, prefilter")
      .eq("agent_id", desk.id)
      .eq("status", "active");
    if (configError) console.error("SourcesPage: source_configs label read failed", configError);
    for (const row of configs ?? []) {
      details[row.url] = {
        displayName: row.display_name ?? row.domain,
        domain: row.domain.replace(/^www\./i, ""),
        trackedUrl: trackedSourceUrl({
          url: row.url,
          domain: row.domain,
          changeDetection: row.change_detection,
          listingUrl: row.listing_url,
          feedUrl: row.feed_url,
          prefilter: row.prefilter,
        }),
      };
    }
  }

  return (
    <div className="py-[var(--page-rhythm-mobile)] desk:py-[var(--page-rhythm-web)]">
      <SourcesCard
        deskId={desk.id}
        trackedHandles={desk.tracked_handles}
        websiteDetails={details}
        websites={parseWebsites(desk.websites)}
      />
    </div>
  );
}
