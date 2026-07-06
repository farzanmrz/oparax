import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Agents listing — the post-login landing page. Minimal functional placeholder:
 * the create-new-agent entry point plus an empty state. v0 owns the real design
 * (card grid, search/sort, per-desk cards); wiring to persisted agents comes in
 * a later slice, so for now there are no desks to list.
 */
export default function AgentsListingPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Your desks</h1>
          <p className="text-sm text-muted-foreground">
            Each desk watches a beat. Create one to get started.
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/new">New agent</Link>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          No desks yet. Spin up your first news desk and tell it what beat to watch.
        </p>
        <Button asChild>
          <Link href="/agents/new">Create your first desk</Link>
        </Button>
      </div>
    </div>
  );
}
