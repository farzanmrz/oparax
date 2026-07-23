import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";

/**
 * App auth guard + shell for /agents/*. Chrome is a thin, always-rendered
 * site header (components/site-header.tsx) — no offcanvas sidebar to hide
 * behind, so this header is itself the way-back-to-nav guarantee on every
 * page below it. The owner-scoped desks list (RLS) feeds the header's desk
 * switcher; it's fetched in parallel with the auth check since neither
 * depends on the other's result.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: desks },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("experiments")
      .select("id, beat, status")
      .order("created_at", { ascending: false }),
  ]);

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col bg-background text-foreground">
      <SiteHeader desks={desks ?? []} username={getUsername(user)} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-[102rem] flex-col px-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
