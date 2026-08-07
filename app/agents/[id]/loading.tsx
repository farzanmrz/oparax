import { FeedCardSkeleton } from "./feed-item";

/** Route-level loading UI must remain neutral: this route can resolve to an existing feed, an
 * empty ready feed, or a live extraction. Story/draft skeletons falsely promise rows while a new
 * agent is still being set up. */
export default function FeedLoading() {
  const skeletonRows = ["loading-1", "loading-2"];

  return (
    <div className="flex min-h-0 flex-1 py-4">
      <div
        className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 p-1 desk:gap-6"
        role="status"
      >
        {skeletonRows.map((row) => (
          <FeedCardSkeleton key={row} />
        ))}
      </div>
    </div>
  );
}
