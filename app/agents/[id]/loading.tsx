/** Route-level loading UI must remain neutral: this route can resolve to an existing feed, an
 * empty ready feed, or a live extraction. Story/draft skeletons falsely promise rows while a new
 * agent is still being set up. */
export default function FeedLoading() {
  const skeletonRows = ["loading-1", "loading-2"];

  return (
    <div className="flex min-h-0 flex-1 py-4">
      <div className="mx-auto w-full max-w-3xl space-y-4 p-1" role="status">
        {skeletonRows.map((row) => (
          <article
            className="relative rounded-lg border border-border bg-card p-[clamp(15px,2.1cqw,22px)] pb-[clamp(15px,1.9cqw,20px)] pt-[clamp(31px,3.4cqw,38px)] shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            key={row}
          >
            <div className="absolute top-0 left-[clamp(13px,1.9cqw,20px)] h-[29px] w-[178px] animate-pulse rounded-b-[5px] bg-muted/50" />
            <div className="space-y-2">
              <div className="h-5 w-11/12 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-10/12 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="mt-[clamp(13px,1.5cqw,17px)] rounded-[7px] border border-border bg-secondary px-[clamp(14px,1.6cqw,18px)] pb-[clamp(8px,0.9cqw,10px)] pt-[clamp(13px,1.5cqw,17px)]">
              <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
              <div className="mt-[clamp(11px,1.3cqw,14px)] h-[1px] bg-border" />
              <div className="mt-[11px] flex items-center justify-between">
                <div className="h-8 w-24 animate-pulse rounded bg-muted/40" />
                <div className="h-8 w-24 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
