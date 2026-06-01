import { redirect } from "next/navigation"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PromptLab } from "@/components/loop/prompt-lab"
import { createClient } from "@/lib/supabase/server"

/**
 * New-agent page: configure + run an agent (scan + draft) to preview, then Save.
 * @returns the create-agent page
 */
export default async function NewAgentPage() {
  const supabase = await createClient()
  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .maybeSingle<{ id: string }>()

  if (!connection) {
    redirect("/dashboard/connect-x?next=/dashboard/agents/new&reason=create-agent")
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="New agent"
        description="Configure the agent, run it to preview scan + drafts, then save."
      />
      <PromptLab />
    </div>
  )
}
