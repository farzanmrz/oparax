// Imports

import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { AccountSection } from "@/components/settings/account-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";

/**
 * Settings page. A single scroll of section cards — Profile (identity +
 * connected accounts), Notifications, Account settings — each anchored by the
 * id the sidebar sub-nav scroll-spies (profile / notifications / account).
 *
 * Reads, server-side: the signed-in user (username + email), the X connection
 * (x_username only — never the encrypted tokens) and the saved-agent count (for
 * the disconnect confirm). Renders into the shell provided by the dashboard
 * layout.
 * @param props.searchParams - X connect/callback status params
 * @returns the settings page
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    x_connected?: string;
    x_error?: string;
  }>;
}) {
  // Resolve the search params promise (Next 15+/16 async searchParams).
  const params = await searchParams;

  // Supabase client scoped to this request.
  const supabase = await createClient();

  // These three reads are independent — run them concurrently. The X username
  // comes via RLS (no tokens sent to the browser).
  const [
    {
      data: { user },
    },
    { data: connection },
    { count: agentCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("x_connections").select("x_username").maybeSingle<{
      x_username: string;
    }>(),
    supabase.from("agents").select("id", {
      count: "exact",
      head: true,
    }),
  ]);

  const username = getUsername(user);
  const email = user?.email ?? "";
  const xUsername = connection?.x_username;

  return (
    <>
      <WorkspacePageHeader title="Settings" />

      <div className="set-stack">
        <ProfileSection
          initialUsername={username}
          email={email}
          xUsername={xUsername}
          xError={params.x_error}
          agentCount={agentCount ?? 0}
        />
        <NotificationsSection />
        <AccountSection />
      </div>
    </>
  );
}
