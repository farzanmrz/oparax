import { notFound } from "next/navigation";
import { MobileNavSheet } from "@/components/mobile-nav-sheet";
import { deriveDeskLabel } from "@/lib/agent/desk-label";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DeskControls, DeskTabs } from "./desk-controls";

/**
 * The desk-scoped layout for `/agents/[id]/*` — every page under a desk (Feed, Voice,
 * Setup) renders inside this. T1's site header lives one segment up
 * (`app/agents/layout.tsx`) so it can render on desk-less pages too; the tabs and the
 * pause/delete controls are desk-scoped, so they belong here instead. Since a child
 * segment can't inject into a parent's topbar, this renders a SECOND sticky bar
 * directly beneath it — a deliberate two-row divergence from the mock's single-row
 * topbar (see `.feature/task-3-brief.md`), styled as a continuation of it (same `bg-card`
 * surface, the topbar's bottom-border, sticky right under the 56px header).
 */
export default async function DeskLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [deskResult, reviewCountResult] = await Promise.all([
    supabase.from("experiments").select("id, beat, status").eq("id", id).maybeSingle(),
    // Needs-review count only (head request, no rows) — post_drafts RLS is an
    // EXISTS-join through experiments by experiment_id, so this stays owner-safe.
    supabase
      .from("post_drafts")
      .select("id", { count: "exact", head: true })
      .eq("experiment_id", id)
      .eq("is_winner", true)
      .is("posted_at", null),
  ]);

  // RLS scopes ownership, so a foreign id and an absent id are indistinguishable — both
  // a 0-row miss, and both correctly 404.
  if (deskResult.error || !deskResult.data) notFound();

  const desk = deskResult.data;
  const deskLabel = deriveDeskLabel(desk.beat);
  const needsReviewCount = reviewCountResult.count ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-card px-4 sm:-mx-6 sm:px-6">
        <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <StatusPill status={desk.status} />
            <h2 className="truncate text-sm font-semibold text-foreground">{deskLabel}</h2>
            <DeskControls deskId={desk.id} status={desk.status} />
          </div>
          <div className="hidden md:flex">
            <DeskTabs deskId={desk.id} needsReviewCount={needsReviewCount} />
          </div>
          <div className="flex justify-end md:hidden">
            <MobileNavSheet
              deskId={desk.id}
              deskLabel={deskLabel}
              needsReviewCount={needsReviewCount}
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** The live/paused pill — a status dot (pulsing green when live) + label. */
function StatusPill({ status }: { readonly status: string }) {
  const isLive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        isLive
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          isLive ? "animate-pulse bg-success" : "bg-muted-foreground/50",
        )}
      />
      {isLive ? "Live" : "Paused"}
    </span>
  );
}
