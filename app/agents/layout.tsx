import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";

/**
 * App auth guard + shell for /agents/*. Chrome is one always-rendered site header
 * (components/site-header.tsx) — no offcanvas sidebar to hide behind, so this header is itself
 * the way-back-to-nav guarantee on every page below it. The owner-scoped desks list feeds the
 * header's switcher, tabs, and controls; the per-desk needs-review counts feed the Feed tab
 * badge. All fetched in parallel with the auth check since none depends on another's result.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: desks },
    { data: reviewRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("experiments")
      .select("id, name, beat, status")
      .order("created_at", { ascending: false }),
    // Winner drafts not yet posted, across the owner's desks — owner-scoped by post_drafts'
    // EXISTS-join RLS. Counted per desk in memory below (PostgREST has no GROUP BY here; volume
    // is small — one row per unreviewed winning draft).
    supabase
      .from("post_drafts")
      .select("experiment_id")
      .eq("is_winner", true)
      .is("posted_at", null),
  ]);

  if (!user) {
    redirect("/");
  }

  const counts = new Map<string, number>();
  for (const row of reviewRows ?? []) {
    counts.set(row.experiment_id, (counts.get(row.experiment_id) ?? 0) + 1);
  }
  const headerDesks = (desks ?? []).map((desk) => ({
    ...desk,
    needsReviewCount: counts.get(desk.id) ?? 0,
  }));

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col bg-background text-foreground">
      <SiteHeader desks={headerDesks} username={getUsername(user)} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-[102rem] flex-col px-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
