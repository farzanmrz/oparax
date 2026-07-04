import Link from "next/link";
import { redirect } from "next/navigation";
import { OparaxMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { SignOutButton } from "./sign-out-button";

/**
 * Dashboard auth guard + stub chrome. Renders a plain nav strip (Agents,
 * Settings, the username, sign-out) around every dashboard page. The user's
 * username comes from lib/user.ts, same as before. v0 owns the real shell.
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
    <div className="space-y-4 p-8">
      <header className="flex items-center gap-4">
        <Link href="/dashboard/agents" className="flex items-center gap-2 font-medium">
          <OparaxMark className="size-5" />
          Oparax
        </Link>
        <nav className="flex gap-4">
          <Link href="/dashboard/agents">Agents</Link>
          <Link href="/dashboard/settings">Settings</Link>
        </nav>
        <span className="ml-auto">{getUsername(user)}</span>
        <SignOutButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
