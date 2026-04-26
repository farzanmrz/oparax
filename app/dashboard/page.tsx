import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { WorkflowCard } from "@/components/workflow-card"
import { HugeiconsIcon } from "@hugeicons/react"
import { WorkflowSquare01Icon, Add01Icon } from "@hugeicons/core-free-icons"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, status, triggers(frequency, config, last_run_at)")
    .order("created_at", { ascending: false })

  const hasWorkflows = workflows && workflows.length > 0

  if (!hasWorkflows) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={WorkflowSquare01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No workflows yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first monitoring workflow to start detecting breaking
              news and drafting tweets automatically.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/workflows/new">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              Create Workflow
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Workflows</h1>
        <Button asChild size="sm">
          <Link href="/dashboard/workflows/new">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            New Workflow
          </Link>
        </Button>
      </div>
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  )
}
