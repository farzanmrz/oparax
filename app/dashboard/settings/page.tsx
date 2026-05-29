// Imports
import { createClient } from "@/lib/supabase/server"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignOutButton } from "@/components/sign-out-button"
import { ConnectX } from "@/components/loop/connect-x"

/**
 * Settings page. Reads the X connection server-side (only x_username — never
 * the encrypted tokens) so the connected handle can render without exposing
 * secrets to the client.
 * @param props.searchParams - callback status params (x_connected / x_error)
 * @returns the settings page
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ x_connected?: string; x_error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Fetch the X username via RLS (no tokens sent to the browser).
  const { data: connection } = await supabase
    .from("x_connections")
    .select("x_username")
    .maybeSingle<{ x_username: string }>()

  const username = connection?.x_username

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        description="Manage your account and connected services."
        breadcrumbs={[{ label: "Settings" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details and session.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>
            Link your X (Twitter) account to post drafts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {username ? (
            <p className="text-sm">
              Connected as{" "}
              <span className="font-medium">@{username}</span>
            </p>
          ) : (
            <ConnectX />
          )}
          {params.x_error && (
            <p className="text-sm text-destructive">{params.x_error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Profile</CardTitle>
          <CardDescription>
            Configure your writing style so drafted tweets match your voice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  )
}
