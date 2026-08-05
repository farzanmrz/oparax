// Reuses SourceTweet verbatim (the same component the Feed's NewsCard wraps to render a
// source post's identity/content) — an excluded post has no draft to pair with, so no
// PostCard/grid pairing is needed here, just the source card plus a one-line exclusion
// reason.
import type { ExcludedPost } from "@/lib/agent/excluded-query";
import { SourceTweet } from "./source-tweet";

export function ExcludedItemCard({ item }: { item: ExcludedPost }) {
  return (
    <div className="flex h-full flex-col gap-2">
      <SourceTweet sourcePost={item.sourcePost} />
      <p className="text-sm text-muted-foreground text-pretty">{item.onBeatReason}</p>
    </div>
  );
}

export function ExcludedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center">
      <h3 className="text-sm font-semibold">Nothing excluded yet</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
        Posts the model judges off this desk's beat will show up here, with the reason it gave.
      </p>
    </div>
  );
}
