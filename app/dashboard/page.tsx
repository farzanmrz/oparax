import { createClient } from "@/lib/supabase/server"
import {
  WorkflowTable,
  type WorkflowTableWorkflow,
} from "@/components/workflow-table"
import { DashboardPageHeader } from "@/components/dashboard-page-header"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, status, triggers(frequency_amount, frequency_unit, last_run_at, scan_runs(id, item_count, status))")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <DashboardPageHeader
        title="Workflows"
        breadcrumbs={[{ label: "Workflows" }]}
        action={{ href: "/dashboard/workflows/new", label: "Create workflow" }}
      />
      <WorkflowTable workflows={(workflows ?? []) as WorkflowTableWorkflow[]} />
    </div>
  )
}
