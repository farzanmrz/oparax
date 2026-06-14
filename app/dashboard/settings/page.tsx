// Imports
import { createClient } from "@/lib/supabase/server"
import { getUsername } from "@/lib/user"
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header"
import {
  SettingsTabNav,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "@/components/settings/settings-tab-nav"
import { ProfileSection } from "@/components/settings/profile-section"
import { ComingSoonSection } from "@/components/settings/coming-soon-section"

/**
 * Settings page. Renders tabbed sections selected via `?section=`. Reads the
 * signed-in user (for the username) and the X connection server-side (only
 * x_username — never the encrypted tokens) so nothing secret reaches the client.
 * Renders into the shell provided by the dashboard layout.
 * @param props.searchParams - section selector + X callback status params
 * @returns the settings page
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string
    x_connected?: string
    x_error?: string
  }>
}) {
  // Resolve the search params promise (Next 15+/16 async searchParams).
  const params = await searchParams

  // Pick the active section, defaulting to profile for unknown values.
  const section: SettingsSection = SETTINGS_SECTIONS.some(
    (entry) => entry.slug === params.section,
  )
    ? (params.section as SettingsSection)
    : "profile"

  // Supabase client scoped to this request.
  const supabase = await createClient()

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
    supabase
      .from("x_connections")
      .select("x_username")
      .maybeSingle<{ x_username: string }>(),
    supabase.from("agents").select("id", { count: "exact", head: true }),
  ])

  const username = getUsername(user)
  const xUsername = connection?.x_username

  return (
    <>
      <WorkspacePageHeader title="Settings" />

      <SettingsTabNav activeSection={section} />

      {section === "profile" && (
        <ProfileSection
          initialUsername={username}
          xUsername={xUsername}
          xError={params.x_error}
          agentCount={agentCount ?? 0}
        />
      )}

      {section === "billing" && (
        <div className="ws-settings">
          <ComingSoonSection
            title="Billing"
            description="Usage and billing for your account."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="ws-mock-row">
                <span>Plan</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>Free</span>
              </div>
              <div className="ws-mock-row">
                <span>Drafts this month</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>
                  0 / 100
                </span>
              </div>
            </div>
          </ComingSoonSection>
        </div>
      )}

      {section === "security" && (
        <div className="ws-settings">
          <ComingSoonSection
            title="Account security"
            description="Update your password and email address."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="ffield-wrap">
                <label className="flabel" htmlFor="security-email">
                  Email
                </label>
                <input
                  id="security-email"
                  type="email"
                  className="ws-input"
                  defaultValue={user?.email ?? ""}
                  disabled
                />
              </div>
              <div className="ffield-wrap">
                <label className="flabel" htmlFor="security-password">
                  New password
                </label>
                <input
                  id="security-password"
                  type="password"
                  className="ws-input"
                  placeholder="••••••••"
                  disabled
                />
              </div>
            </div>
          </ComingSoonSection>
        </div>
      )}

      {section === "notifications" && (
        <div className="ws-settings">
          <ComingSoonSection
            title="Notifications"
            description="Choose what we email you about."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="ws-mock-row">
                <span>Breaking-story alerts</span>
                <span className="ws-mock-toggle" />
              </div>
              <div className="ws-mock-row">
                <span>Draft-ready emails</span>
                <span className="ws-mock-toggle" />
              </div>
              <div className="ws-mock-row">
                <span>Product updates</span>
                <span className="ws-mock-toggle off" />
              </div>
            </div>
          </ComingSoonSection>
        </div>
      )}
    </>
  )
}
