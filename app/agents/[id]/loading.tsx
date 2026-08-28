import { FeedCardSkeleton } from "./feed-item";

/** Route-level loading UI must remain neutral: this route can resolve to an existing feed or an
 * empty ready feed. Story skeletons falsely promise rows while a new agent has nothing yet. */
export default function FeedLoading() {
  const skeletonRows = ["loading-1", "loading-2"];

  return (
    <div
      className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-[var(--page-rhythm-mobile)] py-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)] desk:py-[var(--page-rhythm-web)]"
      role="status"
    >
      {skeletonRows.map((row) => (
        <FeedCardSkeleton key={row} />
      ))}
    </div>
  );
}
