// Imports
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { MonitorForm } from "@/components/loop/monitor-form"

/**
 * Page for creating a new X monitor with handles and drafting rules.
 * @returns the new-monitor page with header and form
 */
export default function NewMonitorPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="New monitor"
        breadcrumbs={[
          { label: "Monitors", href: "/dashboard/test" },
          { label: "New monitor" },
        ]}
      />
      <div className="mx-auto w-full max-w-screen-2xl px-2 md:px-4">
        <MonitorForm />
      </div>
    </div>
  )
}
