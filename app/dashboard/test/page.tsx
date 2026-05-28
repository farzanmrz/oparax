import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { WorkflowTable } from "@/components/workflow-table"

export default function TestWorkflowsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <DashboardPageHeader
        title="Test Workflows"
        breadcrumbs={[{ label: "Test Workflows" }]}
        action={{
          href: "/dashboard/test/new",
          label: "Create test workflow",
        }}
      />
      <WorkflowTable workflows={[]} showDemoRows={false} />
    </div>
  )
}
