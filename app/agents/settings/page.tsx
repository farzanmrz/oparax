import { AppSidebarBackRow } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { DeleteAccountButton, UsernameForm } from "./settings-forms";

/**
 * Settings: profile (username), security (password placeholder — no real flow
 * exists yet), and a danger zone (account deletion). Same server actions and
 * form wiring as before; only the presentation changed. Reads only the
 * signed-in user. The header spans the full layout column and stays pinned
 * (matching the other /agents pages, so the sidebar trigger never scrolls
 * away or jumps position between pages); only the cards scroll, centered in
 * their narrower column.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border py-5">
        <AppSidebarBackRow />
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and account.</p>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto py-6 pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How your byline appears across Oparax.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsernameForm initialUsername={getUsername(user)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Password and sign-in options.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Password changes aren&apos;t available yet.
                </p>
              </div>
              {/* No real password-change flow exists yet (same as the old page). */}
              <Button disabled type="button" variant="outline">
                Coming soon
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account, your agents, and everything they&apos;ve aggregated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
