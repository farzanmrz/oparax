// Imports
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PromptLab } from "@/components/loop/prompt-lab"

/**
 * Prompt-lab page: iterate scan + draft prompts, pick a story, draft, and post.
 * @returns the prompt-lab page
 */
export default function PromptLabPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="Prompt lab"
        description="Iterate the scan + draft prompts, pick a story, and post a real tweet."
        breadcrumbs={[{ label: "Prompt lab" }]}
      />
      <PromptLab />
    </div>
  )
}
