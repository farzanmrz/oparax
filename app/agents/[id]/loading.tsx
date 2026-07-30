import { LoaderCircleIcon } from "lucide-react";

/** Route-level loading UI must remain neutral: this route can resolve to an existing feed, an
 * empty ready feed, or a live extraction. Story/draft skeletons falsely promise rows while a new
 * agent is still being set up. */
export default function FeedLoading() {
  return (
    <div className="flex min-h-0 flex-1 py-4">
      <div
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-14 text-muted-foreground text-sm"
        role="status"
      >
        <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
        <span>Loading your agent…</span>
      </div>
    </div>
  );
}
