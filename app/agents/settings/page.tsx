import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { DeleteAccountButton, UsernameForm } from "./settings-forms";

/**
 * Settings: profile (username), security (password placeholder — no real flow
 * exists yet), and a danger zone (account deletion). Same server actions and
 * form wiring as before; only the presentation changed. Reads only the
 * signed-in user.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <header className="border-b border-border py-5">
        <Link
          className="mb-3 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="/agents"
        >
          <ArrowLeftIcon className="size-4" />
          Agents
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and account.
        </p>
      </header>

      <div className="flex flex-col gap-6 py-6">
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
              Permanently delete your account, your agents, and everything they&apos;ve
              aggregated.
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
