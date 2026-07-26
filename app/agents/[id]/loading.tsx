import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading UI for the Feed — mirrors `page.tsx`'s header + two-column grid so
 *  nothing shifts layout once the real stories resolve. Three placeholder pairs is enough to
 *  read as "loading a list" without implying a specific count. */
export default function FeedLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <div className="grid grid-cols-1 gap-x-7 gap-y-1 md:grid-cols-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reorder or mutate
          <FeedItemSkeletonPair key={i} />
        ))}
      </div>
    </div>
  );
}

function FeedItemSkeletonPair() {
  return (
    <>
      <FeedItemSkeleton />
      <FeedItemSkeleton />
    </>
  );
}

function FeedItemSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Skeleton className="size-6 shrink-0 rounded-md" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20 shrink-0" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
