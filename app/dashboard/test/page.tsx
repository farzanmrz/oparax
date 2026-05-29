// Imports
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Monitor } from "@/lib/types"

// Subset of Monitor fields needed for the list view.
type MonitorRow = Pick<
  Monitor,
  | "id"
  | "name"
  | "monitored_handles"
  | "status"
  | "scan_from"
  | "scan_to"
  | "created_at"
>

/**
 * List page for all monitors belonging to the signed-in user.
 * Shows overview cards with names, handle counts, and scan windows.
 * @returns the monitors list page with header and monitor cards
 */
export default async function MonitorsPage() {
  // Supabase client for the current request (RLS enforces user ownership).
  const supabase = await createClient()

  // Fetch monitors ordered by creation date (newest first).
  const { data } = await supabase
    .from("monitors")
    .select("id, name, monitored_handles, status, scan_from, scan_to, created_at")
    .order("created_at", { ascending: false })

  // Cast data as MonitorRow array (empty if no monitors exist).
  const monitors = (data ?? []) as MonitorRow[]

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="Monitors"
        description="Configured X scanners. Open one to run a scan and draft posts."
        breadcrumbs={[{ label: "Monitors" }]}
        action={{ href: "/dashboard/test/new", label: "Create monitor" }}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-2 md:px-4">
        {monitors.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No monitors yet. Create one to start scanning X.
            </CardContent>
          </Card>
        ) : (
          monitors.map((monitor) => (
            <Link
              key={monitor.id}
              href={`/dashboard/test/${monitor.id}`}
              className="rounded-xl transition-colors hover:bg-muted/40"
            >
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-base font-medium text-foreground">
                      {monitor.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {monitor.monitored_handles.length} handle
                      {monitor.monitored_handles.length === 1 ? "" : "s"}
                      {monitor.scan_from || monitor.scan_to
                        ? ` · ${monitor.scan_from ?? "…"} → ${monitor.scan_to ?? "…"}`
                        : ""}
                    </span>
                  </div>
                  <Badge variant={monitor.status === "active" ? "default" : "secondary"}>
                    {monitor.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
