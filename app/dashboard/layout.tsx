import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUsername } from "@/lib/user"
import { WorkspaceShell } from "@/components/dashboard/workspace-shell"

/**
 * Dashboard shell + auth guard. Renders the graphite WorkspaceShell once around
 * every dashboard page (connect-x, agents, settings), so the whole app shares one
 * connection-aware shell. The user's username (lib/user.ts) shows in the sidebar
 * footer; only x_username is read from the DB (X tokens never reach the browser).
 * Pages render just their own main content into the shell's slot.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  const { data: connection } = await supabase
    .from("x_connections")
    .select("x_username")
    .maybeSingle<{ x_username: string }>()

  return (
    <WorkspaceShell
      username={getUsername(user)}
      xUsername={connection?.x_username ?? null}
    >
      {children}
    </WorkspaceShell>
  )
}
