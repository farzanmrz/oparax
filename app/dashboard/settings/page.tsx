// Imports
import { createClient } from "@/lib/supabase/server"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import {
  SettingsTabNav,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "@/components/settings/settings-tab-nav"
import { ProfileSection } from "@/components/settings/profile-section"
import { ComingSoonSection } from "@/components/settings/coming-soon-section"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Derive a display name from auth user_metadata, mirroring the dashboard
 * layout's fallback order (full_name → name → display_name → email local part).
 * @param email - the user's email (fallback source)
 * @param metadata - the user's auth user_metadata
 * @returns a non-empty display name
 */
function getDisplayName({
  email,
  metadata,
}: {
  email: string
  metadata: Record<string, unknown>
}) {
  const metadataName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : typeof metadata.display_name === "string"
          ? metadata.display_name
          : ""

  if (metadataName.trim()) return metadataName.trim()
  if (email) return email.split("@")[0]

  return "Reporter"
}

/**
 * Settings page. Renders tabbed sections selected via `?section=`. Reads the
 * signed-in user (for the display name) and the X connection server-side (only
 * x_username — never the encrypted tokens) so nothing secret reaches the client.
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

  // Current user — drives the display-name default.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const displayName = getDisplayName({
    email: user?.email ?? "",
    metadata: user?.user_metadata ?? {},
  })

  // Fetch the X username via RLS (no tokens sent to the browser).
  const { data: connection } = await supabase
    .from("x_connections")
    .select("x_username")
    .maybeSingle<{ x_username: string }>()
  const xUsername = connection?.x_username

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        description="Manage your account and connected services."
      />

      <SettingsTabNav activeSection={section} />

      {section === "profile" && (
        <ProfileSection
          initialDisplayName={displayName}
          xUsername={xUsername}
          xError={params.x_error}
        />
      )}

      {section === "billing" && (
        <ComingSoonSection
          title="Billing"
          description="Usage and billing for your account."
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium">Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Drafts this month
              </span>
              <span className="text-sm font-medium">0 / 100</span>
            </div>
          </div>
        </ComingSoonSection>
      )}

      {section === "security" && (
        <ComingSoonSection
          title="Account security"
          description="Update your password and email address."
        >
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="security-email">Email</FieldLabel>
              <Input
                id="security-email"
                type="email"
                defaultValue={user?.email ?? ""}
                disabled
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="security-password">New password</FieldLabel>
              <Input
                id="security-password"
                type="password"
                placeholder="••••••••"
                disabled
              />
            </Field>
          </div>
        </ComingSoonSection>
      )}

      {section === "notifications" && (
        <ComingSoonSection
          title="Notifications"
          description="Choose what we email you about."
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm">Breaking-story alerts</span>
              <span className="h-5 w-9 rounded-full bg-primary" />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm">Draft-ready emails</span>
              <span className="h-5 w-9 rounded-full bg-primary" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Product updates</span>
              <span className="h-5 w-9 rounded-full bg-muted" />
            </div>
          </div>
        </ComingSoonSection>
      )}
    </div>
  )
}
