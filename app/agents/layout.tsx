import { redirect } from "next/navigation";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { ScrollContainerProvider, ScrollRegion } from "@/components/scroll-container";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { getAvatarKey, getUsername } from "@/lib/user";

/**
 * App auth guard + shell for /agents/*. Chrome is one always-rendered site header
 * (components/site-header.tsx) — no offcanvas sidebar to hide behind, so this header is itself
 * the way-back-to-nav guarantee on every page below it. The owner-scoped desks list feeds the
 * header's switcher, tabs, and controls.
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
      .from("agents")
      .select("id, name, beat, status")
      .order("created_at", { ascending: false }),
  ]);

  if (!user) {
    redirect("/");
  }

  const headerDesks = (desks ?? []).map((desk) => ({ ...desk }));

  return (
    <div className="op-app-shell relative flex h-dvh min-h-0 min-w-0 flex-col bg-background text-foreground">
      <PostHogUserContext email={user.email} id={user.id} />
      <ScrollContainerProvider>
        <SiteHeader
          avatarKey={getAvatarKey(user)}
          desks={headerDesks}
          username={getUsername(user)}
        />
        <ScrollRegion className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[var(--content-max)] flex-col px-[var(--gutter-mobile)] desk:px-[var(--gutter-web)]">
            {children}
          </div>
        </ScrollRegion>
      </ScrollContainerProvider>
    </div>
  );
}
