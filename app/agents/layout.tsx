import Link from "next/link";
import { redirect } from "next/navigation";
import { OparaxMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { AppNav } from "./app-nav";
import { UserMenu } from "./user-menu";

/**
 * App auth guard + shell for /agents/*. Full-height column: a slim top bar
 * (brand, section nav, account menu) over a scrollable main region so the
 * chat can own its viewport. Settings and sign-out live inside the account
 * dropdown on the right. The username comes from lib/user.ts, same as before.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-sidebar">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-5 px-4 sm:px-6">
          <Link href="/agents" className="flex items-center gap-2 font-semibold tracking-tight">
            <OparaxMark className="size-5 text-primary" />
            Oparax
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <AppNav />
          <div className="ml-auto">
            <UserMenu username={getUsername(user)} />
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
