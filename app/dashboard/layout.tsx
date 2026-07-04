import Link from "next/link";
import { redirect } from "next/navigation";
import { OparaxMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { DashboardNav } from "./dashboard-nav";
import { SignOutButton } from "./sign-out-button";

/**
 * Dashboard auth guard + app shell. Full-height column: a slim top bar
 * (brand, section nav, user identity, sign-out) over a scrollable main
 * region so the chat can own its viewport. The user's username comes from
 * lib/user.ts, same as before.
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
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
          <Link
            href="/dashboard/agents"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <OparaxMark className="size-5" />
            Oparax
          </Link>
          <DashboardNav />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {getUsername(user)}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6">{children}</div>
      </main>
    </div>
  );
}
