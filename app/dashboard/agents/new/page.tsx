import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PromptLab } from "@/components/loop/prompt-lab"

/**
 * New-agent page: configure + run an agent (scan + draft) to preview, then Save.
 * @returns the create-agent page
 */
export default function NewAgentPage() {
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
