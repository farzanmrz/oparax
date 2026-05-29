// Imports
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScanStreamView } from "@/components/loop/scan-stream-view"
import { StoryList, type StoryListItem } from "@/components/loop/story-list"
import type { Monitor, Scan } from "@/lib/types"

// Monitor fields shown on the detail page
type DetailMonitor = Pick<
  Monitor,
  | "id"
  | "name"
  | "monitoring_description"
  | "monitored_handles"
  | "scan_from"
  | "scan_to"
  | "status"
>

// Recent scan summary fields
type ScanSummary = Pick<
  Scan,
  | "id"
  | "status"
  | "story_count"
  | "cost_usd"
  | "x_search_count"
  | "started_at"
>

/**
 * Monitor detail page: header, config summary, scan control + live stream,
 * recent scans, and the story list (with embedded source tweets).
 * @param props.params - route params carrying the monitor id
 * @returns the monitor detail page
 */
export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Create Supabase client for this request
  const supabase = await createClient()

  // Fetch the monitor via RLS; a missing monitor is a 404
  const { data: monitorData } = await supabase
    .from("monitors")
    .select(
      "id, name, monitoring_description, monitored_handles, scan_from, scan_to, status",
    )
    .eq("id", id)
    .single<DetailMonitor>()

  if (!monitorData) {
    notFound()
  }

  // Non-null binding so all subsequent queries use the narrowed type
  const monitor = monitorData

  // Fetch stories for this monitor (newest first)
  const { data: storiesData } = await supabase
    .from("stories")
    .select("id, title, summary, source_urls, primary_tweet_url, created_at")
    .eq("monitor_id", id)
    .order("created_at", { ascending: false })

  // Fetch the 5 most recent scans for this monitor
  const { data: scansData } = await supabase
    .from("scans")
    .select("id, status, story_count, cost_usd, x_search_count, started_at")
    .eq("monitor_id", id)
    .order("started_at", { ascending: false })
    .limit(5)

  // Cast to the component-friendly types
  const stories = (storiesData ?? []) as StoryListItem[]
  const scans = (scansData ?? []) as ScanSummary[]

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title={monitor.name}
        breadcrumbs={[
          { label: "Monitors", href: "/dashboard/test" },
          { label: monitor.name },
        ]}
      />

      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {monitor.monitoring_description && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {monitor.monitoring_description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {monitor.monitored_handles.map((handle) => (
                <Badge key={handle} variant="secondary">
                  @{handle}
                </Badge>
              ))}
            </div>
            {(monitor.scan_from || monitor.scan_to) && (
              <span className="text-muted-foreground">
                Window: {monitor.scan_from ?? "…"} → {monitor.scan_to ?? "…"}
              </span>
            )}
          </CardContent>
        </Card>

        <ScanStreamView monitorId={monitor.id} />

        {scans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent scans</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {scans.map((scan) => (
                <div key={scan.id} className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={scan.status === "completed" ? "default" : "secondary"}
                  >
                    {scan.status}
                  </Badge>
                  <span>
                    {scan.story_count ?? 0} stories
                    {scan.x_search_count !== null
                      ? ` · ${scan.x_search_count} x_search`
                      : ""}
                    {scan.cost_usd !== null
                      ? ` · $${Number(scan.cost_usd).toFixed(6)}`
                      : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-heading">Stories</h2>
          <StoryList stories={stories} />
        </div>
      </div>
    </div>
  )
}
