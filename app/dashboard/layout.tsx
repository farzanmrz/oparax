import { redirect } from "next/navigation";
import { UnsavedChangesProvider } from "@/components/dashboard/unsaved-changes";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { isAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";

/**
 * Dashboard shell + auth guard. Renders the graphite WorkspaceShell once around
 * every dashboard page (connect-x, agents, settings), so the whole app shares one
 * shell. The user's username (lib/user.ts) shows in the sidebar footer.
 * Pages render just their own main content into the shell's slot.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  return (
    <UnsavedChangesProvider>
      <WorkspaceShell username={getUsername(user)} isAdmin={isAdmin(user.email)}>
        {children}
      </WorkspaceShell>
    </UnsavedChangesProvider>
  );
}
