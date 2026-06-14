import { redirect } from "next/navigation"
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header"
import { PromptLab } from "@/components/loop/prompt-lab"
import { createClient } from "@/lib/supabase/server"

/**
 * New-agent page: configure + run an agent (scan + draft) to preview, then Save.
 * Gated on a connected X account; renders into the shell from the dashboard layout.
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
    <>
      <WorkspacePageHeader title="New agent" />
      <PromptLab />
    </>
  )
}
